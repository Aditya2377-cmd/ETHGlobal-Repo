import {
  HASHSCAN_TESTNET_BASE_URL,
  MAX_RECONCILIATION_ATTEMPTS,
  RECONCILIATION_DELAY_MS,
} from "../constants";

export interface HederaTransferItem {
  account: string;
  amount: number;
  is_approval?: boolean;
}

export interface HederaTransactionResponse {
  transactions?: Array<{
    result: string;
    consensus_timestamp: string;
    transaction_id: string;
    name: string;
    transfers: HederaTransferItem[];
    charged_tx_fee?: number;
  }>;
}

export interface ReconciliationResult {
  isConfirmed: boolean;
  transactionId: string;
  consensusTimestamp: string;
  payerAccount: string;
  receiverAccount: string;
  amountTinybars: number;
  mirrorStatus: string;
  hashscanUrl: string;
  errorMessage?: string;
}

export class ReconciliationService {
  constructor(private readonly mirrorNodeBaseUrl: string) {}

  /**
   * Normalizes Hedera transaction ID to canonical Mirror Node / HashScan format.
   * e.g., "0.0.123@1700000000.123456789" -> "0.0.123-1700000000-123456789"
   */
  public normalizeTransactionId(rawId: string): string {
    const trimmed = rawId.trim();
    if (trimmed.includes("@")) {
      const [account, timePart] = trimmed.split("@");
      const [seconds, nanos] = (timePart || "").split(".");
      return `${account}-${seconds}-${nanos}`;
    }
    return trimmed;
  }

  /**
   * Formats a canonical HashScan URL for Hedera Testnet.
   * Never fabricates 0x EVM hashes.
   */
  public getHashScanUrl(transactionId: string): string {
    const normalized = this.normalizeTransactionId(transactionId);
    return `${HASHSCAN_TESTNET_BASE_URL}/${normalized}`;
  }

  /**
   * Queries Hedera Mirror Node with bounded retries to handle indexing delay.
   */
  public async reconcileOnChain(
    rawTransactionId: string,
    expectedReceiver: string,
    expectedTinybars: number,
    expectedPayer?: string
  ): Promise<ReconciliationResult> {
    const normalizedTxId = this.normalizeTransactionId(rawTransactionId);
    const hashscanUrl = this.getHashScanUrl(normalizedTxId);

    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RECONCILIATION_ATTEMPTS; attempt++) {
      try {
        const url = `${this.mirrorNodeBaseUrl.replace(/\/+$/, "")}/api/v1/transactions/${normalizedTxId}`;
        const resp = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });

        if (resp.status === 404) {
          lastError = `Transaction ${normalizedTxId} not yet indexed on Mirror Node (attempt ${attempt}/${MAX_RECONCILIATION_ATTEMPTS})`;
          if (attempt < MAX_RECONCILIATION_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, RECONCILIATION_DELAY_MS));
            continue;
          }
          break;
        }

        if (!resp.ok) {
          lastError = `Mirror node returned HTTP ${resp.status}`;
          break;
        }

        const data = (await resp.json()) as HederaTransactionResponse;
        const tx = data.transactions && data.transactions[0];

        if (!tx) {
          lastError = "Mirror Node returned empty transactions list";
          break;
        }

        if (tx.result !== "SUCCESS") {
          return {
            isConfirmed: false,
            transactionId: normalizedTxId,
            consensusTimestamp: tx.consensus_timestamp || "",
            payerAccount: expectedPayer || "",
            receiverAccount: expectedReceiver,
            amountTinybars: expectedTinybars,
            mirrorStatus: tx.result,
            hashscanUrl,
            errorMessage: `On-chain transaction execution failed with status: ${tx.result}`,
          };
        }

        // Verify transfers list
        const transfers = tx.transfers || [];
        const receiverCredit = transfers.find(
          (t) => t.account === expectedReceiver && t.amount === expectedTinybars
        );

        if (!receiverCredit) {
          return {
            isConfirmed: false,
            transactionId: normalizedTxId,
            consensusTimestamp: tx.consensus_timestamp,
            payerAccount: expectedPayer || "",
            receiverAccount: expectedReceiver,
            amountTinybars: expectedTinybars,
            mirrorStatus: tx.result,
            hashscanUrl,
            errorMessage: `Hedera transfers list missing expected credit of ${expectedTinybars} tinybars to receiver ${expectedReceiver}`,
          };
        }

        const payerDebit = transfers.find((t) =>
          expectedPayer
            ? t.account === expectedPayer && t.amount === -expectedTinybars
            : t.amount === -expectedTinybars
        );

        if (!payerDebit) {
          return {
            isConfirmed: false,
            transactionId: normalizedTxId,
            consensusTimestamp: tx.consensus_timestamp,
            payerAccount: expectedPayer || "",
            receiverAccount: expectedReceiver,
            amountTinybars: expectedTinybars,
            mirrorStatus: tx.result,
            hashscanUrl,
            errorMessage: `Hedera transfers list missing debit of ${expectedTinybars} tinybars from payer`,
          };
        }

        return {
          isConfirmed: true,
          transactionId: normalizedTxId,
          consensusTimestamp: tx.consensus_timestamp,
          payerAccount: payerDebit.account,
          receiverAccount: receiverCredit.account,
          amountTinybars: receiverCredit.amount,
          mirrorStatus: tx.result,
          hashscanUrl,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_RECONCILIATION_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RECONCILIATION_DELAY_MS));
        }
      }
    }

    return {
      isConfirmed: false,
      transactionId: normalizedTxId,
      consensusTimestamp: "",
      payerAccount: expectedPayer || "",
      receiverAccount: expectedReceiver,
      amountTinybars: expectedTinybars,
      mirrorStatus: "INDEXING_TIMEOUT",
      hashscanUrl,
      errorMessage: `Reconciliation delayed: ${lastError}`,
    };
  }
}
