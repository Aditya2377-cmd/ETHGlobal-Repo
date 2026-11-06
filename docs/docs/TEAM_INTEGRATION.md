# Team Integration Guide — PerPay Architecture & Contracts

## 1. Overview & Responsibility Matrix

PerPay is divided across three distinct ownership domains:

| Team Member | Module Path | Domain Responsibilities |
|---|---|---|
| **Hedera / x402 Lead (Current Module)** | `x402-service/` | x402 v2 protocol, Hedera Testnet payments, facilitator settlement, mirror node reconciliation, client signing abstraction, payment persistence, and outbox delivery. |
| **Teammate 1 (FastAPI Lead)** | `gateway/` | FastAPI gateway, Groq API completion, prompt & completion token extraction, exact tinybar pricing, user restrictions (single unpaid generation lock), and private storage. |
| **Teammate 2 (Pawan - Frontend / Dashboard Lead)** | `dashboard/` | Next.js / React dashboard, usage visualisations, wallet payment modal, real-time settlement status display, and HashScan transaction links. |

---

## 2. Integration with Teammate 1 (FastAPI Gateway)

### Required Internal Endpoints on FastAPI Gateway

The x402 payment service calls the FastAPI gateway over internal HTTP (configured via `FASTAPI_GATEWAY_URL`, default `http://localhost:8000`).
All requests include the header:
```http
X-Internal-Secret: <INTERNAL_SERVICE_SECRET>
```

#### 1. Invoice Context Query
- **Route**: `GET /internal/v1/generations/{generation_id}/payment-context`
- **Purpose**: Called by x402-service when building payment requirements.
- **Expected FastAPI Response (HTTP 200)**:
```json
{
  "invoice_id": "inv_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "generation_id": "gen_8a2ceb3c-2a6c-4cad-8acc-1a0c6a2cba5c",
  "request_id": "req_7f1bea2b-1a5b-4bad-7abb-0a9b5a1ba94b",
  "user_id": "usr_dev_1",
  "prompt_tokens": 142,
  "completion_tokens": 284,
  "total_tokens": 426,
  "charge_tinybars": 32000,
  "charge_hbar": "0.00032",
  "model": "llama-3.3-70b-versatile",
  "status": "UNPAID",
  "created_at": "2026-11-06T10:00:00.000Z",
  "expires_at": "2026-11-06T10:05:00.000Z"
}
```

#### 2. Confirmed Settlement Notification (Webhook / Outbox)
- **Route**: `POST /internal/v1/payments/settlement`
- **Purpose**: Notifies FastAPI that on-chain settlement has been confirmed on Hedera Testnet.
- **FastAPI Action**: Updates local invoice status to `PAID` and releases the user's unpaid generation lock.
- **Payload from x402-service**:
```json
{
  "invoice_id": "inv_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "generation_id": "gen_8a2ceb3c-2a6c-4cad-8acc-1a0c6a2cba5c",
  "transaction_id": "0.0.9185802-1793954439-575809479",
  "payer_account_id": "0.0.12345",
  "receiver_account_id": "0.0.9999999",
  "amount_tinybars": 32000,
  "network": "hedera:testnet",
  "confirmed_at": "2026-11-06T10:01:15.000Z",
  "transaction_url": "https://hashscan.io/testnet/transaction/0.0.9185802-1793954439-575809479"
}
```

#### 3. Stored AI Result Delivery
- **Route**: `GET /internal/v1/generations/{generation_id}/deliver`
- **Purpose**: Called by x402-service strictly after confirmation to release the Groq output.
- **Expected FastAPI Response (HTTP 200)**:
```json
{
  "generation_id": "gen_8a2ceb3c-2a6c-4cad-8acc-1a0c6a2cba5c",
  "content": "The complete generated AI response content...",
  "model": "llama-3.3-70b-versatile",
  "total_tokens": 426
}
```

---

## 3. Integration with Teammate 2 (Pawan — Dashboard & Frontend)

### Authoritative Data Boundaries

- **FastAPI** is the authoritative source for:
  - User accounts, generation prompts, model names, prompt tokens, completion tokens, USD pricing rates, and generation status.
- **x402 Payment Service** is the authoritative source for:
  - Hedera transaction IDs, settlement timestamps, payer/receiver accounts, tinybars settled, and HashScan explorer URLs.

### Payment States for Frontend UI

| State | Badge / Color | Meaning in Dashboard |
|---|---|---|
| `PAYMENT_REQUIRED` | Yellow / Warning | Generation ready; awaiting customer signature approval. |
| `PAYMENT_SUBMITTED` | Blue / Info | Signed transaction payload received by payment service. |
| `VERIFYING` | Blue / Pulse | Facilitator verifying signature against Hedera testnet key. |
| `SETTLING` | Indigo / Pulse | Facilitator submitting transaction to Hedera Testnet nodes. |
| `CONFIRMED` | Green / Success | Consensus reached and confirmed on Mirror Node. Content unlocked. |
| `FAILED` | Red / Error | Invalid signature, insufficient funds, or network rejection. |
| `EXPIRED` | Gray / Neutral | Invoice payment window timed out without payment. |

### How to Render Hedera HashScan Links

For any confirmed settlement, display the canonical HashScan link using the `transaction_id`:
```ts
const hashscanLink = `https://hashscan.io/testnet/transaction/${transaction_id}`;
```
*Note: Never use Ethereum `0x` formatting. Hedera Testnet transaction IDs always follow `0.0.payer-seconds-nanos`.*

### Pay-to-Unlock Client Interaction (Web / Extension)

1. Frontend initiates retrieval: `GET http://localhost:4020/api/v1/generations/{generation_id}/result`.
2. Intercepts HTTP 402:
   - Reads `PAYMENT-REQUIRED` header (base64 decoded).
   - Prompts user in wallet modal with exact HBAR and tinybar amount.
3. User signs `TransferTransaction` with their Hedera wallet (HashPack / Blade / Testnet Signer).
4. Frontend re-requests endpoint with `PAYMENT-SIGNATURE: <base64_payload>`.
5. Receives HTTP 200 with `PAYMENT-RESPONSE` header and decrypted AI completion.
