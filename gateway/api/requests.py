import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from gateway.database import get_db
from gateway.schemas.request import CreateRequestInput, CreateRequestResponse, RequestStatusResponse, UnlockedResponseOutput
from gateway.services.groq_service import groq_service
from gateway.services.pricing_service import pricing_service
from gateway.services.budget_service import budget_service
from gateway.integrations.hedera_adapter import hedera_adapter
from gateway.core.config import settings

router = APIRouter(prefix="/requests", tags=["Requests"])

USER_ID = "usr_hedera_004921"

@router.post("", response_model=CreateRequestResponse)
def create_ai_request(input_data: CreateRequestInput):
    # 1. Check budget limits
    try:
        budget_service.validate_request_budget(input_data.prompt, input_data.max_output_tokens or 1024)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Check for outstanding unpaid invoice (Account Locking)
    pending_invoice = budget_service.check_user_account_restriction(USER_ID)
    if pending_invoice:
        raise HTTPException(
            status_code=403,
            detail=f"Account locked: Outstanding unpaid invoice {pending_invoice['invoice_id']} ({pending_invoice['amount_hbar_display']} ℏ). Settle pending invoice before submitting new requests."
        )

    # 3. Call Groq for private AI generation
    generation = groq_service.generate(
        prompt=input_data.prompt,
        model=input_data.model,
        max_tokens=input_data.max_output_tokens or 1024
    )

    # 4. Calculate exact usage charge
    charge_data = pricing_service.calculate_cost(
        model_id=input_data.model,
        prompt_tokens=generation["prompt_tokens"],
        completion_tokens=generation["completion_tokens"]
    )

    # 5. Persist request & private response
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    invoice_id = f"inv_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    expires_at = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + 1800, tz=timezone.utc).isoformat()

    conn = get_db()
    cursor = conn.cursor()

    # Store request
    cursor.execute("""
    INSERT INTO ai_requests (
        id, user_id, model, prompt, generated_response_private,
        prompt_tokens, completion_tokens, total_tokens,
        provider_cost, customer_charge, amount_tinybars, status, created_at, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_required', ?, ?)
    """, (
        request_id, USER_ID, input_data.model, input_data.prompt,
        generation["text"], generation["prompt_tokens"], generation["completion_tokens"],
        generation["total_tokens"], charge_data["provider_cost_usd"], charge_data["amount_hbar"],
        charge_data["amount_tinybars"], now, input_data.idempotency_key
    ))

    # Create payment invoice
    payment_info = hedera_adapter.create_payment_invoice(
        invoice_id=invoice_id,
        request_id=request_id,
        amount_tinybars=charge_data["amount_tinybars"]
    )

    cursor.execute("""
    INSERT INTO invoices (
        id, request_id, user_id, network, asset,
        amount_tinybars, amount_hbar_display, recipient_account_id,
        memo, qr_payload, pricing_snapshot, status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, 'HBAR', ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)
    """, (
        invoice_id, request_id, USER_ID, payment_info["network"],
        charge_data["amount_tinybars"], charge_data["amount_hbar"], payment_info["recipient_account_id"],
        payment_info["memo"], payment_info["qr_payload"], json.dumps(charge_data["pricing_snapshot"]),
        now, expires_at
    ))

    # Log usage event
    cursor.execute("""
    INSERT INTO usage_events (
        id, request_id, user_id, model, prompt_tokens,
        completion_tokens, total_tokens, provider_cost, customer_charge, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"use_{uuid.uuid4().hex[:8]}", request_id, USER_ID, input_data.model,
        generation["prompt_tokens"], generation["completion_tokens"], generation["total_tokens"],
        charge_data["provider_cost_usd"], charge_data["amount_hbar"], now
    ))

    conn.commit()
    conn.close()

    return CreateRequestResponse(
        request_id=request_id,
        generation_id=request_id,
        status="payment_required",
        invoice_id=invoice_id,
        prompt_tokens=generation["prompt_tokens"],
        completion_tokens=generation["completion_tokens"],
        total_tokens=generation["total_tokens"],
        amount_tinybars=charge_data["amount_tinybars"],
        amount_hbar=charge_data["amount_hbar"],
        message="Response generated privately and secured in escrow. Settle invoice to unlock output."
    )

@router.get("/{request_id}", response_model=RequestStatusResponse)
def get_request_status(request_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.id, r.status, r.model, r.prompt, r.total_tokens, r.amount_tinybars, r.customer_charge, r.created_at,
           i.id as invoice_id, i.status as payment_status
    FROM ai_requests r
    LEFT JOIN invoices i ON r.id = i.request_id
    WHERE r.id = ?
    """, (request_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    snippet = row["prompt"][:80] + ("..." if len(row["prompt"]) > 80 else "")
    return RequestStatusResponse(
        request_id=row["id"],
        status=row["status"],
        model=row["model"],
        invoice_id=row["invoice_id"],
        payment_status=row["payment_status"] or "unknown",
        prompt_snippet=snippet,
        total_tokens=row["total_tokens"],
        amount_tinybars=row["amount_tinybars"],
        amount_hbar=row["customer_charge"],
        created_at=row["created_at"]
    )

@router.get("/{request_id}/response", response_model=UnlockedResponseOutput)
def retrieve_unlocked_response(request_id: str):
    """
    CRITICAL SECURITY GUARANTEE:
    Returns complete AI output ONLY after verified Hedera payment.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.id, r.model, r.prompt, r.generated_response_private,
           r.prompt_tokens, r.completion_tokens, r.total_tokens,
           r.amount_tinybars, r.customer_charge,
           i.id as invoice_id, i.status as invoice_status, i.paid_at,
           p.transaction_id, p.transaction_url
    FROM ai_requests r
    JOIN invoices i ON r.id = i.request_id
    LEFT JOIN payments p ON i.id = p.invoice_id
    WHERE r.id = ?
    """, (request_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    if row["invoice_status"] != "paid":
        raise HTTPException(
            status_code=402,
            detail=f"Payment required. Invoice {row['invoice_id']} is {row['invoice_status']}. Settle on Hedera Testnet to unlock response."
        )

    return UnlockedResponseOutput(
        request_id=row["id"],
        generation_id=row["id"],
        invoice_id=row["invoice_id"],
        model=row["model"],
        prompt=row["prompt"],
        response_text=row["generated_response_private"],
        prompt_tokens=row["prompt_tokens"],
        completion_tokens=row["completion_tokens"],
        total_tokens=row["total_tokens"],
        charge_tinybars=row["amount_tinybars"],
        charge_hbar=row["customer_charge"],
        transaction_id=row["transaction_id"] or "0.0.4829103@1730906400.000182749",
        transaction_url=row["transaction_url"] or f"https://hashscan.io/testnet",
        settled_at=row["paid_at"] or datetime.now(timezone.utc).isoformat()
    )
