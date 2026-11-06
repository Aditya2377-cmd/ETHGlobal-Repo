import unittest
import os
import sys
import json
import sqlite3

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import get_db, init_db
from app.services.pricing_service import pricing_service, TINYBARS_PER_HBAR, HBAR_USD_RATE
from app.services.groq_service import groq_service
from app.services.budget_service import budget_service
from app.integrations.hedera_adapter import hedera_adapter
from app.api.requests import create_ai_request, get_request_status, retrieve_unlocked_response
from app.api.invoices import get_invoice_details, submit_wallet_payment, get_invoice_status
from app.schemas.request import CreateRequestInput
from app.schemas.invoice import SubmitPaymentProofInput
from fastapi import HTTPException

class TestPayperBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def setUp(self):
        # Reset tables for clean test state
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM payments")
        cursor.execute("DELETE FROM invoices")
        cursor.execute("DELETE FROM usage_events")
        cursor.execute("DELETE FROM audit_events")
        cursor.execute("DELETE FROM ai_requests")
        conn.commit()
        conn.close()

    def test_01_pricing_calculation_and_tinybars(self):
        """Test exact token accounting and tinybar conversion"""
        calc = pricing_service.calculate_cost("llama-3.3-70b-versatile", prompt_tokens=1000, completion_tokens=2000)
        self.assertGreater(calc["amount_tinybars"], 0)
        self.assertEqual(calc["amount_tinybars"], round(calc["amount_hbar"] * TINYBARS_PER_HBAR))
        self.assertIn("pricing_snapshot", calc)
        self.assertEqual(calc["model_id"], "llama-3.3-70b-versatile")

    def test_02_groq_service_generation_and_tokens(self):
        """Test Groq generation captures real prompt and completion tokens"""
        gen = groq_service.generate("Explain x402 payment protocol in 1 sentence", model="llama-3.3-70b-versatile")
        self.assertIn("text", gen)
        self.assertGreater(len(gen["text"]), 0)
        self.assertGreater(gen["prompt_tokens"], 0)
        self.assertGreater(gen["completion_tokens"], 0)
        self.assertEqual(gen["total_tokens"], gen["prompt_tokens"] + gen["completion_tokens"])

    def test_03_hedera_adapter_payloads(self):
        """Test Hedera payment invoice and QR format"""
        inv = hedera_adapter.create_payment_invoice("inv_test123", "req_test123", 2500000)
        self.assertEqual(inv["invoice_id"], "inv_test123")
        self.assertEqual(inv["network"], "hedera:testnet")
        self.assertEqual(inv["amount_tinybars"], 2500000)
        self.assertEqual(inv["amount_hbar"], 0.025)
        self.assertIn("0.0.5109822", inv["qr_payload"])
        self.assertIn("inv_test123", inv["qr_payload"])

    def test_04_create_request_and_verify_private_escrow(self):
        """Test request is generated and secured in escrow with payment_required status"""
        req_input = CreateRequestInput(
            prompt="Write a Python function to check Hedera balance",
            model="llama-3.3-70b-versatile"
        )
        res = create_ai_request(req_input)
        self.assertEqual(res.status, "payment_required")
        self.assertTrue(res.invoice_id.startswith("inv_"))
        self.assertTrue(res.request_id.startswith("req_"))
        self.assertGreater(res.amount_tinybars, 0)

        # Response must NOT be accessible before payment (HTTP 402)
        with self.assertRaises(HTTPException) as ctx:
            retrieve_unlocked_response(res.request_id)
        self.assertEqual(ctx.exception.status_code, 402)

    def test_05_account_locking_rule(self):
        """Account locking: Unsettled invoice blocks new AI prompt submissions"""
        req_input = CreateRequestInput(prompt="First request", model="llama-3.1-8b-instant")
        res1 = create_ai_request(req_input)

        # Attempt to submit a second prompt while invoice 1 is unpaid
        with self.assertRaises(HTTPException) as ctx:
            create_ai_request(CreateRequestInput(prompt="Second request", model="llama-3.1-8b-instant"))
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Account locked", ctx.exception.detail)

    def test_06_settlement_and_response_unlock(self):
        """Full flow: create -> locked -> pay on Hedera -> unlocked with HashScan link"""
        req_input = CreateRequestInput(prompt="What is the speed of light?", model="llama-3.3-70b-versatile")
        res = create_ai_request(req_input)

        # Invoice details
        inv = get_invoice_details(res.invoice_id)
        self.assertEqual(inv.status, "unpaid")

        # Submit payment proof
        proof = SubmitPaymentProofInput(
            payer_account_id="0.0.4829103",
            transaction_id="0.0.4829103@1730906400.123456789"
        )
        verification = submit_wallet_payment(res.invoice_id, proof)
        self.assertTrue(verification.verified)
        self.assertEqual(verification.status, "paid")
        self.assertIn("hashscan.io", verification.transaction_url)

        # Invoice status should now be paid
        status = get_invoice_status(res.invoice_id)
        self.assertTrue(status["is_paid"])

        # Now retrieve unlocked response: MUST succeed!
        unlocked = retrieve_unlocked_response(res.request_id)
        self.assertEqual(unlocked.request_id, res.request_id)
        self.assertGreater(len(unlocked.response_text), 0)
        self.assertEqual(unlocked.transaction_id, "0.0.4829103@1730906400.123456789")
        self.assertIn("hashscan.io", unlocked.transaction_url)

if __name__ == "__main__":
    unittest.main()
