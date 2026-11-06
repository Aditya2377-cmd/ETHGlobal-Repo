import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { createResultRouter } from "../../src/routes/result.route";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { GatewayClient } from "../../src/services/gateway.client";
import { PaymentService } from "../../src/services/payment.service";
import { ReconciliationService } from "../../src/services/reconciliation.service";
import { SettlementRecord, SharedPaymentEvent } from "../../src/types";

describe("Integration: Response Delivery Recovery & Idempotent Re-Retrieval", () => {
  it("should allow immediate retrieval of an already-paid result without re-charging", async () => {
    const db = createInMemoryDatabase();
    const repo = new PaymentRepository(db);

    const mockFacilitator = new FacilitatorService("http://mock");
    const mockRecon = new ReconciliationService("http://mock-mirror");
    const mockGateway = new GatewayClient("http://mock-gw", "secret");

    vi.spyOn(mockGateway, "fetchStoredResponse").mockResolvedValue({
      generation_id: "gen_recovered_1",
      content: "Persistent AI completion content.",
      model: "llama-3.3-70b-versatile",
      total_tokens: 120,
    });

    const paymentService = new PaymentService(
      repo,
      mockFacilitator,
      mockRecon,
      mockGateway,
      "0.0.9999999",
      120
    );

    const app = express();
    app.use(express.json());
    app.use(createResultRouter(paymentService));

    // Pre-seed an invoice that was previously confirmed
    repo.saveInvoice({
      invoice_id: "inv_recovered_1",
      generation_id: "gen_recovered_1",
      request_id: "req_rec_1",
      user_id: "user_bob",
      prompt_tokens: 20,
      completion_tokens: 100,
      total_tokens: 120,
      charge_tinybars: 12000,
      charge_hbar: "0.00012",
      model: "llama-3.3-70b-versatile",
      status: "PAID",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });

    const settlement: SettlementRecord = {
      transaction_id: "0.0.9185802-1793951111-888888888",
      invoice_id: "inv_recovered_1",
      generation_id: "gen_recovered_1",
      payer_account: "0.0.54321",
      receiver_account: "0.0.9999999",
      amount_tinybars: 12000,
      consensus_timestamp: "1793951111.888888888",
      mirror_status: "SUCCESS",
      hashscan_url: "https://hashscan.io/testnet/transaction/0.0.9185802-1793951111-888888888",
      confirmed_at: new Date(Date.now() - 3500000).toISOString(),
    };

    const outboxEvent: SharedPaymentEvent = {
      schema_version: "2.0.0",
      event_id: "evt_rec_1",
      timestamp: settlement.confirmed_at,
      request_id: "req_rec_1",
      invoice_id: "inv_recovered_1",
      generation_id: "gen_recovered_1",
      user_id: "user_bob",
      wallet: "0.0.54321",
      model: "llama-3.3-70b-versatile",
      prompt_tokens: 20,
      completion_tokens: 100,
      total_tokens: 120,
      charge_tinybars: 12000,
      charge_hbar: "0.00012",
      network: "hedera:testnet",
      payment_scheme: "exact",
      payment_status: "CONFIRMED",
      transaction_id: settlement.transaction_id,
      transaction_url: settlement.hashscan_url,
      delivery_status: "DELIVERED",
    };

    repo.saveConfirmedSettlement(settlement, outboxEvent);

    // Client reconnects / re-requests result with NO payment header:
    const res = await request(app).get("/api/v1/generations/gen_recovered_1/result");

    // Must return HTTP 200 immediately without 402 challenge
    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Persistent AI completion content.");
    expect(res.body.settlement.transaction_id).toBe("0.0.9185802-1793951111-888888888");
  });
});
