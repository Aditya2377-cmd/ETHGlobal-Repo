# PerPay API Contracts & Shared Data Specification

**Protocol Version:** x402 v2  
**Event Schema Version:** 2.0.0  
**Network:** `hedera:testnet`  
**Native Asset:** `0.0.0` (HBAR)  
**Conversion:** 1 HBAR = 100,000,000 tinybars  

---

## 1. System Communication Topology

```
+-------------------------------------------------------------+
|               PerPay Frontend (frontend-design/)            |
|             Port: 3000 | React 18 + TS + WebGL              |
+------------------------------+------------------------------+
         |                     | 
         | 1. Submit Prompt    | 4. Fetch Result (402)
         |    (POST /generations)|    Submit Signature (200)
         v                     v
+-----------------------+     +-------------------------------+
|  Gateway (gateway/)   |     |  x402 Service (x402-service/) |
|  Port: 8000 | FastAPI |     |  Port: 4020 | Express + x402  |
+-----------------------+     +-------------------------------+
         ^                             |
         |  2. /payment-context (GET)  |
         |  5. /deliver (GET)          |
         +-----------------------------+
         |  3. /payments/settlement    |
         |     (POST, X-Internal-Secret)
```

---

## 2. Public API Endpoints

### 2.1 AI Prompt Generation
- **Endpoint:** `POST /api/v1/generations`
- **Host:** `http://localhost:8000` (Gateway)
- **Description:** Submits prompt to Groq. Buffers completion privately, records exact prompt & completion token counts, creates unique invoice, and locks user from duplicate generation until settled.
- **Request Body:**
```json
{
  "prompt": "Explain atomic x402 micropayments on Hedera Hashgraph",
  "model": "llama-3.3-70b-versatile",
  "user_id": "usr_default_01",
  "max_tokens": 1024
}
```
- **Response (HTTP 201 Created):**
```json
{
  "generation_id": "gen_8f3d1b82",
  "request_id": "req_a9c02d14",
  "user_id": "usr_default_01",
  "model": "llama-3.3-70b-versatile",
  "status": "BUFFERED_UNPAID",
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 218,
    "total_tokens": 260
  },
  "invoice": {
    "invoice_id": "inv_5e1b72a9",
    "charge_tinybars": 1250000,
    "charge_hbar": "0.01250000",
    "status": "UNPAID",
    "created_at": "2026-11-07T02:00:00Z",
    "expires_at": "2026-11-07T02:15:00Z",
    "pay_to": "0.0.YOUR_ACCOUNT_ID"
  },
  "x402_result_url": "http://localhost:4020/api/v1/generations/gen_8f3d1b82/result"
}
```

---

### 2.2 Retrieve Invoice Details
- **Endpoint:** `GET /api/v1/invoices/{invoice_id}`
- **Host:** `http://localhost:8000` (Gateway)
- **Response (HTTP 200 OK):**
```json
{
  "invoice_id": "inv_5e1b72a9",
  "generation_id": "gen_8f3d1b82",
  "user_id": "usr_default_01",
  "model": "llama-3.3-70b-versatile",
  "prompt_tokens": 42,
  "completion_tokens": 218,
  "total_tokens": 260,
  "charge_tinybars": 1250000,
  "charge_hbar": "0.01250000",
  "status": "UNPAID",
  "created_at": "2026-11-07T02:00:00Z",
  "expires_at": "2026-11-07T02:15:00Z"
}
```

---

### 2.3 x402 Pay-to-Unlock Result
- **Endpoint:** `GET /api/v1/generations/{generation_id}/result`
- **Host:** `http://localhost:4020` (x402-service)
- **Headers (Step 1 - Initial Challenge):**
  - None or `X-User-Id: usr_default_01`
- **Response (HTTP 402 Payment Required):**
  - **Header:** `PAYMENT-REQUIRED: <base64-encoded-x402-v2-challenge>`
  - **Body:**
