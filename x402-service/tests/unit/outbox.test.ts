import { describe, expect, it, vi } from "vitest";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { GatewayClient } from "../../src/services/gateway.client";
import { OutboxService } from "../../src/services/outbox.service";
import { SharedPaymentEvent } from "../../src/types";

describe("Transactional Outbox Service", () => {
  it("should process and mark outbox events as sent when gateway succeeds", async () => {
    const db = createInMemoryDatabase();
    const repo = new PaymentRepository(db);

    const mockGateway = new GatewayClient("http://mock-gateway", "secret");
    vi.spyOn(mockGateway, "notifySettlement").mockResolvedValue(true);

    const outboxService = new OutboxService(repo, mockGateway);

    // Save an invoice & confirmed settlement
    repo.saveInvoice({
      invoice_id: "inv_1",
      generation_id: "gen_1",
      request_id: "req_1",
      user_id: "user_1",
      prompt_tokens: 10,
      completion_tokens: 50,
      total_tokens: 60,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "llama-3.3-70b-versatile",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const mockEvent: SharedPaymentEvent = {
      schema_version: "2.0.0",
      event_id: "evt_1",
      timestamp: new Date().toISOString(),
      request_id: "req_1",
      invoice_id: "inv_1",
      generation_id: "gen_1",
      user_id: "user_1",
      wallet: "0.0.12345",
      model: "llama-3.3-70b-versatile",
      prompt_tokens: 10,
      completion_tokens: 50,
      total_tokens: 60,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      network: "hedera:testnet",
      payment_scheme: "exact",
      payment_status: "CONFIRMED",
      transaction_id: "0.0.9185802-1700000000-000000000",
      transaction_url: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-000000000",
      delivery_status: "DELIVERED",
    };

    repo.saveConfirmedSettlement(
      {
        transaction_id: "0.0.9185802-1700000000-000000000",
        invoice_id: "inv_1",
        generation_id: "gen_1",
        payer_account: "0.0.12345",
        receiver_account: "0.0.99999",
        amount_tinybars: 1000,
        consensus_timestamp: "1700000000.000000000",
        mirror_status: "SUCCESS",
        hashscan_url: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-000000000",
        confirmed_at: new Date().toISOString(),
      },
      mockEvent
    );

    const initialPending = repo.getPendingOutboxEvents();
    expect(initialPending.length).toBe(1);
    expect(initialPending[0].status).toBe("PENDING");

    const result = await outboxService.processPendingEvents();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);

    const afterPending = repo.getPendingOutboxEvents();
    expect(afterPending.length).toBe(0);
  });

  it("should increment retry count and back off when gateway fails", async () => {
    const db = createInMemoryDatabase();
    const repo = new PaymentRepository(db);

    const mockGateway = new GatewayClient("http://mock-gateway", "secret");
    vi.spyOn(mockGateway, "notifySettlement").mockResolvedValue(false);

    const outboxService = new OutboxService(repo, mockGateway);

    repo.saveInvoice({
      invoice_id: "inv_2",
      generation_id: "gen_2",
      request_id: "req_2",
      user_id: "user_2",
      prompt_tokens: 10,
      completion_tokens: 50,
      total_tokens: 60,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "llama-3.3-70b-versatile",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const mockEvent: SharedPaymentEvent = {
      schema_version: "2.0.0",
      event_id: "evt_2",
      timestamp: new Date().toISOString(),
      request_id: "req_2",
      invoice_id: "inv_2",
      generation_id: "gen_2",
      user_id: "user_2",
      wallet: "0.0.12345",
      model: "llama-3.3-70b-versatile",
      prompt_tokens: 10,
      completion_tokens: 50,
      total_tokens: 60,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      network: "hedera:testnet",
      payment_scheme: "exact",
      payment_status: "CONFIRMED",
      transaction_id: "0.0.9185802-1700000000-000000001",
      transaction_url: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-00000001",
      delivery_status: "DELIVERED",
    };

    repo.saveConfirmedSettlement(
      {
        transaction_id: "0.0.9185802-1700000000-000000001",
        invoice_id: "inv_2",
        generation_id: "gen_2",
        payer_account: "0.0.12345",
        receiver_account: "0.0.99999",
        amount_tinybars: 1000,
        consensus_timestamp: "1700000000.000000000",
        mirror_status: "SUCCESS",
        hashscan_url: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-00000001",
        confirmed_at: new Date().toISOString(),
      },
      mockEvent
    );

    const result = await outboxService.processPendingEvents();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(0);

    const stmt = db.prepare("SELECT * FROM outbox_events WHERE event_id = ?");
    const event = stmt.get("evt_2") as any;
    expect(event.retry_count).toBe(1);
    expect(event.last_error).toContain("Gateway returned non-200");
  });
});
