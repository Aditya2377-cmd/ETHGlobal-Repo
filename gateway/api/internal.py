import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from gateway.database import get_db
from gateway.core.config import settings

router = APIRouter(prefix="/internal/v1", tags=["Internal"])

INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "perpay-internal-secret-2026")

def verify_internal_secret(x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret")):
    if not x_internal_secret or x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing X-Internal-Secret header")
    return True

class SettlementNotificationInput(BaseModel):
    invoice_id: str
    generation_id: str
    transaction_id: str
    payer_account_id: str
    receiver_account_id: str
    amount_tinybars: int
    network: str = "hedera:testnet"
    confirmed_at: str
    transaction_url: str

@router.get("/generations/{generation_id}/payment-context")
def get_payment_context(
    generation_id: str,
    authorized: bool = Depends(verify_internal_secret)
):
    """
    Authoritative invoice payment context query consumed by x402-service.
    Returns exact charge in tinybars, token counts, and invoice status.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Query invoice by generation_id or request_id
    cursor.execute("""
    SELECT i.id as invoice_id, i.request_id, i.user_id, i.amount_tinybars,
           i.amount_hbar_display, i.status as invoice_status, i.created_at, i.expires_at,
           r.id as gen_id, r.model, r.prompt_tokens, r.completion_tokens, r.total_tokens, r.status as req_status
    FROM invoices i
    JOIN ai_requests r ON i.request_id = r.id
    WHERE r.id = ? OR i.id = ?
    """, (generation_id, generation_id))
    
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Generation or invoice context for '{generation_id}' not found")

    status_str = "PAID" if row["invoice_status"].lower() == "paid" else "UNPAID"

    return {
        "invoice_id": row["invoice_id"],
        "generation_id": row["gen_id"],
        "request_id": row["request_id"],
        "user_id": row["user_id"],
        "prompt_tokens": row["prompt_tokens"],
        "completion_tokens": row["completion_tokens"],
        "total_tokens": row["total_tokens"],
        "charge_tinybars": row["amount_tinybars"],
        "charge_hbar": f"{row['amount_hbar_display']:.8f}" if isinstance(row['amount_hbar_display'], (int, float)) else str(row['amount_hbar_display']),
        "model": row["model"],
        "status": status_str,
        "created_at": row["created_at"],
        "expires_at": row["expires_at"]
    }

@router.get("/generations/{generation_id}/deliver")
def deliver_stored_response(
    generation_id: str,
    authorized: bool = Depends(verify_internal_secret)
):
    """
    Releases previously generated and privately stored Groq AI completion to x402-service.
    Ensures completion is delivered ONLY after verified settlement.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.id, r.generated_response_private, r.model, r.total_tokens, r.status as req_status,
           i.status as inv_status
    FROM ai_requests r
    JOIN invoices i ON i.request_id = r.id
    WHERE r.id = ? OR i.id = ?
    """, (generation_id, generation_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Verify response is unlocked
    is_paid = (row["inv_status"].lower() == "paid" or row["req_status"].lower() == "unlocked")
    if not is_paid:
        raise HTTPException(status_code=402, detail="Response cannot be released: payment not yet established")

    return {
        "generation_id": row["id"],
        "content": row["generated_response_private"],
        "model": row["model"],
        "total_tokens": row["total_tokens"]
    }

@router.post("/payments/settlement")
def record_settlement_notification(
    payload: SettlementNotificationInput,
    authorized: bool = Depends(verify_internal_secret)
):
    """
    Webhook called by x402-service when Hedera Testnet transaction is confirmed.
    Transitions invoice to PAID, unlocks the AI response, logs settlement,
    and removes the user's unpaid account restriction.
    """
    conn = get_db()
    cursor = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # 1. Update invoice to paid
    cursor.execute("""
    UPDATE invoices
    SET status = 'paid', paid_at = ?
    WHERE id = ? OR request_id = ?
    """, (now, payload.invoice_id, payload.generation_id))

    # 2. Update ai_requests to unlocked
    cursor.execute("""
    UPDATE ai_requests
    SET status = 'unlocked', completed_at = ?
    WHERE id = ? OR id = (SELECT request_id FROM invoices WHERE id = ?)
    """, (now, payload.generation_id, payload.invoice_id))

    # 3. Insert into payments table for audit trail
    payment_id = f"pay_{payload.transaction_id.replace('@', '_').replace('.', '_')}"
    cursor.execute("""
    INSERT OR REPLACE INTO payments (
        id, invoice_id, transaction_id, payer_account_id,
        recipient_account_id, network, amount_tinybars,
        verification_status, transaction_url, verified_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?, ?)
    """, (
        payment_id, payload.invoice_id, payload.transaction_id,
        payload.payer_account_id, payload.receiver_account_id,
        payload.network, payload.amount_tinybars,
        payload.transaction_url, payload.confirmed_at, now
    ))

    # 4. Also insert into Member 1's usage_events table if present
    try:
        cursor.execute("""
        UPDATE usage_events
        SET tx_hash = ?, status = 'paid'
        WHERE request_id = ?
        """, (payload.transaction_id, payload.generation_id))
    except Exception:
        pass

    conn.commit()
    conn.close()

    print(f"[Gateway] Verified Hedera settlement for generation {payload.generation_id}: {payload.transaction_id}")

    return {
        "success": True,
        "invoice_id": payload.invoice_id,
        "generation_id": payload.generation_id,
        "status": "UNLOCKED"
    }
