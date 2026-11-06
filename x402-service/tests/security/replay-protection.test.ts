import { describe, expect, it, vi } from "vitest";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { GatewayClient } from "../../src/services/gateway.client";
import { PaymentService } from "../../src/services/payment.service";
import { ReconciliationService } from "../../src/services/reconciliation.service";

describe("Security: Replay & Duplicate Payment Protection", () => {
  it("should prevent the same Hedera transaction ID from fulfilling two different invoices", async () => {
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
      transactionId: "0.0.9185802-1700000000-111111111",
    });

    const mockRecon = new ReconciliationService("http://mock-mirror");
    vi.spyOn(mockRecon, "reconcileOnChain").mockResolvedValue({
      isConfirmed: true,
      transactionId: "0.0.9185802-1700000000-111111111",
      consensusTimestamp: "1700000000.111111111",
      payerAccount: "0.0.12345",
      receiverAccount: "0.0.99999",
      amountTinybars: 5000,
      mirrorStatus: "SUCCESS",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-111111111",
    });

    const mockGateway = new GatewayClient("http://mock-gw", "secret");
    vi.spyOn(mockGateway, "fetchStoredResponse").mockResolvedValue({
      generation_id: "gen_A",
      content: "Result A",
      model: "test-model",
      total_tokens: 100,
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

    // Invoice A
    repo.saveInvoice({
      invoice_id: "inv_A",
      generation_id: "gen_A",
      request_id: "req_A",
      user_id: "user_1",
      prompt_tokens: 10,
      completion_tokens: 90,
      total_tokens: 100,
      charge_tinybars: 5000,
      charge_hbar: "0.00005",
      model: "test-model",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    // Invoice B
    repo.saveInvoice({
      invoice_id: "inv_B",
      generation_id: "gen_B",
      request_id: "req_B",
      user_id: "user_2",
      prompt_tokens: 10,
      completion_tokens: 90,
      total_tokens: 100,
      charge_tinybars: 5000,
      charge_hbar: "0.00005",
      model: "test-model",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const validPayloadDoc = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:testnet",
      payload: {
        transaction: Buffer.from("mock-tx-bytes").toString("base64"),
        payer: "0.0.12345",
      },
    };
    const signatureHeader = Buffer.from(JSON.stringify(validPayloadDoc)).toString("base64");

    // First payment on Invoice A: Must succeed
    const resA = await paymentService.handlePayToUnlock(
      "gen_A",
      "http://localhost/api/v1/generations/gen_A/result",
      signatureHeader,
      "user_1"
    );
    expect(resA.statusCode).toBe(200);
    expect(resA.responseUnlocked).toBe(true);

    // Attempt to reuse the SAME signed transaction to unlock Invoice B: Must be REJECTED!
    const resB = await paymentService.handlePayToUnlock(
      "gen_B",
      "http://localhost/api/v1/generations/gen_B/result",
      signatureHeader,
      "user_2"
    );
    expect(resB.statusCode).toBe(400);
    expect(resB.responseUnlocked).toBe(false);
    expect(resB.body.error).toContain("Duplicate transaction rejected");
  });
});
