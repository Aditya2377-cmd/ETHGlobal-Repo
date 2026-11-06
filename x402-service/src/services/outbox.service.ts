import { PaymentRepository } from "../db/repository";
import { GatewayClient } from "./gateway.client";
import { SettlementRecord } from "../types";

export class OutboxService {
  private isProcessing = false;

  constructor(
    private readonly repo: PaymentRepository,
    private readonly gatewayClient: GatewayClient
  ) {}

  /**
   * Processes pending outbox events with exponential backoff.
   */
  public async processPendingEvents(limit = 10): Promise<{ processed: number; succeeded: number }> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let succeeded = 0;

    try {
      const pendingEvents = this.repo.getPendingOutboxEvents(limit);
      for (const event of pendingEvents) {
        processed++;
        try {
          const payload = JSON.parse(event.payload);
          const settlementRecord: SettlementRecord = {
            transaction_id: payload.transaction_id,
            invoice_id: payload.invoice_id,
            generation_id: payload.generation_id,
            payer_account: payload.wallet || "",
            receiver_account: "", // enriched by recipient
            amount_tinybars: payload.charge_tinybars,
            consensus_timestamp: payload.timestamp,
            mirror_status: "SUCCESS",
            hashscan_url: payload.transaction_url || "",
            confirmed_at: payload.timestamp,
          };

          const ok = await this.gatewayClient.notifySettlement(settlementRecord);
          if (ok) {
            this.repo.markOutboxEventSent(event.event_id);
            succeeded++;
          } else {
            const nextDelaySec = Math.min(300, Math.pow(3, event.retry_count + 1) * 2);
            const nextAttempt = new Date(Date.now() + nextDelaySec * 1000).toISOString();
            this.repo.markOutboxEventFailed(
              event.event_id,
              "Gateway returned non-200 or network timeout",
              nextAttempt
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const nextAttempt = new Date(Date.now() + 30_000).toISOString();
          this.repo.markOutboxEventFailed(event.event_id, msg, nextAttempt);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, succeeded };
  }
}