```json
{
  "error": "Payment Required",
  "invoice_id": "inv_5e1b72a9",
  "generation_id": "gen_8f3d1b82",
  "charge_tinybars": 1250000,
  "charge_hbar": "0.01250000",
  "network": "hedera:testnet",
  "payTo": "0.0.YOUR_ACCOUNT_ID",
  "feePayer": "0.0.9185802"
}
```

- **Headers (Step 2 - Unlocking Submission):**
  - `PAYMENT-SIGNATURE: <base64-encoded-signed-hedera-transaction>`
  - `X-User-Id: usr_default_01`
- **Response (HTTP 200 OK):**
  - **Header:** `PAYMENT-RESPONSE: <base64-encoded-settlement-receipt>`
  - **Body:**
```json
{
  "generation_id": "gen_8f3d1b82",
  "content": "Atomic x402 micropayments on Hedera leverage native cryptoTransfer transactions...",
  "model": "llama-3.3-70b-versatile",
  "total_tokens": 260,
  "settlement": {
    "transaction_id": "0.0.12345@1731000000.123456789",
    "transaction_url": "https://hashscan.io/testnet/transaction/0.0.12345@1731000000.123456789",
    "charge_tinybars": 1250000,
    "charge_hbar": "0.01250000",
    "confirmed_at": "2026-11-07T02:00:10Z"
  }
}
```

---

## 3. Internal Trusted Service APIs (Port 8000, Protected by `X-Internal-Secret`)

### 3.1 Fetch Payment Context
- **Endpoint:** `GET /internal/v1/generations/{generation_id}/payment-context`
- **Header:** `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`
- **Response (HTTP 200 OK):** Matches schema `TrustedInvoiceContext` (`invoice_id`, `generation_id`, `user_id`, `charge_tinybars`, `charge_hbar`, `status`, etc.).

### 3.2 Deliver Stored Private AI Response
- **Endpoint:** `GET /internal/v1/generations/{generation_id}/deliver`
- **Header:** `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`
- **Response (HTTP 200 OK):**
```json
{
  "generation_id": "gen_8f3d1b82",
  "content": "The generated completion text...",
  "model": "llama-3.3-70b-versatile",
  "total_tokens": 260
}
```

### 3.3 Confirm Settlement Webhook
- **Endpoint:** `POST /internal/v1/payments/settlement`
- **Header:** `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`
- **Request Body:**
```json
{
  "invoice_id": "inv_5e1b72a9",
  "generation_id": "gen_8f3d1b82",
  "transaction_id": "0.0.12345@1731000000.123456789",
  "payer_account_id": "0.0.12345",
  "receiver_account_id": "0.0.YOUR_ACCOUNT_ID",
  "amount_tinybars": 1250000,
  "network": "hedera:testnet",
  "confirmed_at": "2026-11-07T02:00:10Z",
  "transaction_url": "https://hashscan.io/testnet/transaction/0.0.12345@1731000000.123456789"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "status": "UNLOCKED",
  "invoice_status": "PAID"
}
```

---

## 4. Shared Event Contract (Schema v2.0.0)

Every business state transition emits an immutable log entry matching `PerPaySharedEvent`:
```json
{
  "schema_version": "2.0.0",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-07T02:00:10Z",
  "request_id": "req_a9c02d14",
  "invoice_id": "inv_5e1b72a9",
  "generation_id": "gen_8f3d1b82",
  "user_id": "usr_default_01",
  "wallet": "0.0.12345",
  "model": "llama-3.3-70b-versatile",
  "prompt_tokens": 42,
  "completion_tokens": 218,
  "total_tokens": 260,
  "charge_tinybars": 1250000,
  "charge_hbar": "0.01250000",
  "network": "hedera:testnet",
  "payment_scheme": "exact",
  "payment_status": "CONFIRMED",
  "transaction_id": "0.0.12345@1731000000.123456789",
  "transaction_url": "https://hashscan.io/testnet/transaction/0.0.12345@1731000000.123456789",
  "delivery_status": "DELIVERED"
}
```

