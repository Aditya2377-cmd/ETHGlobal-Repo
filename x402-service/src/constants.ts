export const TINYBARS_PER_HBAR = 100_000_000n;
export const HEDERA_TESTNET_CAIP2 = "hedera:testnet";
export const HEDERA_NATIVE_ASSET = "0.0.0";
export const SCHEME_EXACT = "exact";
export const X402_VERSION = 2;

// HTTP Header Constants
export const HTTP_HEADER_PAYMENT_REQUIRED = "PAYMENT-REQUIRED";
export const HTTP_HEADER_PAYMENT_SIGNATURE = "PAYMENT-SIGNATURE";
export const HTTP_HEADER_PAYMENT_RESPONSE = "PAYMENT-RESPONSE";
export const INTERNAL_SECRET_HEADER = "x-internal-secret";

// Hedera Defaults & Explorers
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
export const DEFAULT_FACILITATOR_FEE_PAYER = "0.0.9185802";
export const DEFAULT_MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";
export const HASHSCAN_TESTNET_BASE_URL = "https://hashscan.io/testnet/transaction";

// Safety limits
export const MAX_RECONCILIATION_ATTEMPTS = 5;
export const RECONCILIATION_DELAY_MS = 1500;
export const MAX_OUTBOX_RETRIES = 5;
export const DEFAULT_TIMEOUT_SECONDS = 120;
