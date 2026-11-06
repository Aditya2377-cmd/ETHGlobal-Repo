import os
import sys
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator, Optional, List, Dict, Any

# Ensure gateway and parent directory are on sys.path for direct execution
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Header, BackgroundTasks, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

try:
    from groq import Groq
except ImportError:
    Groq = None

# Import database and service layer
from gateway.database import init_db, get_db, DB_PATH
from gateway.core.config import settings
from gateway.services.pricing_service import MODEL_RATES, TINYBARS_PER_HBAR, HBAR_USD_RATE
from gateway.api.requests import router as requests_router, create_ai_request, retrieve_unlocked_response
from gateway.api.invoices import router as invoices_router, get_invoice_details
from gateway.api.history import router as history_router, get_usage_and_payment_history
from gateway.api.accounts import router as accounts_router, get_account_status
from gateway.api.internal import router as internal_router
from gateway.schemas.request import CreateRequestInput

app = FastAPI(
    title="PerPay Gateway API",
    description="Usage-based AI payment gateway settled on-chain via Hedera Testnet and x402 v2 protocol.",
    version="2.0.0"
)

# Comprehensive CORS configuration supporting frontend and x402 headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["PAYMENT-REQUIRED", "PAYMENT-RESPONSE", "X-Payment-TxId", "Content-Type", "Authorization"]
)

# Initialize database
init_db()

# Mount API Routers
app.include_router(requests_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(accounts_router, prefix="/api/v1")
app.include_router(internal_router)

# ============================================================================
# CONVENIENCE ALIASES MATCHING FRONTEND CLIENT ROUTES
# ============================================================================

@app.post("/api/v1/generations")
@app.post("/api/generate")
def generate_endpoint(input_data: CreateRequestInput):
    """
    Submits prompt for private AI generation, captures exact token accounting,
    calculates usage-based charge, and returns unpaid invoice.
    """
    return create_ai_request(input_data)

@app.get("/api/user/account")
def account_alias():
    return get_account_status()

@app.get("/api/response/{request_id}")
def response_alias(request_id: str):
    return retrieve_unlocked_response(request_id)

@app.get("/api/transactions")
def transactions_alias():
    res = get_usage_and_payment_history()
    return res["history"]

@app.get("/api/invoices/{invoice_id}")
def invoice_alias(invoice_id: str):
    return get_invoice_details(invoice_id)

@app.get("/api/v1/pricing")
def get_pricing_schedule():
    """Returns public pricing schedule per 1M tokens across supported models."""
    models = []
    for model_id, rates in MODEL_RATES.items():
        models.append({
            "model_id": model_id,
            "name": rates["name"],
            "input_per_1m_usd": rates["input_per_1m_usd"],
            "output_per_1m_usd": rates["output_per_1m_usd"],
            "markup_multiplier": rates["markup_multiplier"],
            "customer_input_per_1m_hbar": (rates["input_per_1m_usd"] * rates["markup_multiplier"]) / HBAR_USD_RATE,
            "customer_output_per_1m_hbar": (rates["output_per_1m_usd"] * rates["markup_multiplier"]) / HBAR_USD_RATE,
        })
    return {
        "asset": "HBAR",
        "tinybars_per_hbar": TINYBARS_PER_HBAR,
        "hbar_usd_reference": HBAR_USD_RATE,
        "network": settings.HEDERA_NETWORK,
        "models": models
    }

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "perpay-gateway",
        "network": settings.HEDERA_NETWORK,
        "treasury_account": settings.TREASURY_ACCOUNT_ID,
        "ai_provider": "Groq",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "database": DB_PATH
    }

# ============================================================================
# MEMBER 1 COMPATIBILITY LAYER: STREAMING CHAT & WEB3 KEYS
# ============================================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[Gateway] Groq client initialization notice: {e}")

class ChatCompletionRequest(BaseModel):
    model: str = "llama-3.3-70b-versatile"
    messages: list
    stream: bool = True
    temperature: float = 0.7
    max_tokens: Optional[int] = None

