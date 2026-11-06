# PerPay Repository Integration Audit

**Date:** 2026-11-07  
**Branch:** `integration/perpay-platform`  
**Target:** Local Execution on Windows 11 & GitHub Collaboration (`https://github.com/Aditya2377-cmd/ETHGlobal-Repo`)  
**Tagline:** *"Usage-based AI payments. Settled on-chain."*

---

## 1. Existing Folder Structure

The workspace currently consists of:
- `gateway/`: Member 1's FastAPI implementation containing `main.py` with Groq API integration, SSE streaming token counter, escrow ledger, and preliminary x402 header verification.
- `backend/`: Earlier local backend service containing modular FastAPI routers (`api/requests.py`, `api/invoices.py`, `api/history.py`, `api/accounts.py`), pricing engine (`services/pricing_service.py`), Groq provider adapter (`services/groq_service.py`), and budget control (`services/budget_service.py`).
- `x402-service/`: Member 2's TypeScript x402 v2 payment service powered by `@x402/core`, `@x402/express`, and `@x402/hedera`, implementing Hedera Testnet native HBAR payments (`cryptoTransfer`, exact scheme, 1 HBAR = 100,000,000 tinybars), facilitator discovery, mirror node reconciliation, and internal SQLite outbox pattern.
- `src/` & `public/`: Member 3's (Pawan's) completed React + TypeScript + Vite + Tailwind CSS frontend interface adhering strictly to Times New Roman typography, sharp-edged brutalist rectangular layout (`border-radius: 0px !important`), pure white `#FFFFFF` surface palette, official dynamic blue "P" logo, and the My Universe WebGL background.
- `frontend-design/`: Target directory designated to house Pawan's complete frontend workspace as a self-contained module conforming to Part 1 of the integration specification.
- `docs/`: Architectural specifications and integration documentation.

---

## 2. Each Member's Actual Implementation

### Member 1: `gateway/`
- Implemented `gateway/main.py` providing:
  - Groq AI streaming and token accounting (`prompt_tokens`, `completion_tokens`, `total_tokens` via `include_usage: True`).
  - SQLite database `ledger.db` with `usage_events` and `escrow_ledger`.
  - Capped Web3 API key parser (`validate_capped_key`).
  - Budget verification (`check_budget`) returning preliminary HTTP 402 responses.
  - Event log query endpoint `GET /events`.
  - OpenAI-compatible chat completion endpoint `POST /v1/chat/completions`.

### Member 2: `x402-service/`
- Implemented comprehensive TypeScript payment engine:
  - `src/index.ts` Express application setup with error and logging middleware.
  - `src/routes/result.route.ts`: Protected result endpoint `GET /api/v1/generations/:generation_id/result` implementing x402 v2 payment-required challenge and payment-signature unlocking.
  - `src/routes/health.route.ts`: Service and facilitator health checks.
  - `src/routes/internal.route.ts`: Internal payment status queries and manual reconciliation.
  - `src/services/facilitator.service.ts`: Query live `/supported` facilitator endpoint, fee payer discovery (`extra.feePayer`), transaction verification and settlement submission.
  - `src/services/reconciliation.service.ts`: Hedera Mirror Node transaction verification (`GET /api/v1/transactions/{id}`).
  - `src/services/gateway.client.ts`: Authenticated client communicating with Gateway for invoice context (`/internal/v1/generations/{id}/payment-context`), response release (`/internal/v1/generations/{id}/deliver`), and settlement notifications (`/internal/v1/payments/settlement`).
  - `src/db/`: SQLite schema (`db/schema.ts`) and repository (`db/repository.ts`) managing payment states (`PAYMENT_REQUIRED` -> `PAYMENT_SUBMITTED` -> `SETTLED` -> `CONFIRMED`) and outbox queue.
  - `src/client/`: Autonomous CLI payer (`cli-payer.ts`) and Hedera transaction signer (`hedera-signer.ts`).

### Member 3 (Pawan): `frontend-design/` (currently at `src/`)
- Implemented complete user interface:
  - High-performance React 18 with Vite and TypeScript.
  - Custom WebGL starfield canvas background (`PerPayBackground.tsx`, `shaders.ts`).
  - Header with dynamic blue "P" logo, network pill (`Hedera Testnet`), and wallet connector modal (`WalletModal.tsx`).
  - Screen navigation:
    - `HomeScreen.tsx`: Hero section, quick prompt presets, live platform stats, model selector.
    - `WorkspaceScreen.tsx`: AI prompt input, streaming status indicator, token estimation gauge.
    - `InvoiceScreen.tsx`: Dynamic usage breakdown (prompt tokens, completion tokens, USD equivalent, exact tinybar/HBAR conversion), payment QR code, HashScan link, 1-click testnet payer action.
    - `UnlockedResponseScreen.tsx`: Formatted markdown output, copy-to-clipboard, token economics breakdown, settlement confirmation receipt.
    - `ActivityScreen.tsx`: Real-time transaction and usage event history.
    - `SettingsScreen.tsx`: Spending limit caps, API keys, RPC configuration.
    - `PhoneAppPreview.tsx`: Interactive brutalist mobile simulation side-by-side with desktop.
  - Enforced brutalist styling in `styles/globals.css`: Times New Roman font family, sharp rectangular edges across all cards, buttons, badges, and modals, pure white `#FFFFFF` surfaces.

