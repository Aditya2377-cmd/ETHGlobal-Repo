import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from groq import Groq
from dotenv import load_dotenv
import hashlib
import hmac

load_dotenv()

app = FastAPI(title="x402-openai-gateway")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SQLITE_DB = os.getenv("SQLITE_DB", "ledger.db")
SPEND_CAP_MULTIPLIER = 1.5  # Allow 50% overage to avoid edge-case rejections

groq_client = Groq(api_key= GROQ_API_KEY )

# ============================================================================
# DATABASE SETUP
# ============================================================================

def init_db():
    """Initialize SQLite ledger."""
    conn = sqlite3.connect(SQLITE_DB)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS usage_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            wallet TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            cost_wei INTEGER,
            chain TEXT,
            tx_hash TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS escrow_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet TEXT NOT NULL,
            balance_wei INTEGER DEFAULT 0,
            spend_cap_wei INTEGER,
            expiry TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ChatCompletionRequest(BaseModel):
    model: str
    messages: list
    stream: bool = True
    temperature: float = 0.7
    max_tokens: Optional[int] = None

class UsageEvent(BaseModel):
    ts: str
    wallet: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost_wei: int
    chain: str
    tx_hash: Optional[str] = None
    status: str

# ============================================================================
# KEY VALIDATION (Task 5)
# ============================================================================

def validate_capped_key(api_key: str) -> dict:
    """
    Parse and validate a capped Web3 key.
    Format: sk-web3-<wallet>-<spend_cap_wei>-<expiry_timestamp>-<signature>
    Returns: {"wallet": "0x...", "spend_cap_wei": 1000000, "expiry": "2024-01-15T12:00:00Z"}
    """
    if not api_key.startswith("sk-web3-"):
        raise HTTPException(status_code=401, detail="Invalid key format")
    
    parts = api_key.split("-")
    if len(parts) < 6:
        raise HTTPException(status_code=401, detail="Malformed key")
    
    wallet = parts[2]
    try:
        spend_cap_wei = int(parts[3])
        expiry_str = parts[4]
        # Simple validation: expiry should be ISO format
        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
        if expiry < datetime.now(expiry.tzinfo):
            raise HTTPException(status_code=401, detail="Key expired")
    except (ValueError, IndexError):
        raise HTTPException(status_code=401, detail="Invalid key parameters")
    
    return {
        "wallet": wallet,
        "spend_cap_wei": spend_cap_wei,
        "expiry": expiry_str
    }

# ============================================================================
# BUDGET CHECK (Task 6)
# ============================================================================

def check_budget(wallet: str, estimated_cost_wei: int) -> dict:
    """
    Check if wallet has enough balance. If not, return 402 with payment instructions.
    Returns: {"ok": True} or {"ok": False, "402_payload": {...}}
    """
    conn = sqlite3.connect(SQLITE_DB)
    c = conn.cursor()
    c.execute("SELECT balance_wei, spend_cap_wei FROM escrow_ledger WHERE wallet = ?", (wallet,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        # No escrow found; return 402 with payment instructions
        return {
            "ok": False,
            "status_code": 402,
            "payment_required": {
                "message": "Payment required to use this API",
                "chain": "hedera-testnet",
                "seller_account": "0.0.11326767", 
                "amount_hbar": 0.01,
                "estimated_cost_wei": estimated_cost_wei,
                "deposit_link": "https://portal.hedera.com/faucet"
            }
        }
    
    balance_wei, spend_cap_wei = row
    if balance_wei < estimated_cost_wei:
        return {
            "ok": False,
            "status_code": 402,
            "payment_required": {
                "message": f"Insufficient balance. Current: {balance_wei} Wei, Required: {estimated_cost_wei} Wei",
                "chain": "hedera-testnet",
                "seller_account": "0.0.11326767",
                "amount_hbar": 0.01,
                "current_balance_wei": balance_wei,
                "estimated_cost_wei": estimated_cost_wei
            }
        }
    
    return {"ok": True}

# ============================================================================
# STREAMING + TOKEN COUNTING (Task 2 & 3)
# ============================================================================

async def stream_groq_and_count(
    request: ChatCompletionRequest,
    wallet: str
) -> AsyncGenerator[str, None]:
    """
    Stream Groq response while counting exact tokens.
    Yields OpenAI-compatible SSE chunks.
    """
    model = "llama-3.3-70b-versatile"  # Override to Groq's model
    
    try:
        # Call Groq with stream_options for exact usage
        stream = groq_client.chat.completions.create(
            model=model,
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True,
            stream_options={"include_usage": True}  # Critical: get exact token counts
        )
        
        completion_tokens = 0
        prompt_tokens = 0
        total_tokens = 0
        
        for chunk in stream:
            # Check if this chunk has usage data (end of stream)
            if chunk.usage:
                prompt_tokens = chunk.usage.prompt_tokens
                completion_tokens = chunk.usage.completion_tokens
                total_tokens = chunk.usage.total_tokens
            
            # Stream the delta
            if chunk.choices and chunk.choices[0].delta:
                delta = chunk.choices[0].delta
                if delta.content:
                    chunk_data = {
                        "id": "chatcmpl-local",
                        "object": "text_completion.chunk",
                        "created": int(datetime.now().timestamp()),
                        "model": model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {"content": delta.content},
                                "finish_reason": None
                            }
                        ]
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
            
            # On finish, yield usage
            if chunk.choices and chunk.choices[0].finish_reason == "stop":
                finish_data = {
                    "id": "chatcmpl-local",
                    "object": "text_completion.chunk",
                    "created": int(datetime.now().timestamp()),
                    "model": model,
                    "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
                    "usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens
                    }
                }
                yield f"data: {json.dumps(finish_data)}\n\n"
        
        yield "data: [DONE]\n\n"
        
        # Return token counts for logging
        # Log token counts directly to SQLite
        log_usage_event(
            wallet=wallet,
            model="llama-3.3-70b-versatile",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_wei=total_tokens * 10,
            status="ok"
        )
        return
    
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        raise

