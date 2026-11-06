from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..services.budget_service import budget_service

router = APIRouter(prefix="/account", tags=["Account"])

USER_ID = "usr_hedera_004921"

class UpdateWalletInput(BaseModel):
    wallet_account_id: str

@router.get("/status")
def get_account_status():
    """
    Returns account health, wallet balance, and checks whether account
    is locked due to an outstanding unpaid invoice.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (USER_ID,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pending_invoice = budget_service.check_user_account_restriction(USER_ID)
    is_locked = pending_invoice is not None

    return {
        "user_id": user["id"],
        "account_status": "LOCKED" if is_locked else user["account_status"],
        "can_submit_request": not is_locked,
        "connected_wallet": user["connected_wallet"],
        "balance_tinybars": user["balance_tinybars"],
        "balance_hbar": user["balance_tinybars"] / 100_000_000.0,
        "unpaid_invoice": pending_invoice,
        "lock_reason": (
            f"Account locked: Outstanding unpaid invoice {pending_invoice['invoice_id']} ({pending_invoice['amount_hbar_display']} ℏ). Settle pending invoice to unlock."
            if is_locked else None
        )
    }

@router.post("/wallet")
def update_connected_wallet(data: UpdateWalletInput):
    """
    Updates user connected Hedera testnet wallet address (0.0.x format).
    """
    if not data.wallet_account_id.startswith("0.0."):
        raise HTTPException(status_code=400, detail="Invalid Hedera account format (expected 0.0.x)")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET connected_wallet = ? WHERE id = ?", (data.wallet_account_id, USER_ID))
    conn.commit()
    conn.close()

    return {
        "user_id": USER_ID,
        "connected_wallet": data.wallet_account_id,
        "message": f"Connected wallet updated to {data.wallet_account_id}"
    }

