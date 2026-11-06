import { INTERNAL_SECRET_HEADER } from "../constants";
import { SettlementRecord, TrustedInvoiceContext } from "../types";

export interface StoredResponsePayload {
  generation_id: string;
  content: string;
  model: string;
  total_tokens: number;
}

export class GatewayClient {
  constructor(
    private readonly gatewayBaseUrl: string,
    private readonly internalSecret: string
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      [INTERNAL_SECRET_HEADER]: this.internalSecret,
      "X-Request-Timestamp": new Date().toISOString(),
    };
  }

  /**
   * Fetches trusted invoice context from FastAPI gateway.
   */
  public async fetchInvoiceContext(generationId: string): Promise<TrustedInvoiceContext | null> {
    try {
      const url = `${this.gatewayBaseUrl.replace(/\/+$/, "")}/internal/v1/generations/${generationId}/payment-context`;
      const resp = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (resp.status === 404) {
        return null;
      }

      if (!resp.ok) {
        throw new Error(`Gateway returned HTTP ${resp.status} on payment-context query`);
      }

      const body = (await resp.json()) as TrustedInvoiceContext;
      return body;
    } catch (err: unknown) {
      console.warn(`Gateway payment-context query failed for generation ${generationId}:`, err);
      return null;
    }
  }

  /**
   * Releases previously generated and privately stored Groq AI response from FastAPI.
   */
  public async fetchStoredResponse(generationId: string): Promise<StoredResponsePayload | null> {
    try {
      const url = `${this.gatewayBaseUrl.replace(/\/+$/, "")}/internal/v1/generations/${generationId}/deliver`;
      const resp = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) {
        throw new Error(`Gateway returned HTTP ${resp.status} on deliver query`);
      }

      const body = (await resp.json()) as StoredResponsePayload;
      return body;
    } catch (err: unknown) {
      console.error(`Failed to fetch stored AI response for generation ${generationId}:`, err);
      return null;
    }
  }

  /**
   * Sends confirmed settlement notification to FastAPI gateway.
   */
  public async notifySettlement(settlement: SettlementRecord): Promise<boolean> {
    try {
      const url = `${this.gatewayBaseUrl.replace(/\/+$/, "")}/internal/v1/payments/settlement`;
      const resp = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          invoice_id: settlement.invoice_id,
          generation_id: settlement.generation_id,
          transaction_id: settlement.transaction_id,
          payer_account_id: settlement.payer_account,
          receiver_account_id: settlement.receiver_account,
          amount_tinybars: settlement.amount_tinybars,
          network: "hedera:testnet",
          confirmed_at: settlement.confirmed_at,
          transaction_url: settlement.hashscan_url,
        }),
        signal: AbortSignal.timeout(5000),
      });

      return resp.ok;
    } catch (err: unknown) {
      console.error(`Gateway settlement notification failed:`, err);
      return false;
    }
  }
}
