from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from gateway.database import get_db

router = APIRouter(prefix="/history", tags=["History"])

@router.get("")
def get_usage_and_payment_history(
    status: Optional[str] = Query(None, description="Filter by status ('completed', 'payment_required')"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Returns unified transaction and generation history for the connected user,
    including token usage, tinybars, and on-chain HashScan transaction proofs.
    """
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT r.id as request_id, r.model, r.prompt, r.status as request_status,
           r.prompt_tokens, r.completion_tokens, r.total_tokens,
           r.amount_tinybars, r.customer_charge as amount_hbar, r.created_at,
           i.id as invoice_id, i.status as invoice_status, i.paid_at,
           p.transaction_id, p.transaction_url
    FROM ai_requests r
    LEFT JOIN invoices i ON r.id = i.request_id
    LEFT JOIN payments p ON i.id = p.invoice_id
    """
    params = []
    if status:
        query += " WHERE r.status = ?"
        params.append(status)

    query += " ORDER BY r.created_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        snippet = row["prompt"][:80] + ("..." if len(row["prompt"]) > 80 else "")
        results.append({
            "request_id": row["request_id"],
            "invoice_id": row["invoice_id"],
            "model": row["model"],
            "prompt_snippet": snippet,
            "status": row["request_status"],
            "invoice_status": row["invoice_status"],
            "prompt_tokens": row["prompt_tokens"],
            "completion_tokens": row["completion_tokens"],
            "total_tokens": row["total_tokens"],
            "amount_tinybars": row["amount_tinybars"],
            "amount_hbar": row["amount_hbar"],
            "created_at": row["created_at"],
            "paid_at": row["paid_at"],
            "transaction_id": row["transaction_id"],
            "transaction_url": row["transaction_url"] or (f"https://hashscan.io/testnet/transaction/{row['transaction_id']}" if row["transaction_id"] else None)
        })

    return {
        "count": len(results),
        "history": results
    }

