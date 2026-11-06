# Testing Strategy & Test Suite Guide — PerPay

## 1. Test Architecture Overview

The PerPay test suite is structured into three distinct layers using Vitest:

```
x402-service/tests/
├── unit/
│   ├── amount-converter.test.ts      # Tinybar <-> HBAR conversions, precision safety
│   ├── state-machine.test.ts         # Payment state transitions & terminal states
│   ├── facilitator-parser.test.ts    # Facilitator /supported response parser
│   ├── outbox.test.ts                # Transactional outbox retry & delivery backoff
│   └── internal-auth.test.ts         # Service-to-service internal secret authentication
├── security/
│   ├── replay-protection.test.ts     # Duplicate tx ID fulfillment rejection
│   ├── security-regressions.test.ts  # Network, scheme, asset, user ownership attacks
│   └── concurrency.test.ts           # Concurrent settlement race condition hardening
└── integration/
    ├── pay-to-unlock-flow.test.ts    # 402 challenge -> sign -> verify -> settle -> unlock
    └── delivery-recovery.test.ts     # Re-retrieval of already paid results without charging
```

---

## 2. Running Automated Tests

Run the full suite:
```powershell
npm test
```

Expected result:
```
✓ tests/unit/state-machine.test.ts (7 tests)
✓ tests/unit/facilitator-parser.test.ts (5 tests)
✓ tests/unit/amount-converter.test.ts (12 tests)
✓ tests/unit/outbox.test.ts (2 tests)
✓ tests/security/replay-protection.test.ts (1 test)
✓ tests/security/concurrency.test.ts (1 test)
✓ tests/security/security-regressions.test.ts (5 tests)
✓ tests/unit/internal-auth.test.ts (3 tests)
✓ tests/integration/delivery-recovery.test.ts (1 test)
✓ tests/integration/pay-to-unlock-flow.test.ts (1 test)

Test Files  10 passed (10)
     Tests  38 passed (38)
```

---

## 3. Test Reporting Categories & Matrix

| Component | Status | Details |
|---|---|---|
| **HBAR <-> Tinybar Math** | `IMPLEMENTED AND TESTED` | Zero floating-point drift verified via string split & BigInt arithmetic (12 tests pass). |
| **Payment State Machine** | `IMPLEMENTED AND TESTED` | Strict sequential transitions, failure states, retry from failed, terminal states (7 tests pass). |
| **Facilitator Parser** | `IMPLEMENTED AND TESTED` | Parsing `/supported`, feePayer extraction, account ID validation (5 tests pass). |
| **Transactional Outbox** | `IMPLEMENTED AND TESTED` | In-memory SQLite outbox, delivery to gateway, exponential retry backoff (2 tests pass). |
| **Internal Auth Middleware** | `IMPLEMENTED AND TESTED` | Rejection of unauthorized internal calls, acceptance of matching secret (3 tests pass). |
| **Replay Protection** | `IMPLEMENTED AND TESTED` | Rejecting duplicate transaction ID fulfillment across different invoices (1 test passes). |
| **Concurrency Hardening** | `IMPLEMENTED AND TESTED` | Simultaneous payment submissions cleanly handled via `ON CONFLICT DO NOTHING` (1 test passes). |
| **Security Regressions** | `IMPLEMENTED AND TESTED` | Rejecting mainnet injection, expired invoices, wrong user, invalid signature, wrong amount (5 tests pass). |
| **Pay-to-Unlock Lifecycle** | `IMPLEMENTED AND TESTED` | 402 challenge with `PAYMENT-REQUIRED`, 200 unlock with `PAYMENT-RESPONSE`, zero pre-settlement content leakage (1 test passes). |
| **Delivery Recovery** | `IMPLEMENTED AND TESTED` | Re-requesting paid generation returns 200 immediately without double-billing (1 test passes). |
| **Live Hedera Testnet Execution** | `MANUAL TESTNET VERIFICATION REQUIRED` | Tested via `npm run testnet:smoke`. Requires funded Hedera Testnet credentials. |
| **FastAPI Gateway Integration** | `IMPLEMENTED BUT NOT INTEGRATION-TESTED` | Tested with mocked FastAPI client; live end-to-end integration occurs upon merging Teammate 1's branch. |
| **Pawan Dashboard UI** | `IMPLEMENTED BUT NOT INTEGRATION-TESTED` | Shared event schemas and API contracts prepared; live UI testing occurs upon merging Teammate 2's branch. |
