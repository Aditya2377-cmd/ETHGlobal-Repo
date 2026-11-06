# Security & Threat Model Specification — PerPay Hedera x402 Payment Service

## 1. Threat Model & Mitigations

| Threat | Attack Vector | Mitigation in PerPay Payment Service |
|---|---|---|
| **Forged Payment Confirmation** | Attacker crafts fake 200 responses or claims payment succeeded without on-chain proof. | The payment service never unlocks content based on frontend claims. Every settlement is independently reconciled against the Hedera Mirror Node (`/api/v1/transactions/{id}`). |
| **Unsigned / Invalid Signature** | Client submits unsigned transaction bytes or bytes signed with an unauthorized key. | Facilitator `/verify` checks cryptographic signature against on-chain payer account key; rejected with HTTP 402 if invalid. |
| **Altered Transaction Body** | Attacker modifies frozen transaction parameters (receiver, amount) after signing. | Hedera SDK cryptographic signatures cover the frozen transaction body bytes. Any alteration invalidates the signature at facilitator and consensus node. |
| **Mainnet Accidental Config** | Misconfigured environment attempts to process mainnet funds on a testnet build. | Fail-closed network validator in `src/config.ts` rejects any network identifier matching `hedera:mainnet` or mirror nodes referencing mainnet. |
| **Asset Substitution** | Attacker submits HTS token transfers (e.g. worthless test tokens) instead of native HBAR. | Scheme validation strictly checks `asset === "0.0.0"`. Mirror node reconciliation verifies the transfer exists in `transfers` (HBAR) and not `token_transfers`. |
| **Underpayment Attack** | Attacker submits a transaction paying 1 tinybar instead of the required invoice charge. | Independent reconciliation verifies that the credit to the receiver exactly matches `invoice.charge_tinybars`. Any discrepancy fails closed. |
| **Diverted Payment Attack** | Attacker submits a transaction crediting their own wallet or a third party instead of PerPay. | Reconciliation verifies that `transfer.account` strictly equals `HEDERA_RECEIVER_ACCOUNT_ID`. |
| **Transaction Replay Attack** | Attacker copies a previously confirmed transaction ID and presents it to unlock another generation. | `settlement_records` enforces a `UNIQUE` constraint on `transaction_id`. Attempting to associate a redeemed transaction ID with another invoice is rejected with HTTP 400. |
| **Payload Replay / Flooding** | Attacker replays identical signed base64 payloads concurrently. | `payment_attempts` tracks the SHA-256 digest of incoming transaction payloads, and atomic database transactions serialize settlement. |
| **User ID Spoofing** | Attacker tries to unlock an invoice belonging to another user. | `handlePayToUnlock` validates `X-User-Id` against `invoice.user_id` stored in the authoritative record; returns HTTP 403 on mismatch. |
| **Internal Webhook Forgery** | External caller invokes `/internal/v1/*` routes to mark invoices paid. | All internal endpoints are guarded by `requireInternalSecret` requiring the exact `X-Internal-Secret` matching `INTERNAL_SERVICE_SECRET`. |
| **Facilitator Delay or Outage** | Facilitator becomes unreachable or experiences timeouts. | Calls use strict `AbortSignal.timeout` (5-15s). The service fails closed without crashing and keeps the payment attempt in an auditable pending state. |
| **Mirror Node Indexing Delay** | Valid Hedera consensus transaction takes 2-4 seconds to appear on Mirror Node REST API. | Reconciliation uses bounded exponential retry polling (5 attempts with 1.5s delay). If indexing times out, state is marked `SETTLEMENT_PENDING` without losing transaction identity. |
| **Credential / Key Leakage** | Private keys or secrets logged to console or persisted to disk. | `safeLoggingMiddleware` redacts sensitive headers and payloads. Backend operates in non-custodial payer mode: customer signs on client, backend only holds public receiver ID. |

---

## 2. Security Controls Implemented

1. **Non-Custodial Customer Signing**:
   The payment service never holds, receives, or stores payer private keys. All signing happens on the client via `HederaTestnetSigner` or the interactive CLI payer.

2. **Facilitator Fee Sponsoring**:
   The facilitator sponsors network fees using its own advertised `feePayer` (`0.0.9185802`), ensuring customers are debited only for the exact Groq usage amount.

3. **Safe Integer Arithmetic**:
   All amounts are handled in integer tinybars using `BigInt` and safe integer parsers. Floating-point math is banned in settlement logic.

4. **Fail-Closed Pay-to-Unlock Gating**:
   No content bytes are delivered to the client if verification, settlement, or reconciliation fails at any stage.

5. **Transactional Persistence (ACID)**:
   SQLite WAL mode ensures durability and prevents race conditions across concurrent requests.