---

## 3. Technology Stack Detected

- **Backend / AI Gateway:** Python 3.12+, FastAPI, Uvicorn, Groq Python SDK, SQLite3, Pydantic v2.
- **Payment Service:** Node.js v24+, TypeScript 5.7, Express 4.21, `@x402/core` 2.30, `@x402/express` 2.30, `@x402/hedera` 2.30, `better-sqlite3` 11.8, Zod 3.24.
- **Frontend:** React 18, Vite 5.4, TypeScript 5.5, Tailwind CSS 3.4, Lucide React, Three.js / WebGL.
- **Blockchain / Settlement:** Hedera Testnet, native HBAR (`0.0.0`), `cryptoTransfer`, 100,000,000 tinybars per HBAR, Hedera Mirror Node REST API.

---

## 4. Framework and Package Versions

| Module | Key Package | Version Detected | Status |
|---|---|---|---|
| Gateway | `fastapi` | 0.162.0 | Installed |
| Gateway | `uvicorn` | 0.54.0 | Installed |
| Gateway | `pydantic` | 2.14.3 | Installed |
| Gateway | `groq` | Required in `requirements.txt` | Missing in global Python (needs pip install) |
| Gateway | `python-dotenv` | Required in `requirements.txt` | Missing in global Python |
| x402-service | `@x402/core` | 2.30.0 | Declared in `package.json` |
| x402-service | `@x402/express` | 2.30.0 | Declared in `package.json` |
| x402-service | `@x402/hedera` | 2.30.0 | Declared in `package.json` |
| x402-service | `better-sqlite3`| 11.8.1 | Declared in `package.json` |
| Frontend | `react` | 18.3.1 | Installed in root `node_modules` |
| Frontend | `vite` | 5.4.2 | Installed in root `node_modules` |
| Frontend | `vitest` | 3.0.5 | Verified (20/20 tests passing) |

---

## 5. API Endpoints Already Implemented

### Gateway / Backend
- `GET /health`: Basic health check.
- `POST /v1/chat/completions`: Member 1's SSE streaming Groq generation with token logging.
- `GET /events`: Member 1's database event query.
- `POST /api/v1/generations` (in `backend/app/api/requests.py`): Generate-first AI endpoint that buffers completion privately and issues unpaid invoice.
- `GET /api/v1/generations/{generation_id}/status`: Poll generation state.
- `GET /api/v1/invoices/{invoice_id}`: Retrieve authoritative invoice and charge breakdown.
- `GET /api/v1/pricing`: Retrieve public model pricing table and tinybar conversion rates.
- `GET /api/v1/accounts/me`: Retrieve user account restrictions and budget limits.
- `GET /api/v1/history`: Retrieve combined generation and settlement history.

### x402-service
- `GET /health`: x402 service and facilitator status.
- `GET /api/v1/generations/:generation_id/result`: x402 pay-to-unlock entry point.
- `GET /internal/v1/payments/:invoice_id`: Payment attempt query.
- `POST /internal/v1/payments/reconcile`: Manual trigger for mirror node reconciliation.

---

## 6. APIs Required But Missing / Incomplete

1. **Gateway Internal Payment Context Endpoint:**  
   `GET /internal/v1/generations/{generation_id}/payment-context`  
   *Required by:* `x402-service/src/services/gateway.client.ts` to obtain trusted invoice parameters (`charge_tinybars`, `user_id`, `model`, `status`).  
   *Current Status:* Partially implemented in `backend/app/api/invoices.py`, needs to be unified inside `gateway/` with header authentication `X-Internal-Secret`.

2. **Gateway Internal Stored Response Release Endpoint:**  
   `GET /internal/v1/generations/{generation_id}/deliver`  
   *Required by:* `x402-service` when payment settles to fetch the buffered AI output.  
   *Current Status:* Implemented as `/api/v1/requests/{id}/response` in `backend/`, needs to expose `/internal/v1/generations/{generation_id}/deliver` protected by `X-Internal-Secret`.

3. **Gateway Internal Settlement Notification Webhook:**  
   `POST /internal/v1/payments/settlement`  
   *Required by:* `x402-service` to signal confirmed Hedera settlement to unlock generation and record transaction details.  
   *Current Status:* Needs formal implementation in `gateway/` validating `SettlementNotification` schema.

---

## 7. Database Ownership

To prevent SQLite lock contention and conflicting writes across processes:
- **`gateway/` owns `gateway_ledger.db`:**
  - `users`: User identity, spending caps, active lock flag.
  - `generations`: `generation_id`, `prompt`, `model`, `status` (`BUFFERED_UNPAID`, `UNLOCKED`), `encrypted_content`, `prompt_tokens`, `completion_tokens`, `total_tokens`.
  - `invoices`: `invoice_id`, `generation_id`, `user_id`, `charge_tinybars`, `charge_hbar`, `status` (`UNPAID`, `PAID`, `EXPIRED`), `expires_at`.
  - `usage_events`: Token usage log and pricing ledger.
