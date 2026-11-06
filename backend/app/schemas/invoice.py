from pydantic import BaseModel
from typing import Optional, Dict, Any

class InvoiceDetails(BaseModel):
    invoice_id: str
    request_id: str
    user_id: str
    model: str
    prompt_snippet: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    amount_tinybars: int
    amount_hbar: float
    network: str
    recipient_account_id: str
    memo: str
    qr_payload: str
    status: str
    created_at: str
    expires_at: str
    pricing_snapshot: Optional[Dict[str, Any]] = None

class PrepareWalletPaymentResponse(BaseModel):
    invoice_id: str
    amount_tinybars: int
    amount_hbar: float
    recipient_account_id: str
    network: str
    memo: str
    transaction_preparation_data: Dict[str, Any]

class SubmitPaymentProofInput(BaseModel):
    payer_account_id: str
    transaction_id: Optional[str] = None
    signed_payload: Optional[str] = None

class PaymentVerificationResult(BaseModel):
    invoice_id: str
    request_id: str
    verified: bool
    status: str
    network: str
    transaction_id: str
    transaction_url: str
    payer_account_id: str
    recipient_account_id: str
    amount_tinybars: int
    amount_hbar: float
    verified_at: str