# ============================================================================
# USAGE EVENT LOGGER (Task 4)
# ============================================================================

def log_usage_event(
    wallet: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    cost_wei: int,
    chain: str = "hedera-testnet",
    tx_hash: Optional[str] = None,
    status: str = "ok"
):
    """Log usage to SQLite and deduct from escrow balance."""
    conn = sqlite3.connect(SQLITE_DB)
    c = conn.cursor()
    
    # Insert event
    c.execute("""
        INSERT INTO usage_events 
        (ts, wallet, model, prompt_tokens, completion_tokens, total_tokens, cost_wei, chain, tx_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.now().isoformat(),
        wallet,
        model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost_wei,
        chain,
        tx_hash,
        status
    ))
    
    # Deduct from balance
    c.execute(
        "UPDATE escrow_ledger SET balance_wei = balance_wei - ? WHERE wallet = ?",
        (cost_wei, wallet)
    )
    
    conn.commit()
    conn.close()

# ============================================================================
# MAIN ENDPOINT (Task 2)
# ============================================================================

@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    authorization: str = Header(None),
    background_tasks: BackgroundTasks = None
):
    """
    OpenAI-compatible chat endpoint with x402 payment flow.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    api_key = authorization.replace("Bearer ", "")
    
    # Validate key (Task 5)
    try:
        key_data = validate_capped_key(api_key)
        wallet = key_data["wallet"]
    except HTTPException as e:
        raise e
    
    # Estimate cost (rough: 0.0001 Wei per token)
    estimated_cost_wei = len(str(request.messages)) * 100  # Placeholder
    
    # Check budget (Task 6)
    budget_check = check_budget(wallet, estimated_cost_wei)
    if not budget_check["ok"]:
        return {
            "error": {
                "message": budget_check["payment_required"]["message"],
                "type": "insufficient_balance",
                "param": None,
                "code": "insufficient_balance"
            },
            "payment_required": budget_check["payment_required"]
        }, budget_check["status_code"]
    
    # Stream response
    async def generate():
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0

        # Stream chunks from Groq
        async for chunk in stream_groq_and_count(request, wallet):
            # 1. Forward content chunks directly to the client via SSE
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                payload = {
                    "choices": [{
                        "delta": {"content": content},
                        "index": 0,
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(payload)}\n\n"

            # 2. Extract exact usage block from Groq when provided
            if hasattr(chunk, "usage") and chunk.usage:
                if chunk.usage.prompt_tokens:
                    prompt_tokens = chunk.usage.prompt_tokens
                if chunk.usage.completion_tokens:
                    completion_tokens = chunk.usage.completion_tokens
                if chunk.usage.total_tokens:
                    total_tokens = chunk.usage.total_tokens

        # Fallback estimation if Groq omitted the final usage chunk
        if total_tokens == 0:
            total_tokens = max(1, prompt_tokens + completion_tokens)

        # 3. Calculate micro-cost (10 Tinybar / Wei equivalent per token)
        cost_wei = total_tokens * 10

        # 4. Record to SQLite ledger for Pawan's live dashboard
        log_usage_event(
            wallet=wallet,
            model="llama-3.3-70b-versatile",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_wei=cost_wei,
            status="ok"
        )

        # 5. Standard OpenAI stream terminator
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
       

# ============================================================================
# EVENTS ENDPOINT (For Pawan's Dashboard)
# ============================================================================

@app.get("/events")
def get_events(limit: int = 100):
    """Return recent usage events as JSON for the dashboard."""
    conn = sqlite3.connect(SQLITE_DB)
    c = conn.cursor()
    c.execute("""
        SELECT ts, wallet, model, prompt_tokens, completion_tokens, total_tokens, cost_wei, chain, tx_hash, status
        FROM usage_events
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    
    rows = c.fetchall()
    conn.close()
    
    events = []
    for row in rows:
        events.append({
            "ts": row[0],
            "wallet": row[1],
            "model": row[2],
            "prompt_tokens": row[3],
            "completion_tokens": row[4],
            "total_tokens": row[5],
            "cost_wei": row[6],
            "chain": row[7],
            "tx_hash": row[8],
            "status": row[9]
        })
    
    return {"events": events}

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health():
    return {"status": "ok"}

# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
    