- **`x402-service/` owns `x402_payments.db`:**
  - `payment_attempts`: `payment_id`, `invoice_id`, `generation_id`, `status`, `payer_account`, `receiver_account`, `amount_tinybars`, `transaction_id`.
  - `settlement_receipts`: Settled on-chain transactions with mirror node consensus timestamps.
  - `outbox`: Guaranteed delivery queue for notifying Gateway of settlement events.

---

## 8. Shared Data Structures

The authoritative schemas defined in `x402-service/x402/schemas/` will govern all communications:
1. `TrustedInvoiceContext`: (`invoice_id`, `generation_id`, `user_id`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `charge_tinybars`, `charge_hbar`, `model`, `status`, `created_at`, `expires_at`).
2. `PerPaySharedEvent`: Version `2.0.0` event contract matching `shared-event.json`.
3. `SettlementNotification`: (`invoice_id`, `generation_id`, `transaction_id`, `payer_account_id`, `receiver_account_id`, `amount_tinybars`, `network`, `confirmed_at`, `transaction_url`).

---

## 9. Dependencies & Environment Configuration

### Gateway (`gateway/.env`)
```env
PORT=8000
GROQ_API_KEY=gsk_your_groq_key_here
SQLITE_DB=gateway_ledger.db
INTERNAL_SERVICE_SECRET=perpay-internal-secret-2026
HEDERA_NETWORK=testnet
HEDERA_RECEIVER_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
```

### x402-service (`x402-service/.env`)
```env
PORT=4020
NODE_ENV=development
FASTAPI_GATEWAY_URL=http://localhost:8000
INTERNAL_SERVICE_SECRET=perpay-internal-secret-2026
HEDERA_NETWORK=testnet
HEDERA_RECEIVER_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
FACILITATOR_URL=https://x402.org/facilitator
HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
SQLITE_DB_PATH=x402_payments.db
MAX_PAYMENT_TIMEOUT_SECONDS=60
```

### Frontend (`frontend-design/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_X402_SERVICE_URL=http://localhost:4020
VITE_HEDERA_NETWORK=testnet
VITE_TREASURY_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
```

---

## 10. Incompatible Implementations & Resolutions

| Issue | Details | Resolution |
|---|---|---|
| **Streaming vs Pay-to-Unlock** | Member 1's `gateway/main.py` streamed Groq deltas directly to the user before payment was settled. | As mandated by Part 2, 5 & 22: AI completion must be generated and privately buffered on the backend first. Actual token counts are captured, the exact invoice is generated, and response content is released ONLY after Hedera settlement confirmation. |
| **HBAR Tinybar Units** | `gateway/main.py` referenced `cost_wei` and Ethereum terminology. | Replaced with native Hedera standard: 1 HBAR = 100,000,000 tinybars. Decimal-safe integer arithmetic enforced. |
| **Header Names** | Legacy code referenced `X-Payment-TxId`. | Aligned strictly with x402 v2: `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE`. |
| **CORS & Multi-Port Localhost** | Gateway on `:8000`, x402-service on `:4020`, Frontend on `:3000`. | Configured comprehensive CORS headers exposing `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE` and allowing `PAYMENT-SIGNATURE`. |

---

## 11. Potential Security Problems & Mitigations

1. **No Front-Running / Response Leakage:** Stored responses in Gateway are keyed by `generation_id` and hashed `user_id`. Never delivered without verified settlement webhook from x402-service authenticated via `X-Internal-Secret`.
2. **Replay Protection:** `x402-service` maintains unique indexes on `transaction_id`. A single transaction ID cannot be reused for multiple invoices or generations.
3. **Account Spending Locks:** A user with an unpaid generation cannot initiate another generation request until the invoice is paid or expires.
4. **Non-Custodial Keys:** Frontend never stores or transmits customer private keys.
5. **Safe Logging:** Private keys, auth tokens, and raw AI completion bodies are filtered from logs.

---

## 12. Integration Plan & Execution Steps

1. **Unify `gateway/`:** Merge modular capabilities from `backend/` into `gateway/`, adding internal routes (`/internal/v1/generations/{id}/payment-context`, `/deliver`, `/payments/settlement`), token accounting, and user locks.
2. **Setup `frontend-design/`:** Mirror and link Pawan's frontend into `frontend-design/` with zero visual changes (preserving Times New Roman, brutalist rectangles, and My Universe background).
3. **Install & Verify `x402-service`:** Install node dependencies in `x402-service/`, build TypeScript, and verify x402 v2 Hedera test suite.
4. **Install Python Requirements:** Install missing Python packages (`groq`, `python-dotenv`, `requests`) in the Python environment.
5. **Implement One-Command Scripts:** Create `scripts/dev.ps1` and `scripts/stop.ps1` for Windows 11.
6. **Run Full Integration Verification:** Test the complete 24-step generate -> 402 challenge -> sign -> settle -> unlock journey.
7. **Generate Final Engineering Report:** Document all criteria labels and handoff instructions.

