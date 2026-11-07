import type { DatabaseInstance } from "./sqlite";
import {
  OutboxEventRecord,
  PaymentAttemptRecord,
  PaymentState,
  SettlementRecord,
  SharedPaymentEvent,
  TrustedInvoiceContext,
} from "../types";

export class PaymentRepository {
  constructor(private db: DatabaseInstance) {}

  public saveInvoice(invoice: TrustedInvoiceContext): void {
    const stmt = this.db.prepare(`
      INSERT INTO invoices_cache (
        invoice_id, generation_id, request_id, user_id, prompt_tokens,
        completion_tokens, total_tokens, charge_tinybars, charge_hbar,
        model, status, created_at, expires_at
      ) VALUES (
        @invoice_id, @generation_id, @request_id, @user_id, @prompt_tokens,
        @completion_tokens, @total_tokens, @charge_tinybars, @charge_hbar,
        @model, @status, @created_at, @expires_at
      )
      ON CONFLICT(invoice_id) DO UPDATE SET
        status = excluded.status,
        expires_at = excluded.expires_at
    `);
    stmt.run(invoice);
  }

  public getInvoiceByGenerationId(generationId: string): TrustedInvoiceContext | null {
    const stmt = this.db.prepare(`
      SELECT * FROM invoices_cache WHERE generation_id = ?
    `);
    const row = stmt.get(generationId) as TrustedInvoiceContext | undefined;
    return row || null;
  }

  public getInvoiceById(invoiceId: string): TrustedInvoiceContext | null {
    const stmt = this.db.prepare(`
      SELECT * FROM invoices_cache WHERE invoice_id = ?
    `);
    const row = stmt.get(invoiceId) as TrustedInvoiceContext | undefined;
    return row || null;
  }

  public recordPaymentAttempt(attempt: PaymentAttemptRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO payment_attempts (
        payment_id, invoice_id, generation_id, payload_digest,
        raw_payload, state, error_message, created_at, updated_at
      ) VALUES (
        @payment_id, @invoice_id, @generation_id, @payload_digest,
        @raw_payload, @state, @error_message, @created_at, @updated_at
      )
    `);
    stmt.run({
      ...attempt,
      error_message: attempt.error_message ?? null,
    });
  }

  public updatePaymentAttemptState(
    paymentId: string,
    state: PaymentState,
    errorMessage?: string | null
  ): void {
    const stmt = this.db.prepare(`
      UPDATE payment_attempts
      SET state = ?, error_message = ?, updated_at = ?
      WHERE payment_id = ?
    `);
    stmt.run(state, errorMessage || null, new Date().toISOString(), paymentId);
  }

  public getPaymentAttemptByDigest(digest: string): PaymentAttemptRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM payment_attempts WHERE payload_digest = ? ORDER BY created_at DESC LIMIT 1
    `);
    const row = stmt.get(digest) as PaymentAttemptRecord | undefined;
    return row || null;
  }

  public getSettlementByInvoiceId(invoiceId: string): SettlementRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM settlement_records WHERE invoice_id = ?
    `);
    const row = stmt.get(invoiceId) as SettlementRecord | undefined;
    return row || null;
  }

  public getSettlementByGenerationId(generationId: string): SettlementRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM settlement_records WHERE generation_id = ?
    `);
    const row = stmt.get(generationId) as SettlementRecord | undefined;
    return row || null;
  }

  public getSettlementByTransactionId(txId: string): SettlementRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM settlement_records WHERE transaction_id = ?
    `);
    const row = stmt.get(txId) as SettlementRecord | undefined;
    return row || null;
  }

  /**
   * Atomically records a confirmed settlement, updates invoice cache to PAID,
   * and enqueues an event in the outbox.
   */
  public saveConfirmedSettlement(
    settlement: SettlementRecord,
    outboxEventPayload: SharedPaymentEvent
  ): void {
    const insertSettlementStmt = this.db.prepare(`
      INSERT INTO settlement_records (
        transaction_id, invoice_id, generation_id, payer_account,
        receiver_account, amount_tinybars, consensus_timestamp,
        mirror_status, hashscan_url, confirmed_at
      ) VALUES (
        @transaction_id, @invoice_id, @generation_id, @payer_account,
        @receiver_account, @amount_tinybars, @consensus_timestamp,
        @mirror_status, @hashscan_url, @confirmed_at
      )
      ON CONFLICT(invoice_id) DO NOTHING
    `);

    const updateInvoiceStmt = this.db.prepare(`
      UPDATE invoices_cache SET status = 'PAID' WHERE invoice_id = ?
    `);

    const insertOutboxStmt = this.db.prepare(`
      INSERT INTO outbox_events (
        event_id, event_type, payload, status, retry_count,
        next_attempt_at, created_at
      ) VALUES (?, ?, ?, 'PENDING', 0, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      insertSettlementStmt.run({
        ...settlement,
        payer_account: settlement.payer_account || "",
        hashscan_url: settlement.hashscan_url || "",
      });
      updateInvoiceStmt.run(settlement.invoice_id);
      const now = new Date().toISOString();
      insertOutboxStmt.run(
        outboxEventPayload.event_id,
        "payment.confirmed",
        JSON.stringify(outboxEventPayload),
        now,
        now
      );
    });

    tx();
  }

  public getPendingOutboxEvents(limit = 10): OutboxEventRecord[] {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM outbox_events
      WHERE status = 'PENDING' AND next_attempt_at <= ?
      ORDER BY next_attempt_at ASC
      LIMIT ?
    `);
    return stmt.all(now, limit) as unknown as OutboxEventRecord[];
  }

  public markOutboxEventSent(eventId: string): void {
    const stmt = this.db.prepare(`
      UPDATE outbox_events
      SET status = 'SENT', sent_at = ?
      WHERE event_id = ?
    `);
    stmt.run(new Date().toISOString(), eventId);
  }

  public markOutboxEventFailed(eventId: string, error: string, nextAttemptAt: string): void {
    const stmt = this.db.prepare(`
      UPDATE outbox_events
      SET status = CASE WHEN retry_count >= 5 THEN 'FAILED' ELSE 'PENDING' END,
          retry_count = retry_count + 1,
          last_error = ?,
          next_attempt_at = ?
      WHERE event_id = ?
    `);
    stmt.run(error, nextAttemptAt, eventId);
  }
}
