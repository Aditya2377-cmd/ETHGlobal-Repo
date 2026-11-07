import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

DB_PATH = os.getenv("SQLITE_DB", os.path.join(os.path.dirname(__file__), "gateway_ledger.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. users
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        account_status TEXT NOT NULL DEFAULT 'ACTIVE',
        authentication_reference TEXT NOT NULL,
        connected_wallet TEXT,
        balance_tinybars INTEGER NOT NULL DEFAULT 4895210000
    )
    """)

    # 2. ai_requests
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        generated_response_private TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        provider_cost REAL NOT NULL,
        customer_charge REAL NOT NULL,
        amount_tinybars INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'payment_required',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        idempotency_key TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 3. invoices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        network TEXT NOT NULL,
        asset TEXT NOT NULL DEFAULT 'HBAR',
        amount_tinybars INTEGER NOT NULL,
        amount_hbar_display REAL NOT NULL,
        recipient_account_id TEXT NOT NULL,
        memo TEXT NOT NULL,
        qr_payload TEXT,
        pricing_snapshot TEXT,
        status TEXT NOT NULL DEFAULT 'unpaid',
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        paid_at TEXT,
        FOREIGN KEY (request_id) REFERENCES ai_requests(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # 4. payments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
        payer_account_id TEXT NOT NULL,
        recipient_account_id TEXT NOT NULL,
        network TEXT NOT NULL,
        amount_tinybars INTEGER NOT NULL,
        verification_status TEXT NOT NULL,
        transaction_url TEXT NOT NULL,
        verified_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
    """)

    # 5. usage_events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_events (
        id TEXT PRIMARY KEY,
        request_id TEXT,
        user_id TEXT,
        wallet TEXT,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        provider_cost REAL,
        customer_charge REAL,
        cost_wei INTEGER,
        chain TEXT DEFAULT 'hedera-testnet',
        tx_hash TEXT,
        status TEXT DEFAULT 'ok',
        created_at TEXT NOT NULL,
        ts TEXT
    )
    """)

    # 6. escrow_ledger (Member 1 compatibility)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS escrow_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        balance_wei INTEGER DEFAULT 0,
        spend_cap_wei INTEGER,
        expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 7. audit_events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        request_id TEXT,
        invoice_id TEXT,
        event_type TEXT,
        event_metadata TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Seed default active user if missing
    cursor.execute("SELECT id FROM users WHERE id = 'usr_hedera_004921'")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO users (id, created_at, account_status, authentication_reference, connected_wallet, balance_tinybars)
        VALUES ('usr_hedera_004921', ?, 'ACTIVE', 'auth_ref_hedera_004921', '0.0.YOUR_ACCOUNT_ID', 4895210000)
        """, (datetime.now(timezone.utc).isoformat(),))

    conn.commit()
    conn.close()

# Initialize DB on load
init_db()
