# API Contracts Specification — PerPay Payment Engine

## 1. Protocol Headers

| Header | Direction | Format | Description |
|---|---|---|---|
| `PAYMENT-REQUIRED` | Server -> Client | Base64-encoded JSON | Returned with HTTP 402; contains x402 v2 payment requirements. |
| `PAYMENT-SIGNATURE` | Client -> Server | Base64-encoded JSON | Provided on retry; contains client-signed Hedera TransferTransaction payload. |
| `PAYMENT-RESPONSE` | Server -> Client | Base64-encoded JSON | Returned with HTTP 200; contains confirmed settlement proof and transaction ID. |
| `X-Internal-Secret` | Service <-> Service | Plain String | Shared secret for internal gateway / payment service authentication. |
| `X-User-Id` | Client -> Server | String | User ID header forwarded for account ownership verification. |

---

## 2. Public Client Endpoints

### Retrieve Generation Result (Pay-to-Unlock)
```http
GET /api/v1/generations/{generation_id}/result
```

#### Headers
- `PAYMENT-SIGNATURE`: (Optional on first call, mandatory to unlock payment).
- `X-User-Id`: (Optional, validated against invoice owner).

#### Response 402 Payment Required
```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6Miw...
Content-Type: application/json

{
  "error": "Payment Required",
  "invoice_id": "inv_9b1deb4d",
  "generation_id": "gen_8a2ceb3c",
  "charge_tinybars": 25000,
  "charge_hbar": "0.00025",
  "network": "hedera:testnet",
  "payTo": "0.0.9999999",
  "feePayer": "0.0.9185802"
}
```

#### Response 200 OK (Payment Confirmed)
```http
HTTP/1.1 200 OK
PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVl...
Content-Type: application/json

{
  "generation_id": "gen_8a2ceb3c",
  "content": "The generated Groq AI completion content...",
  "model": "llama-3.3-70b-versatile",
  "total_tokens": 350,
  "settlement": {
    "transaction_id": "0.0.9185802-1793954439-575809479",
    "transaction_url": "https://hashscan.io/testnet/transaction/0.0.9185802-1793954439-575809479",
    "amount_tinybars": 25000,
    "confirmed_at": "2026-11-06T10:01:15.000Z"
  }
}
```

---

## 3. Health & Readiness Endpoints

### Health Check
```http
GET /health
```
```json
{
  "status": "ok",
  "timestamp": "2026-11-06T10:00:00.000Z",
  "network": "hedera:testnet",
  "receiverAccountId": "0.0.9999999",
  "version": "2.0.0",
  "uptime": 124.5
}
```

### Readiness Check (Facilitator Connectivity)
```http
GET /ready
```
```json
{
  "ready": true,
  "timestamp": "2026-11-06T10:00:00.000Z",
  "network": "hedera:testnet",
  "facilitator": {
    "url": "https://x402.org/facilitator",
    "isCompatible": true,
    "feePayer": "0.0.9185802"
  }
}
```

---

## 4. Internal Gateway Endpoints

### Push Invoice Record (Proactive Sync)
```http
POST /internal/v1/invoices/sync
X-Internal-Secret: <SECRET>
Content-Type: application/json

{
  "invoice_id": "inv_123",
  "generation_id": "gen_123",
  "request_id": "req_123",
  "user_id": "user_1",
  "prompt_tokens": 100,
  "completion_tokens": 150,
  "total_tokens": 250,
  "charge_tinybars": 15000,
  "charge_hbar": "0.00015",
  "model": "llama-3.3-70b-versatile",
  "status": "UNPAID",
  "created_at": "2026-11-06T10:00:00Z",
  "expires_at": "2026-11-06T10:05:00Z"
}
```

### Query Confirmed Settlement by Generation ID
```http
GET /internal/v1/settlements/{generation_id}
X-Internal-Secret: <SECRET>
```
```json
{
  "transaction_id": "0.0.9185802-1793954439-575809479",
  "invoice_id": "inv_123",
  "generation_id": "gen_123",
  "payer_account": "0.0.12345",
  "receiver_account": "0.0.9999999",
  "amount_tinybars": 15000,
  "consensus_timestamp": "1793954439.575809479",
  "mirror_status": "SUCCESS",
  "hashscan_url": "https://hashscan.io/testnet/transaction/0.0.9185802-1793954439-575809479",
  "confirmed_at": "2026-11-06T10:01:00Z"
}
```
