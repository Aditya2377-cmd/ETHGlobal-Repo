from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.requests import router as requests_router
from .api.invoices import router as invoices_router
from .api.history import router as history_router
from .api.accounts import router as accounts_router
from .services.pricing_service import MODEL_RATES, TINYBARS_PER_HBAR, HBAR_USD_RATE
from .core.config import settings

app = FastAPI(
    title="Payper API",
    description="Usage-based AI payment gateway settled on-chain via Hedera Testnet and x402 v2 protocol.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with /api/v1 prefix
app.include_router(requests_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(accounts_router, prefix="/api/v1")

# Convenience aliases matching direct frontend client routes
from .api.requests import create_ai_request, retrieve_unlocked_response
from .api.accounts import get_account_status
from .api.invoices import get_invoice_details
from .api.history import get_usage_and_payment_history
from .schemas.request import CreateRequestInput

@app.post("/api/generate")
def generate_alias(input_data: CreateRequestInput):
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

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "payper-backend",
        "network": settings.HEDERA_NETWORK,
        "treasury_account": settings.TREASURY_ACCOUNT_ID,
        "ai_provider": "Groq"
    }

@app.get("/api/v1/pricing")
def get_pricing_schedule():
    """
    Returns public pricing schedule per 1M tokens across supported models.
    """
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

@app.get("/")
def root():
    return {
        "message": "Payper — Usage-Based AI Payment Gateway API",
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1"
    }
