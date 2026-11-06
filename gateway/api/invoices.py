import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from gateway.database import get_db
from gateway.schemas.invoice import (
    InvoiceDetails,
    PrepareWalletPaymentResponse,
    SubmitPaymentProofInput,
    PaymentVerificationResult,
)
from gateway.integrations.hedera_adapter import hedera_adapter
from gateway.core.config import settings

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.get("/{invoice_id}", response_model=InvoiceDetails)
def get_invoice_details(invoice_id: str):
    """
    Retrieves full invoice details including exact token breakdown,
    charge in tinybars / HBAR, memo, recipient address, and QR payload.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT i.id, i.request_id, i.user_id, i.network, i.amount_tinybars, i.amount_hbar_display,
           i.recipient_account_id, i.memo, i.qr_payload, i.pricing_snapshot, i.status,
           i.created_at, i.expires_at,
           r.model, r.prompt, r.prompt_tokens, r.completion_tokens, r.total_tokens
    FROM invoices i
    JOIN ai_requests r ON i.request_id = r.id
    WHERE i.id = ?
    """, (invoice_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    snapshot = None
    if row["pricing_snapshot"]:
        try:
            snapshot = json.loads(row["pricing_snapshot"])
        except Exception:
            snapshot = None

    prompt_snippet = row["prompt"][:80] + ("..." if len(row["prompt"]) > 80 else "")

    return InvoiceDetails(
        invoice_id=row["id"],
        request_id=row["request_id"],
        user_id=row["user_id"],
        model=row["model"],
        prompt_snippet=prompt_snippet,
        prompt_tokens=row["prompt_tokens"],
        completion_tokens=row["completion_tokens"],
        total_tokens=row["total_tokens"],
        amount_tinybars=row["amount_tinybars"],
        amount_hbar=row["amount_hbar_display"],
        network=row["network"],
        recipient_account_id=row["recipient_account_id"],
        memo=row["memo"],
        qr_payload=row["qr_payload"] or "",
        status=row["status"],
        created_at=row["created_at"],
        expires_at=row["expires_at"],
        pricing_snapshot=snapshot
    )

@router.get("/{invoice_id}/status")
def get_invoice_status(invoice_id: str):
    """
    Polls current payment verification state of an invoice.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT i.id, i.status, i.amount_tinybars, i.amount_hbar_display, i.paid_at,
           p.transaction_id, p.transaction_url, p.payer_account_id, p.verified_at
    FROM invoices i
    LEFT JOIN payments p ON i.id = p.invoice_id
    WHERE i.id = ?
    """, (invoice_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "invoice_id": row["id"],
        "status": row["status"],
        "amount_tinybars": row["amount_tinybars"],
        "amount_hbar": row["amount_hbar_display"],
        "is_paid": row["status"] == "paid",
        "paid_at": row["paid_at"],
        "payment": {
            "transaction_id": row["transaction_id"],
            "transaction_url": row["transaction_url"],
            "payer_account_id": row["payer_account_id"],
            "verified_at": row["verified_at"]
        } if row["transaction_id"] else None
    }

@router.post("/{invoice_id}/pay/wallet/prepare", response_model=PrepareWalletPaymentResponse)
def prepare_wallet_payment(invoice_id: str, payer_account_id: str = "0.0.4829103"):
    """
    Returns signed transaction preparation payload for HashPack or Blade wallets.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, amount_tinybars, amount_hbar_display, status FROM invoices WHERE id = ?", (invoice_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if row["status"] == "paid":
        raise HTTPException(status_code=400, detail="Invoice has already been settled on Hedera")

    prep_data = hedera_adapter.prepare_wallet_payment(
        invoice_id=invoice_id,
        amount_tinybars=row["amount_tinybars"],
        payer_account_id=payer_account_id
    )

    return PrepareWalletPaymentResponse(
        invoice_id=invoice_id,
        amount_tinybars=row["amount_tinybars"],
        amount_hbar=row["amount_hbar_display"],
        recipient_account_id=settings.TREASURY_ACCOUNT_ID,
        network=settings.HEDERA_NETWORK,
        memo=invoice_id,
        transaction_preparation_data=prep_data
    )

@router.post("/{invoice_id}/pay/wallet/submit", response_model=PaymentVerificationResult)
def submit_wallet_payment(invoice_id: str, proof: SubmitPaymentProofInput):
    """
    Validates on-chain transaction execution and reconciles payment.
    Unlocks associated AI response once verified.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, request_id, user_id, amount_tinybars, amount_hbar_display, status
    FROM invoices WHERE id = ?
    """, (invoice_id,))
    invoice = cursor.fetchone()

    if not invoice:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice["status"] == "paid":
        cursor.execute("SELECT * FROM payments WHERE invoice_id = ?", (invoice_id,))
        existing_payment = cursor.fetchone()
        conn.close()
        return PaymentVerificationResult(
            invoice_id=invoice["id"],
            request_id=invoice["request_id"],
            verified=True,
            status="paid",
            network=settings.HEDERA_NETWORK,
            transaction_id=existing_payment["transaction_id"],
            transaction_url=existing_payment["transaction_url"],
            payer_account_id=existing_payment["payer_account_id"],
            recipient_account_id=existing_payment["recipient_account_id"],
            amount_tinybars=invoice["amount_tinybars"],
            amount_hbar=invoice["amount_hbar_display"],
            verified_at=existing_payment["verified_at"]
        )

    # Verify transaction via Hedera adapter
    try:
        verification = hedera_adapter.verify_payment_transaction(
            invoice_id=invoice_id,
            amount_tinybars=invoice["amount_tinybars"],
            payer_account_id=proof.payer_account_id,
            transaction_id=proof.transaction_id
        )
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    now = datetime.now(timezone.utc).isoformat()

    # Update invoice status
    cursor.execute("""
    UPDATE invoices
    SET status = 'paid', paid_at = ?
    WHERE id = ?
    """, (now, invoice_id))

    # Update AI request status to completed
    cursor.execute("""
    UPDATE ai_requests
    SET status = 'completed', completed_at = ?
    WHERE id = ?
    """, (now, invoice["request_id"]))

    # Insert payment record
    payment_id = f"pay_{invoice_id.replace('inv_', '')}"
    cursor.execute("""
    INSERT INTO payments (
        id, invoice_id, transaction_id, payer_account_id, recipient_account_id,
        network, amount_tinybars, verification_status, transaction_url, verified_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED_ON_CHAIN', ?, ?, ?)
    """, (
        payment_id, invoice_id, verification["transaction_id"],
        verification["payer_account_id"], verification["recipient_account_id"],
        verification["network"], verification["amount_tinybars"],
        verification["transaction_url"], verification["verified_at"], now
    ))

    # Audit event
    cursor.execute("""
    INSERT INTO audit_events (
        id, user_id, request_id, invoice_id, event_type, event_metadata, created_at
    ) VALUES (?, ?, ?, ?, 'INVOICE_SETTLED_ON_CHAIN', ?, ?)
    """, (
        f"aud_{invoice_id.replace('inv_', '')}", invoice["user_id"], invoice["request_id"], invoice_id,
        json.dumps({
            "transaction_id": verification["transaction_id"],
            "amount_tinybars": verification["amount_tinybars"],
            "payer": verification["payer_account_id"]
        }), now
    ))

    conn.commit()
    conn.close()

    return PaymentVerificationResult(
        invoice_id=invoice["id"],
        request_id=invoice["request_id"],
        verified=True,
        status="paid",
        network=verification["network"],
        transaction_id=verification["transaction_id"],
        transaction_url=verification["transaction_url"],
        payer_account_id=verification["payer_account_id"],
        recipient_account_id=verification["recipient_account_id"],
        amount_tinybars=verification["amount_tinybars"],
        amount_hbar=verification["amount_hbar"],
        verified_at=verification["verified_at"]
    )

@router.post("/{invoice_id}/pay/qr/verify", response_model=PaymentVerificationResult)
def verify_qr_payment(invoice_id: str, proof: SubmitPaymentProofInput):
    """
    Verifies on-chain payment sent via direct QR transfer using the exact Invoice ID in the transaction memo.
    """
    return submit_wallet_payment(invoice_id=invoice_id, proof=proof)
