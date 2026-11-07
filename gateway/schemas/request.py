from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class CreateRequestInput(BaseModel):
    model: str = Field(default="llama-3.3-70b-versatile", description="Supported Groq Model ID")
    prompt: str = Field(..., min_length=1, description="Prompt text")
    max_output_tokens: Optional[int] = Field(default=1024, le=4096)
    idempotency_key: Optional[str] = None

class CreateRequestResponse(BaseModel):
    request_id: str
    generation_id: Optional[str] = None
    status: str
    invoice_id: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    amount_tinybars: Optional[int] = None
    amount_hbar: Optional[float] = None
    message: Optional[str] = None

class RequestStatusResponse(BaseModel):
    request_id: str
    status: str
    model: str
    invoice_id: Optional[str] = None
    payment_status: str
    prompt_snippet: str
    total_tokens: int
    amount_tinybars: int
    amount_hbar: float
    created_at: str

class UnlockedResponseOutput(BaseModel):
    request_id: str
    generation_id: Optional[str] = None
    invoice_id: str
    model: str
    prompt: str
    response_text: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    charge_tinybars: int
    charge_hbar: float
    transaction_id: str
    transaction_url: str
    settled_at: str
