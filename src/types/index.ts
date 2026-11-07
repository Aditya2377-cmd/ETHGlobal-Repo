/**
 * PERPAY — Core TypeScript Definitions & Shared API Contracts
 * Strictly complies with x402 v2 on Hedera Testnet, FastAPI Groq Gateway, and shared event schema.
 */

export type GenerationStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'GENERATED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'DELIVERED'
  | 'GENERATION_FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus =
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_SUBMITTED'
  | 'VERIFYING'
  | 'SETTLING'
  | 'SETTLEMENT_PENDING'
  | 'RECONCILIATION_REQUIRED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

export interface AIModel {
  id: string;
  name: string;
  provider: 'Groq';
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  tinybarsPer1kInput: number;
  tinybarsPer1kOutput: number;
  hbarRatePer1mInput: number;
  hbarRatePer1mOutput: number;
}

export interface x402Requirement {
  version: '2.0';
  scheme: 'exact';
  network: 'hedera:testnet';
  asset: '0.0.0'; // HBAR native crypto
  transferMethod: 'cryptoTransfer';
  amountTinybars: number;
  amountHbar: number;
  recipientAccount: string;
  invoiceId: string;
  generationId: string;
  expiresAt: string;
}

export interface Invoice {
  invoice_id: string;
  generation_id: string;
  request_id: string;
  user_id: string;
  model: string;
  prompt_snippet: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  input_charge_hbar: number;
  output_charge_hbar: number;
  charge_tinybars: number;
  charge_hbar: number;
  network: 'hedera:testnet';
  receiving_account: string;
  status: GenerationStatus;
  payment_status: PaymentStatus;
  transaction_id?: string;
  transaction_url?: string;
  created_at: string;
  expires_at: string;
  x402_details?: x402Requirement;
}

export interface GenerationRequest {
  model: string;
  prompt: string;
  max_output_tokens?: number;
  temperature?: number;
}

export interface GenerationProgressState {
  generation_id: string;
  status: GenerationStatus;
  stage_message: string;
  step_number: number;
  total_steps: number;
  elapsed_ms: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  invoice_id?: string;
  error?: string;
}

export interface PaymentSettlementResult {
  invoice_id: string;
  generation_id: string;
  transaction_id: string;
  transaction_url: string;
  payer_account: string;
  recipient_account: string;
  tinybars: number;
  hbar: number;
  consensus_timestamp: string;
  payment_status: 'CONFIRMED' | 'FAILED';
  error?: string;
}

export interface UnlockedAIResponse {
  generation_id: string;
  invoice_id: string;
  request_id: string;
  model: string;
  prompt: string;
  response_text: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  charge_tinybars: number;
  charge_hbar: number;
  transaction_id: string;
  transaction_url: string;
  settled_at: string;
}

export interface TransactionRecord {
  event_id: string;
  request_id: string;
  invoice_id: string;
  generation_id: string;
  timestamp: string;
  user_id: string;
  wallet: string;
  model: string;
  prompt_snippet: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  charge_tinybars: number;
  charge_hbar: number;
  network: string;
  payment_status: PaymentStatus;
  transaction_id: string;
  transaction_url: string;
  delivery_status: 'DELIVERED' | 'PENDING' | 'FAILED';
}

export interface UserAccount {
  user_id: string;
  connected_wallet: string | null;
  wallet_type?: 'HashPack' | 'Blade' | 'HederaTestnetDirect';
  testnet_balance_hbar: number;
  testnet_balance_tinybars: number;
  has_unpaid_invoice: boolean;
  unpaid_invoice_id: string | null;
  unpaid_generation_id: string | null;
  total_requests: number;
  total_tokens_consumed: number;
  total_hbar_spent: number;
  last_debit_hbar?: number;
  last_debit_tinybars?: number;
  last_debit_tx?: string;
  last_debit_time?: string;
}

export type ActiveScreen =
  | 'home'
  | 'workspace'
  | 'generation_progress'
  | 'invoice'
  | 'unlocked_response'
  | 'activity'
  | 'settings';

