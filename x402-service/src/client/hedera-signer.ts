import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TransactionId,
  TransferTransaction,
} from "@x402/hedera";
import { HEDERA_TESTNET_CAIP2, SCHEME_EXACT, X402_VERSION } from "../constants";
import { PaymentPayloadDoc, PaymentRequirementDoc } from "../types";

export interface SignerOptions {
  payerAccountId: string;
  payerPrivateKey: string; // DER or Hex string (never committed or exposed)
}

export class HederaTestnetSigner {
  private readonly payerAccountId: AccountId;
  private readonly payerPrivateKey: PrivateKey;
  private readonly client: Client;

  constructor(options: SignerOptions) {
    if (!options.payerAccountId || !options.payerPrivateKey) {
      throw new Error("HederaTestnetSigner requires payerAccountId and payerPrivateKey");
    }

    this.payerAccountId = AccountId.fromString(options.payerAccountId);
    this.payerPrivateKey = PrivateKey.fromString(options.payerPrivateKey);
    this.client = Client.forTestnet();
  }

  /**
   * Constructs, freezes, and signs an exact cryptoTransfer transaction using the facilitator's feePayer.
   */
  public async createSignedPaymentPayload(
    requirements: PaymentRequirementDoc["accepts"][0]
  ): Promise<PaymentPayloadDoc> {
    if (requirements.network !== HEDERA_TESTNET_CAIP2) {
      throw new Error(`Unsupported network for Hedera Testnet Signer: ${requirements.network}`);
    }

    if (!requirements.extra?.feePayer) {
      throw new Error("Missing mandatory extra.feePayer in payment requirements");
    }

    const feePayerId = AccountId.fromString(requirements.extra.feePayer);
    const receiverId = AccountId.fromString(requirements.payTo);
    const amountTinybars = BigInt(requirements.amount);

    if (amountTinybars <= 0n) {
      throw new Error(`Tinybars amount must be strictly positive: ${amountTinybars}`);
    }

    // Generate transaction ID anchored to the facilitator's fee payer
    const txId = TransactionId.generate(feePayerId);

    // Build cryptoTransfer: Customer account debited, receiver credited
    const transferTx = new TransferTransaction()
      .setTransactionId(txId)
      .addHbarTransfer(this.payerAccountId, Hbar.fromTinybars(-Number(amountTinybars)))
      .addHbarTransfer(receiverId, Hbar.fromTinybars(Number(amountTinybars)))
      .freezeWith(this.client);

    // Customer signs their debit transfer
    const signedTx = await transferTx.sign(this.payerPrivateKey);
    const signedBytesB64 = Buffer.from(signedTx.toBytes()).toString("base64");

    return {
      x402Version: X402_VERSION,
      scheme: SCHEME_EXACT,
      network: HEDERA_TESTNET_CAIP2,
      payload: {
        transaction: signedBytesB64,
        payer: this.payerAccountId.toString(),
      },
    };
  }

  /**
   * Helper to format the payment signature header value directly.
   */
  public async createPaymentSignatureHeader(
    requirements: PaymentRequirementDoc["accepts"][0]
  ): Promise<string> {
    const payloadDoc = await this.createSignedPaymentPayload(requirements);
    return Buffer.from(JSON.stringify(payloadDoc)).toString("base64");
  }

  public close(): void {
    this.client.close();
  }
}
