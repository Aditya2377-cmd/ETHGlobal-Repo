import { describe, expect, it, vi } from "vitest";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { GatewayClient } from "../../src/services/gateway.client";
import { PaymentService } from "../../src/services/payment.service";
import { ReconciliationService } from "../../src/services/reconciliation.service";

describe("Concurrency & Race Condition Hardening", () => {
  it("should handle simultaneous payment submissions safely and idempotently", async () => {
    const db = createInMemoryDatabase();
    const repo = new PaymentRepository(db);

    const mockFacilitator = new FacilitatorService("http://mock");
    vi.spyOn(mockFacilitator, "getSupported").mockResolvedValue({
      isCompatible: true,
      feePayer: "0.0.9185802",
    });
    vi.spyOn(mockFacilitator, "verifyPayment").mockResolvedValue({ isValid: true });
    vi.spyOn(mockFacilitator, "settlePayment").mockResolvedValue({
      success: true,
      transactionId: "0.0.9185802-1700000000-333333333",
    });

    const mockRecon = new ReconciliationService("http://mock-mirror");
    vi.spyOn(mockRecon, "reconcileOnChain").mockResolvedValue({
      isConfirmed: true,
      transactionId: "0.0.9185802-1700000000-333333333",
      consensusTimestamp: "1700000000.333333333",
      payerAccount: "0.0.12345",
      receiverAccount: "0.0.99999",
      amountTinybars: 5000,
      mirrorStatus: "SUCCESS",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-333333333",
    });

    const mockGateway = new GatewayClient("http://mock-gw", "secret");
    vi.spyOn(mockGateway, "fetchStoredResponse").mockResolvedValue({
      generation_id: "gen_concurrent",
      content: "Concurrent Result",
      model: "llama-3.3-70b-versatile",
      total_tokens: 150,
    });
    vi.spyOn(mockGateway, "notifySettlement").mockResolvedValue(true);

    const paymentService = new PaymentService(
      repo,
      mockFacilitator,
      mockRecon,
      mockGateway,
      "0.0.99999",
      120
    );

    repo.saveInvoice({
      invoice_id: "inv_conc",
      generation_id: "gen_concurrent",
      request_id: "req_conc",
      user_id: "u_conc",
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150,
      charge_tinybars: 5000,
      charge_hbar: "0.00005",
      model: "llama-3.3-70b-versatile",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const payload = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:testnet",
      payload: { transaction: Buffer.from("tx_bytes").toString("base64") },
    };
    const header = Buffer.from(JSON.stringify(payload)).toString("base64");

    // Execute two concurrent payment requests
    const [res1, res2] = await Promise.all([
      paymentService.handlePayToUnlock("gen_concurrent", "http://localhost/result", header),
      paymentService.handlePayToUnlock("gen_concurrent", "http://localhost/result", header),
    ]);

    // Both should yield unlocked responses or 200 OK without errors
    expect([200]).toContain(res1.statusCode);
    expect([200]).toContain(res2.statusCode);
    expect(res1.responseUnlocked).toBe(true);
    expect(res2.responseUnlocked).toBe(true);

    // Verify database integrity: exactly ONE settlement record exists
    const stmt = db.prepare("SELECT COUNT(*) as cnt FROM settlement_records WHERE generation_id = ?");
    const count = stmt.get("gen_concurrent") as { cnt: number };
    expect(count.cnt).toBe(1);
  });
});
