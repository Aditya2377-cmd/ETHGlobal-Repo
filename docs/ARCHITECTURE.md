# PerPay Architecture Specification

## Overview
**PerPay** is a usage-based AI payment gateway settled on-chain via the Hedera Testnet and x402 v2 payment requirements protocol.

### Core Problem Solved
Traditional AI billing forces users into flat monthly subscriptions or upfront deposits because token consumption varies dynamically based on reasoning depth and prompt complexity. PerPay implements a **generate-first, exact-usage-accounting, x402-gated, pay-to-unlock** pattern:
1. Groq processes and streams completion on the secure server.
2. Actual prompt, completion, and total tokens are measured deterministically.
3. Pricing engine calculates the exact tinybar charge (1 HBAR = 100,000,000 tinybars).
4. The generated response is encrypted/buffered in private gateway storage.
5. An invoice is issued and presented to the user.
6. The client or autonomous agent accesses the protected result endpoint on the x402 service.
7. The x402 service issues an HTTP 402 challenge (`PAYMENT-REQUIRED`).
8. The client signs a native Hedera `cryptoTransfer` transaction for the exact tinybar amount to the seller treasury.
9. The transaction is verified and settled via the x402 facilitator and Hedera Mirror Node.
10. The gateway is notified via an authenticated internal webhook (`POST /internal/v1/payments/settlement`).
11. The stored AI response is unlocked and delivered with an on-chain receipt linking directly to HashScan.

---

## Service Responsibilities & Authority

### 1. `gateway/` (FastAPI Engine)
- Authoritative for:
  - User identity, rate limiting, and single-unpaid-invoice locks.
  - Groq API communication and token usage accounting.
  - Deterministic pricing snapshot generation and invoice persistence.
  - Private storage of generated AI responses until verified settlement.
  - Exposing internal endpoints (`/internal/v1/generations/{id}/payment-context`, `/internal/v1/generations/{id}/deliver`, `/internal/v1/payments/settlement`).

### 2. `x402-service/` (Node.js/TypeScript Engine)
- Authoritative for:
  - x402 v2 protocol implementation (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`).
  - Facilitator capability verification (`/supported`, `extra.feePayer`).
  - Hedera Testnet native HBAR settlement (`0.0.0`, `cryptoTransfer`).
  - Hedera Mirror Node transaction verification and reconciliation.
  - Replay prevention and idempotent outbox event propagation.

### 3. `frontend-design/` (React 18 + TypeScript + Vite)
- Responsible for:
  - Pure white `#FFFFFF` surface theme with high-contrast `#0F172A` typography.
  - Times New Roman font family globally enforced.
  - Sharp brutalist rectangles (`border-radius: 0px !important`).
  - My Universe WebGL starfield interactive background.
  - Real-time token consumption visualization and invoice presentation.
  - Non-custodial wallet signing and 1-click testnet payer action.
  - Dual desktop and mobile app preview.

