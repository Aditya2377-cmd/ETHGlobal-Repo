# PerPay Payment Flow — x402 v2 Hedera Exact Settlement

## Overview

PerPay uses a **post-generation, exact-usage invoice and pay-to-unlock** payment sequence.
Unlike traditional fixed subscriptions or upfront paywalls, PerPay generates the AI output with Groq first, calculates the exact billing amount down to integer tinybars based on actual prompt and completion tokens, stores the result privately in the FastAPI gateway, and presents an x402 v2 payment challenge to the customer.

No response content is unlocked until on-chain settlement is verified and confirmed on Hedera Testnet.

---

## Architecture Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant GW as FastAPI Gateway (Groq)
    participant DB as Gateway Private Storage
    participant X402 as PerPay x402 Service (Port 4020)
    participant Fac as Facilitator (https://x402.org/facilitator)
    participant Hedera as Hedera Testnet (Consensus)
    participant Mirror as Hedera Mirror Node

    Note over User,GW: Phase 1: Generation & Metering (Pre-Payment)
    User->>GW: 1. POST /api/v1/generate (prompt, model)
    GW->>GW: Validate user & check unpaid account lock
    GW->>GW: Dispatch to Groq API
    GW->>GW: Extract exact prompt & completion tokens
    GW->>GW: Calculate charge in tinybars (ROUND_CEILING)
    GW->>DB: Store AI response privately (status: UNPAID)
    GW->>GW: Generate unique invoice_id & generation_id
    GW-->>User: Return { generation_id, invoice_id, charge_tinybars }

    Note over User,X402: Phase 2: x402 v2 Payment Challenge (Pay-to-Unlock)
    User->>X402: 2. GET /api/v1/generations/{id}/result
    X402->>GW: Query trusted invoice context
    X402->>Fac: Fetch supported feePayer (0.0.9185802)
    X402-->>User: HTTP 402 Payment Required (PAYMENT-REQUIRED header)

    Note over User,Fac: Phase 3: Explicit Signing & Facilitator Sponsoring
    User->>User: Human reviews charge (tinybars, HBAR, receiver)
    User->>User: Construct TransferTransaction with feePayer: 0.0.9185802
    User->>User: Sign debit transfer with customer private key
    User->>X402: 3. GET /api/v1/generations/{id}/result (PAYMENT-SIGNATURE header)

    Note over X402,Mirror: Phase 4: Verification, Settlement & Reconciliation
    X402->>Fac: POST /verify (validate transaction signature & params)
    Fac-->>X402: { isValid: true }
    X402->>Fac: POST /settle (facilitator co-signs fee & submits to Hedera)
    Fac->>Hedera: CryptoTransfer transaction
    Hedera-->>Fac: Transaction ID (e.g. 0.0.9185802-1793954439-575809479)
    Fac-->>X402: { success: true, transactionId }
    X402->>Mirror: GET /api/v1/transactions/{id} (independent reconciliation)
    Mirror-->>X402: Status SUCCESS, exact amount debited & credited

    Note over X402,User: Phase 5: Unlock & Response Delivery
    X402->>X402: Atomic DB commit: settlement_records & outbox_events
    X402->>GW: Notify confirmed settlement (POST /internal/v1/payments/settlement)
    GW->>DB: Mark invoice PAID, release user lock
    X402->>GW: GET /internal/v1/generations/{id}/deliver
    GW-->>X402: Stored Groq response content
    X402-->>User: HTTP 200 OK (PAYMENT-RESPONSE header + decrypted AI result)
```

---

## State Machine Transitions

```mermaid
stateDiagram-v2
    [*] --> PAYMENT_REQUIRED: 402 challenge issued
    PAYMENT_REQUIRED --> PAYMENT_SUBMITTED: PAYMENT-SIGNATURE received
    PAYMENT_REQUIRED --> EXPIRED: Invoice window elapsed
    PAYMENT_SUBMITTED --> VERIFYING: Schema validated
    PAYMENT_SUBMITTED --> FAILED: Invalid payload format
    VERIFYING --> SETTLING: Facilitator verify returned isValid=true
    VERIFYING --> FAILED: Signature or constraint mismatch
    SETTLING --> RECONCILIATION_REQUIRED: Facilitator submitted to Hedera
    SETTLING --> FAILED: Facilitator rejected settlement
    RECONCILIATION_REQUIRED --> CONFIRMED: Mirror node confirmed SUCCESS
    RECONCILIATION_REQUIRED --> SETTLEMENT_PENDING: Mirror node indexing delay
    SETTLEMENT_PENDING --> CONFIRMED: Subsequent retry confirmed on chain
    SETTLEMENT_PENDING --> FAILED: On-chain transaction execution failed
    CONFIRMED --> [*]: Content permanently unlocked
    FAILED --> PAYMENT_SUBMITTED: Customer retries signing
    EXPIRED --> [*]: Lock released / request cancelled
```

---

## Safe Delivery & Recovery Guarantees

1. **Fail-Closed Content Gating**:
   No bytes of the generated AI completion leave the service before the Hedera Mirror Node confirms that the transaction succeeded and credited the exact integer tinybars to the PerPay receiver account.

2. **Durable Local Storage & Outbox**:
   Confirmed settlements are written to SQLite using ACID transactions alongside an outbox entry. If the FastAPI gateway is temporarily offline or restarting, the settlement evidence is retained, and the outbox background service retries delivery with exponential backoff.

3. **Zero Double-Billing on Reconnect**:
   If a client pays, receives a network disconnect, and reconnects minutes later:
   - Requesting `GET /api/v1/generations/{generation_id}/result` looks up the confirmed settlement in SQLite.
   - It recognizes that the invoice is already paid and immediately releases the stored completion (HTTP 200) without requesting payment a second time.
