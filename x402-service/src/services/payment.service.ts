import crypto from "crypto";
import {
  HEDERA_NATIVE_ASSET,
  HEDERA_TESTNET_CAIP2,
  SCHEME_EXACT,
  X402_VERSION,
} from "../constants";
import { PaymentRepository } from "../db/repository";
import {
  PaymentPayloadDoc,
  PaymentRequirementDoc,
  SettlementRecord,
  SharedPaymentEvent,
  TrustedInvoiceContext,
} from "../types";
import { FacilitatorService } from "./facilitator.service";
import { GatewayClient } from "./gateway.client";
import { ReconciliationService } from "./reconciliation.service";
import { PaymentStateMachine } from "./state-machine.service";

export interface PayToUnlockResult {
  statusCode: 200 | 400 | 402 | 403 | 404 | 500;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  responseUnlocked: boolean;
}

export class PaymentService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly facilitatorService: FacilitatorService,
    private readonly reconciliationService: ReconciliationService,
    private readonly gatewayClient: GatewayClient,
    private readonly receiverAccountId: string,
    private readonly maxTimeoutSeconds: number
  ) {}

  /**
   * Builds x402 v2 payment requirements document for an invoice.
   */
  public async buildPaymentRequirements(
    invoice: TrustedInvoiceContext,
    resourceUrl: string
  ): Promise<PaymentRequirementDoc> {
    const supported = await this.facilitatorService.getSupported();
    const feePayer = supported.feePayer;

    return {
      x402Version: X402_VERSION,
      accepts: [
        {
          scheme: SCHEME_EXACT,
          network: HEDERA_TESTNET_CAIP2,
          asset: HEDERA_NATIVE_ASSET,
          amount: invoice.charge_tinybars.toString(),
          payTo: this.receiverAccountId,
          maxTimeoutSeconds: this.maxTimeoutSeconds,
          extra: {
            feePayer,
            assetTransferMethod: "cryptoTransfer",
          },
        },
      ],
      resource: {
        url: resourceUrl,
        description: `PerPay AI Generation (${invoice.model}, ${invoice.total_tokens} tokens)`,
      },
    };
  }

  /**
   * Evaluates or executes the Pay-to-Unlock flow for a generation result.
   */
  public async handlePayToUnlock(
    generationId: string,
    resourceUrl: string,
    paymentSignatureHeader?: string,
    authenticatedUserId?: string
  ): Promise<PayToUnlockResult> {
    // 1. Check if generation has already been settled and confirmed in durable local DB
    const existingSettlement = this.repo.getSettlementByGenerationId(generationId);
    if (existingSettlement) {
      // Already paid: unlock stored response without requiring another payment
      const storedContent = await this.gatewayClient.fetchStoredResponse(generationId);
      return {
        statusCode: 200,
        headers: {
          "Cache-Control": "private, no-cache",
        },
        body: {
          generation_id: generationId,
          content: storedContent?.content || "(Response already unlocked)",
          model: storedContent?.model,
          total_tokens: storedContent?.total_tokens,
          settlement: {
            transaction_id: existingSettlement.transaction_id,
            transaction_url: existingSettlement.hashscan_url,
            amount_tinybars: existingSettlement.amount_tinybars,
            confirmed_at: existingSettlement.confirmed_at,
          },
        },
        responseUnlocked: true,
      };
    }

    // 2. Fetch authoritative invoice context from FastAPI
    let invoice = this.repo.getInvoiceByGenerationId(generationId);
    if (!invoice) {
      invoice = await this.gatewayClient.fetchInvoiceContext(generationId);
      if (invoice) {
        this.repo.saveInvoice(invoice);
      }
    }

    if (!invoice) {
      return {
        statusCode: 404,
        headers: {},
        body: { error: `No active invoice found for generation ${generationId}` },
        responseUnlocked: false,
      };
    }

    // Check account-level ownership
    if (authenticatedUserId && invoice.user_id !== authenticatedUserId) {
      return {
        statusCode: 403,
        headers: {},
        body: { error: "User unauthorized to access this generation invoice" },
        responseUnlocked: false,
      };
    }

    // Check invoice expiry
    if (new Date(invoice.expires_at).getTime() < Date.now()) {
      return {
        statusCode: 400,
        headers: {},
        body: {
          error: "Invoice has expired. Please create a new generation request.",
          invoice_id: invoice.invoice_id,
          expires_at: invoice.expires_at,
        },
        responseUnlocked: false,
      };
    }

    // 3. If no PAYMENT-SIGNATURE header provided, issue HTTP 402 challenge
    const requirementDoc = await this.buildPaymentRequirements(invoice, resourceUrl);
    const requirementB64 = Buffer.from(JSON.stringify(requirementDoc)).toString("base64");

    if (!paymentSignatureHeader) {
      return {
        statusCode: 402,
        headers: {
          "PAYMENT-REQUIRED": requirementB64,
          "Content-Type": "application/json",
        },
        body: {
          error: "Payment Required",
          invoice_id: invoice.invoice_id,
          generation_id: invoice.generation_id,
          charge_tinybars: invoice.charge_tinybars,
          charge_hbar: invoice.charge_hbar,
          network: HEDERA_TESTNET_CAIP2,
          payTo: this.receiverAccountId,
          feePayer: requirementDoc.accepts[0].extra.feePayer,
        },
        responseUnlocked: false,
      };
    }

    // 4. Decode and validate PAYMENT-SIGNATURE payload
    let payloadDoc: PaymentPayloadDoc;
    try {
      const decodedJson = Buffer.from(paymentSignatureHeader, "base64").toString("utf-8");
      payloadDoc = JSON.parse(decodedJson);
    } catch {
      return {
        statusCode: 400,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: { error: "Invalid PAYMENT-SIGNATURE header: failed to decode base64 JSON" },
        responseUnlocked: false,
      };
    }

    if (
      payloadDoc.x402Version !== X402_VERSION ||
      payloadDoc.scheme !== SCHEME_EXACT ||
      payloadDoc.network !== HEDERA_TESTNET_CAIP2 ||
      !payloadDoc.payload?.transaction
    ) {
      return {
        statusCode: 400,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: {
          error: "Unsupported x402 payment signature format or network",
          expected: {
            x402Version: 2,
            scheme: "exact",
            network: HEDERA_TESTNET_CAIP2,
          },
        },
        responseUnlocked: false,
      };
    }

    // 5. Replay and Idempotency Check using payload digest
    const digest = crypto
      .createHash("sha256")
      .update(payloadDoc.payload.transaction)
      .digest("hex");

    const paymentId = crypto.randomUUID();
    this.repo.recordPaymentAttempt({
      payment_id: paymentId,
      invoice_id: invoice.invoice_id,
      generation_id: invoice.generation_id,
      payload_digest: digest,
      raw_payload: JSON.stringify(payloadDoc),
      state: "PAYMENT_SUBMITTED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    PaymentStateMachine.assertValidTransition("PAYMENT_REQUIRED", "PAYMENT_SUBMITTED");

    // 6. Verification with Facilitator
    PaymentStateMachine.assertValidTransition("PAYMENT_SUBMITTED", "VERIFYING");
    this.repo.updatePaymentAttemptState(paymentId, "VERIFYING");

    const reqAccept = requirementDoc.accepts[0];
    const verifyResult = await this.facilitatorService.verifyPayment(payloadDoc, reqAccept);
    if (!verifyResult.isValid) {
      this.repo.updatePaymentAttemptState(paymentId, "FAILED", verifyResult.invalidReason);
      return {
        statusCode: 402,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: {
          error: "Payment verification failed",
          reason: verifyResult.invalidReason,
        },
        responseUnlocked: false,
      };
    }

    // 7. Settlement with Facilitator
    PaymentStateMachine.assertValidTransition("VERIFYING", "SETTLING");
    this.repo.updatePaymentAttemptState(paymentId, "SETTLING");

    const settleResult = await this.facilitatorService.settlePayment(payloadDoc, reqAccept);
    if (!settleResult.success || !settleResult.transactionId) {
      this.repo.updatePaymentAttemptState(paymentId, "FAILED", settleResult.error);
      return {
        statusCode: 402,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: {
          error: "Payment settlement failed",
          reason: settleResult.error,
        },
        responseUnlocked: false,
      };
    }

    const txId = settleResult.transactionId;

    // Check duplicate transaction: prevent one transaction from paying two different invoices
    const existingTx = this.repo.getSettlementByTransactionId(txId);
    if (existingTx && existingTx.invoice_id !== invoice.invoice_id) {
      this.repo.updatePaymentAttemptState(
        paymentId,
        "FAILED",
        `Transaction ${txId} has already been applied to another invoice ${existingTx.invoice_id}`
      );
      return {
        statusCode: 400,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: { error: "Duplicate transaction rejected. Transaction already redeemed." },
        responseUnlocked: false,
      };
    }

    // 8. Independent On-Chain Reconciliation via Hedera Mirror Node
    PaymentStateMachine.assertValidTransition("SETTLING", "RECONCILIATION_REQUIRED");
    this.repo.updatePaymentAttemptState(paymentId, "RECONCILIATION_REQUIRED");

    const recon = await this.reconciliationService.reconcileOnChain(
      txId,
      this.receiverAccountId,
      invoice.charge_tinybars,
      payloadDoc.payload.payer
    );

    if (!recon.isConfirmed) {
      // Mirror node delay or indexing timeout: keep in SETTLEMENT_PENDING state
      this.repo.updatePaymentAttemptState(paymentId, "SETTLEMENT_PENDING", recon.errorMessage);
      return {
        statusCode: 402,
        headers: { "PAYMENT-REQUIRED": requirementB64 },
        body: {
          error: "Settlement submitted but pending on-chain confirmation. Please retry in a few moments.",
          transaction_id: txId,
          transaction_url: recon.hashscanUrl,
        },
        responseUnlocked: false,
      };
    }

    // 9. Confirmed Settlement: Atomic DB record & Outbox Event
    PaymentStateMachine.assertValidTransition("RECONCILIATION_REQUIRED", "CONFIRMED");
    const confirmedSettlement: SettlementRecord = {
      transaction_id: recon.transactionId,
      invoice_id: invoice.invoice_id,
      generation_id: invoice.generation_id,
      payer_account: recon.payerAccount,
      receiver_account: recon.receiverAccount,
      amount_tinybars: recon.amountTinybars,
      consensus_timestamp: recon.consensusTimestamp,
      mirror_status: recon.mirrorStatus,
      hashscan_url: recon.hashscanUrl,
      confirmed_at: new Date().toISOString(),
    };

    const sharedEvent: SharedPaymentEvent = {
      schema_version: "2.0.0",
      event_id: crypto.randomUUID(),
      timestamp: confirmedSettlement.confirmed_at,
      request_id: invoice.request_id,
      invoice_id: invoice.invoice_id,
      generation_id: invoice.generation_id,
      user_id: invoice.user_id,
      wallet: recon.payerAccount || null,
      model: invoice.model,
      prompt_tokens: invoice.prompt_tokens,
      completion_tokens: invoice.completion_tokens,
      total_tokens: invoice.total_tokens,
      charge_tinybars: invoice.charge_tinybars,
      charge_hbar: invoice.charge_hbar,
      network: HEDERA_TESTNET_CAIP2,
      payment_scheme: SCHEME_EXACT,
      payment_status: "CONFIRMED",
      transaction_id: recon.transactionId,
      transaction_url: recon.hashscanUrl,
      delivery_status: "DELIVERED",
    };

    this.repo.saveConfirmedSettlement(confirmedSettlement, sharedEvent);
    this.repo.updatePaymentAttemptState(paymentId, "CONFIRMED");

    // Asynchronously notify FastAPI gateway (best effort now; outbox ensures bounded retry)
    this.gatewayClient.notifySettlement(confirmedSettlement).catch(() => {});

    // 10. Fetch stored response and unlock
    const storedResponse = await this.gatewayClient.fetchStoredResponse(invoice.generation_id);

    const paymentResponsePayload = {
      success: true,
      transaction: recon.transactionId,
      transactionUrl: recon.hashscanUrl,
      network: HEDERA_TESTNET_CAIP2,
      amount: invoice.charge_tinybars.toString(),
      payer: recon.payerAccount,
    };
    const paymentResponseHeader = Buffer.from(JSON.stringify(paymentResponsePayload)).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "PAYMENT-RESPONSE": paymentResponseHeader,
        "Cache-Control": "private, no-cache",
      },
      body: {
        generation_id: invoice.generation_id,
        content: storedResponse?.content || "(Response unlocked)",
        model: storedResponse?.model || invoice.model,
        total_tokens: storedResponse?.total_tokens || invoice.total_tokens,
        settlement: {
          transaction_id: recon.transactionId,
          transaction_url: recon.hashscanUrl,
          amount_tinybars: recon.amountTinybars,
          confirmed_at: confirmedSettlement.confirmed_at,
        },
      },
      responseUnlocked: true,
    };
  }
}
