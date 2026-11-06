import math
from typing import Dict, Any

TINYBARS_PER_HBAR: int = 100_000_000
HBAR_USD_RATE: float = 0.05  # Approximate Hedera testnet valuation rate

MODEL_PRICING: Dict[str, Dict[str, Any]] = {
    "llama-3.3-70b-versatile": {
        "name": "Llama 3.3 70B Versatile",
        "provider": "Groq",
        "tinybars_per_1k_input": 1800,
        "tinybars_per_1k_output": 4200,
        "input_per_1m_usd": 0.59,
        "output_per_1m_usd": 0.79,
        "provider_usd_per_1m_input": 0.59,
        "provider_usd_per_1m_output": 0.79,
        "markup_multiplier": 1.15,
    },
    "llama-3.1-8b-instant": {
        "name": "Llama 3.1 8B Instant",
        "provider": "Groq",
        "tinybars_per_1k_input": 400,
        "tinybars_per_1k_output": 900,
        "input_per_1m_usd": 0.05,
        "output_per_1m_usd": 0.08,
        "provider_usd_per_1m_input": 0.05,
        "provider_usd_per_1m_output": 0.08,
        "markup_multiplier": 1.15,
    },
    "mixtral-8x7b-32768": {
        "name": "Mixtral 8x7B MoE",
        "provider": "Groq",
        "tinybars_per_1k_input": 1200,
        "tinybars_per_1k_output": 2800,
        "input_per_1m_usd": 0.24,
        "output_per_1m_usd": 0.24,
        "provider_usd_per_1m_input": 0.24,
        "provider_usd_per_1m_output": 0.24,
        "markup_multiplier": 1.15,
    },
    "gemma2-9b-it": {
        "name": "Gemma 2 9B IT",
        "provider": "Groq",
        "tinybars_per_1k_input": 600,
        "tinybars_per_1k_output": 1400,
        "input_per_1m_usd": 0.20,
        "output_per_1m_usd": 0.20,
        "provider_usd_per_1m_input": 0.20,
        "provider_usd_per_1m_output": 0.20,
        "markup_multiplier": 1.15,
    },
}

MODEL_RATES = MODEL_PRICING

class PricingService:
    @staticmethod
    def get_model_rates(model_id: str) -> Dict[str, Any]:
        return MODEL_PRICING.get(model_id, MODEL_PRICING["llama-3.3-70b-versatile"])

    @staticmethod
    def calculate_cost(model_id: str, prompt_tokens: int, completion_tokens: int) -> Dict[str, Any]:
        rates = PricingService.get_model_rates(model_id)
        
        # Calculate tinybars
        input_tinybars = math.ceil((prompt_tokens / 1000.0) * rates["tinybars_per_1k_input"])
        output_tinybars = math.ceil((completion_tokens / 1000.0) * rates["tinybars_per_1k_output"])
        total_tinybars = max(100, input_tinybars + output_tinybars)
        
        # Convert to HBAR (1 HBAR = 100,000,000 tinybars)
        total_hbar = total_tinybars / 100_000_000.0
        
        # Calculate approximate provider USD cost
        input_cost_usd = (prompt_tokens / 1_000_000.0) * rates["provider_usd_per_1m_input"]
        output_cost_usd = (completion_tokens / 1_000_000.0) * rates["provider_usd_per_1m_output"]
        total_provider_cost = input_cost_usd + output_cost_usd

        return {
            "model_id": model_id,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "input_tinybars": input_tinybars,
            "output_tinybars": output_tinybars,
            "amount_tinybars": total_tinybars,
            "amount_hbar": total_hbar,
            "provider_cost_usd": round(total_provider_cost, 6),
            "pricing_snapshot": rates,
        }

pricing_service = PricingService()
