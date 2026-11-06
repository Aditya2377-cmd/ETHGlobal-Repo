export type PaymentState =
  | "PAYMENT_REQUIRED"
  | "PAYMENT_SUBMITTED"
  | "VERIFYING"
  | "SETTLING"
  | "SETTLEMENT_PENDING"
  | "RECONCILIATION_REQUIRED"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED";

export type DeliveryStatus =
  | "AWAITING_PAYMENT"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "EXPIRED";

export interface TrustedInvoiceContext {
  invoice_id: string;
  generation_id: string;
  request_id: string;
  user_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  charge_tinybars: number;
  charge_hbar: string;
  model: string;
  status: "UNPAID" | "PAID" | "EXPIRED" | "CANCELLED";
  created_at: string;
  expires_at: string;
}

export interface PaymentRequirementDoc {
  x402Version: 2;
  accepts: Array<{
    scheme: "exact";
    network: "hedera:testnet";
    asset: "0.0.0";
    amount: string; // tinybars
    payTo: string;  // receiver account 0.0.x
    maxTimeoutSeconds: number;
    extra: {
      feePayer: string;
      assetTransferMethod?: string;
    };
  }>;
  resource: {
    url: string;
    description: string;
    mimeType?: string;
  };
  error?: string;
}

export interface PaymentPayloadDoc {
  x402Version: 2;
  scheme: "exact";
  network: "hedera:testnet";
  payload: {
    transaction: string; // base64 encoded signed TransferTransaction
    payer?: string;
  };
}

export interface PaymentAttemptRecord {
  payment_id: string;
  invoice_id: string;
  generation_id: string;
  payload_digest: string;
  raw_payload: string;
  state: PaymentState;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRecord {
  transaction_id: string;
  invoice_id: string;
  generation_id: string;
  payer_account: string;
  receiver_account: string;
  amount_tinybars: number;
  consensus_timestamp: string;
  mirror_status: string;
  hashscan_url: string;
  confirmed_at: string;
}

export interface OutboxEventRecord {
  event_id: string;
  event_type: string;
  payload: string;
  status: "PENDING" | "SENT" | "FAILED";
  retry_count: number;
  next_attempt_at: string;
  last_error?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export interface SharedPaymentEvent {
  schema_version: "2.0.0";
  event_id: string;
  timestamp: string;
  request_id: string;
  invoice_id: string;
  generation_id: string;
  user_id: string;
  wallet: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  charge_tinybars: number;
  charge_hbar: string;
  network: "hedera:testnet";
  payment_scheme: "exact";
  payment_status: PaymentState;
  transaction_id: string | null;
  transaction_url: string | null;
  delivery_status: DeliveryStatus;
}

export interface FacilitatorSupportedKind {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: {
    feePayer?: string;
    assetTransferMethods?: string[];
    [key: string]: unknown;
  };
}

export interface FacilitatorSupportedResponse {
  kinds: FacilitatorSupportedKind[];
  signers?: Record<string, string[]>;
  extensions?: string[];
}
