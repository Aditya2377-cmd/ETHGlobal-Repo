import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Payper AI Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Hedera Network
    HEDERA_NETWORK: str = os.getenv("HEDERA_NETWORK", "hedera:testnet")
    TREASURY_ACCOUNT_ID: str = os.getenv("VITE_PERPAY_TREASURY_ACCOUNT", "0.0.5109822")
    
    # Groq Provider
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Budget Controls
    MAX_TOKENS_PER_REQUEST: int = int(os.getenv("MAX_TOKENS_PER_REQUEST", "4096"))
    DAILY_AI_BUDGET_USD: float = float(os.getenv("DAILY_AI_BUDGET_USD", "100.0"))
    MAX_UNPAID_INVOICES_PER_USER: int = 1
    
    # SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./payper.db")

settings = Settings()