def validate_capped_key(api_key: str) -> dict:
    if not api_key.startswith("sk-web3-"):
        raise HTTPException(status_code=401, detail="Invalid key format")
    parts = api_key.split("-")
    if len(parts) < 6:
        raise HTTPException(status_code=401, detail="Malformed key")
    wallet = parts[2]
    try:
        spend_cap_wei = int(parts[3])
        expiry_str = parts[4]
        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
        if expiry < datetime.now(expiry.tzinfo):
            raise HTTPException(status_code=401, detail="Key expired")
    except (ValueError, IndexError):
        raise HTTPException(status_code=401, detail="Invalid key parameters")
    return {"wallet": wallet, "spend_cap_wei": spend_cap_wei, "expiry": expiry_str}

def check_budget(wallet: str, estimated_cost_wei: int) -> dict:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT balance_wei, spend_cap_wei FROM escrow_ledger WHERE wallet = ?", (wallet,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {
            "ok": False,
            "status_code": 402,
            "payment_required": {
                "message": "Payment required to use this API",
                "chain": "hedera-testnet",
                "seller_account": settings.TREASURY_ACCOUNT_ID,
                "amount_hbar": 0.01,
                "estimated_cost_wei": estimated_cost_wei,
                "deposit_link": "https://portal.hedera.com/faucet"
            }
        }
    balance_wei, spend_cap_wei = row[0], row[1]
    if balance_wei < estimated_cost_wei:
        return {
            "ok": False,
            "status_code": 402,
            "payment_required": {
                "message": f"Insufficient balance. Current: {balance_wei} Wei, Required: {estimated_cost_wei} Wei",
                "chain": "hedera-testnet",
                "seller_account": settings.TREASURY_ACCOUNT_ID,
                "amount_hbar": 0.01,
                "current_balance_wei": balance_wei,
                "estimated_cost_wei": estimated_cost_wei
            }
        }
    return {"ok": True}

async def stream_groq_and_count(request: ChatCompletionRequest, wallet: str) -> AsyncGenerator[str, None]:
    model = "llama-3.3-70b-versatile"
    try:
        if not groq_client:
            mock_chunk = {
                "id": "chatcmpl-mock",
                "object": "text_completion.chunk",
                "created": int(datetime.now().timestamp()),
                "model": model,
                "choices": [{"index": 0, "delta": {"content": "PerPay streaming AI generation powered by Groq and settled on Hedera."}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 15, "completion_tokens": 30, "total_tokens": 45}
            }
            yield f"data: {json.dumps(mock_chunk)}\n\n"
            yield "data: [DONE]\n\n"
            return

        stream = groq_client.chat.completions.create(
            model=model,
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True,
            stream_options={"include_usage": True}
        )
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        for chunk in stream:
            if chunk.usage:
                prompt_tokens = chunk.usage.prompt_tokens
                completion_tokens = chunk.usage.completion_tokens
                total_tokens = chunk.usage.total_tokens
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                chunk_data = {
                    "id": "chatcmpl-local",
                    "object": "text_completion.chunk",
                    "created": int(datetime.now().timestamp()),
                    "model": model,
                    "choices": [{"index": 0, "delta": {"content": chunk.choices[0].delta.content}, "finish_reason": None}]
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    authorization: Optional[str] = Header(None),
    x_payment_txid: Optional[str] = Header(None, alias="X-Payment-TxId")
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    api_key = authorization.replace("Bearer ", "")
    key_data = validate_capped_key(api_key)
    wallet = key_data["wallet"]

    estimated_cost = len(str(request.messages)) * 10
    budget_check = check_budget(wallet, estimated_cost)
    if not budget_check["ok"]:
        return JSONResponse(status_code=402, content=budget_check["payment_required"])

    return StreamingResponse(stream_groq_and_count(request, wallet), media_type="text/event-stream")

@app.get("/events")
def get_events(limit: int = 100):
    """Member 1's events endpoint for recent token usage events."""
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT created_at, user_id, model, prompt_tokens, completion_tokens, total_tokens, amount_tinybars, status
        FROM ai_requests
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    events = []
    for r in rows:
        events.append({
            "ts": r["created_at"],
            "wallet": r["user_id"],
            "model": r["model"],
            "prompt_tokens": r["prompt_tokens"],
            "completion_tokens": r["completion_tokens"],
            "total_tokens": r["total_tokens"],
            "cost_tinybars": r["amount_tinybars"],
            "chain": "hedera-testnet",
            "status": r["status"]
        })
    return {"events": events}

@app.get("/")
def root():
    return {
        "project": "PerPay",
        "tagline": "Usage-based AI payments. Settled on-chain.",
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
