import { describe, expect, it, vi } from "vitest";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { GatewayClient } from "../../src/services/gateway.client";
import { PaymentService } from "../../src/services/payment.service";
import { ReconciliationService } from "../../src/services/reconciliation.service";

describe("Security Regression Tests", () => {
  function setupTestEnv() {
    const db = createInMemoryDatabase();
    const repo = new PaymentRepository(db);

    const mockFacilitator = new FacilitatorService("http://mock");
    vi.spyOn(mockFacilitator, "getSupported").mockResolvedValue({
      isCompatible: true,
      feePayer: "0.0.9185802",
    });

    const mockRecon = new ReconciliationService("http://mock-mirror");
    const mockGateway = new GatewayClient("http://mock-gw", "secret");

    const paymentService = new PaymentService(
      repo,
      mockFacilitator,
      mockRecon,
      mockGateway,
      "0.0.99999",
      120
    );

    return { db, repo, mockFacilitator, mockRecon, mockGateway, paymentService };
  }

  it("1. Should reject unsupported network in PAYMENT-SIGNATURE", async () => {
    const { repo, paymentService } = setupTestEnv();

    repo.saveInvoice({
      invoice_id: "inv_net",
      generation_id: "gen_net",
      request_id: "req_net",
      user_id: "u1",
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "test",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const wrongNetPayload = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:mainnet", // Attack vector: mainnet
      payload: { transaction: Buffer.from("mock").toString("base64") },
    };
    const header = Buffer.from(JSON.stringify(wrongNetPayload)).toString("base64");

    const res = await paymentService.handlePayToUnlock(
      "gen_net",
      "http://localhost/result",
      header
    );
    expect(res.statusCode).toBe(400);
    expect(res.responseUnlocked).toBe(false);
    expect(res.body.error).toContain("Unsupported x402 payment signature format or network");
  });

  it("2. Should reject expired invoices before processing payment", async () => {
    const { repo, paymentService } = setupTestEnv();

    repo.saveInvoice({
      invoice_id: "inv_exp",
      generation_id: "gen_exp",
      request_id: "req_exp",
      user_id: "u1",
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "test",
      status: "UNPAID",
      created_at: new Date(Date.now() - 120000).toISOString(),
      expires_at: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
    });

    const res = await paymentService.handlePayToUnlock("gen_exp", "http://localhost/result");
    expect(res.statusCode).toBe(400);
    expect(res.responseUnlocked).toBe(false);
    expect(res.body.error).toContain("Invoice has expired");
  });

  it("3. Should reject access when authenticated user does not own invoice", async () => {
    const { repo, paymentService } = setupTestEnv();

    repo.saveInvoice({
      invoice_id: "inv_user",
      generation_id: "gen_user",
      request_id: "req_user",
      user_id: "legit_user",
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "test",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const res = await paymentService.handlePayToUnlock(
      "gen_user",
      "http://localhost/result",
      undefined,
      "attacker_user" // Mismatched user
    );
    expect(res.statusCode).toBe(403);
    expect(res.responseUnlocked).toBe(false);
    expect(res.body.error).toContain("User unauthorized");
  });

  it("4. Should lock response when facilitator rejects verification", async () => {
    const { repo, mockFacilitator, paymentService } = setupTestEnv();

    vi.spyOn(mockFacilitator, "verifyPayment").mockResolvedValue({
      isValid: false,
      invalidReason: "Customer cryptographic signature invalid",
    });

    repo.saveInvoice({
      invoice_id: "inv_sig_err",
      generation_id: "gen_sig_err",
      request_id: "req_sig_err",
      user_id: "u1",
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      charge_tinybars: 1000,
      charge_hbar: "0.00001",
      model: "test",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const payload = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:testnet",
      payload: { transaction: Buffer.from("bad_sig").toString("base64") },
    };
    const header = Buffer.from(JSON.stringify(payload)).toString("base64");

    const res = await paymentService.handlePayToUnlock(
      "gen_sig_err",
      "http://localhost/result",
      header
    );
    expect(res.statusCode).toBe(402);
    expect(res.responseUnlocked).toBe(false);
    expect(res.body.error).toContain("Payment verification failed");
    expect(res.body.reason).toContain("signature invalid");
  });

  it("5. Should lock response when on-chain reconciliation reveals wrong amount credited", async () => {
    const { repo, mockFacilitator, mockRecon, paymentService } = setupTestEnv();

    vi.spyOn(mockFacilitator, "verifyPayment").mockResolvedValue({ isValid: true });
    vi.spyOn(mockFacilitator, "settlePayment").mockResolvedValue({
      success: true,
      transactionId: "0.0.9185802-1700000000-222222222",
    });

    // Reconciliation detects insufficient payment (e.g. 100 tinybars paid instead of 5000 required)
    vi.spyOn(mockRecon, "reconcileOnChain").mockResolvedValue({
      isConfirmed: false,
      transactionId: "0.0.9185802-1700000000-222222222",
      consensusTimestamp: "1700000000.222222222",
      payerAccount: "0.0.12345",
      receiverAccount: "0.0.99999",
      amountTinybars: 100,
      mirrorStatus: "SUCCESS",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.9185802-1700000000-222222222",
      errorMessage: "Hedera transfers list missing expected credit of 5000 tinybars",
    });

    repo.saveInvoice({
      invoice_id: "inv_underpaid",
      generation_id: "gen_underpaid",
      request_id: "req_underpaid",
      user_id: "u1",
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      charge_tinybars: 5000,
      charge_hbar: "0.00005",
      model: "test",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    const payload = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:testnet",
      payload: { transaction: Buffer.from("tx").toString("base64") },
    };
    const header = Buffer.from(JSON.stringify(payload)).toString("base64");

    const res = await paymentService.handlePayToUnlock(
      "gen_underpaid",
      "http://localhost/result",
      header
    );
    expect(res.statusCode).toBe(402);
    expect(res.responseUnlocked).toBe(false);
    expect(res.body.error).toContain("pending on-chain confirmation");
  });
});
