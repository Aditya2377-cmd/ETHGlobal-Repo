from typing import Optional, Dict, Any
from ..database import get_db
from ..core.config import settings

class BudgetService:
    @staticmethod
    def check_user_account_restriction(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Returns existing pending invoice if account has an outstanding unpaid generation.
        """
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT i.id as invoice_id, i.request_id, i.amount_tinybars, i.amount_hbar_display, i.status, r.prompt
        FROM invoices i
        JOIN ai_requests r ON i.request_id = r.id
        WHERE i.user_id = ? AND i.status = 'unpaid'
        ORDER BY i.created_at DESC
        LIMIT 1
        """, (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None

    @staticmethod
    def validate_request_budget(prompt: str, max_output_tokens: int) -> bool:
        if max_output_tokens > settings.MAX_TOKENS_PER_REQUEST:
            raise ValueError(f"Max output tokens ({max_output_tokens}) exceeds platform limit ({settings.MAX_TOKENS_PER_REQUEST})")
        if len(prompt.strip()) == 0:
            raise ValueError("Prompt cannot be empty")
        return True

budget_service = BudgetService()

