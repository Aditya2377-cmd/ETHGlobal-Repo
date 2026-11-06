import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  HTTP_HEADER_PAYMENT_REQUIRED,
  HTTP_HEADER_PAYMENT_RESPONSE,
  HTTP_HEADER_PAYMENT_SIGNATURE,
} from "../../src/constants";
import { createInMemoryDatabase } from "../../src/db";
import { PaymentRepository } from "../../src/db/repository";
import { createResultRouter } from "../../src/routes/result.route";
import { FacilitatorService } from "../../src/services/facilitator.service";
import { GatewayClient } from "../../src/services/gateway.client";
import { PaymentService } from "../../src/services/payment.service";
import { ReconciliationService } from "../../src/services/reconciliation.service";

describe("Integration: End-to-End Pay-to-Unlock Flow", () => {
  it("should complete the full 402 challenge -> sign -> verify -> settle -> unlock lifecycle", async () => {
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
      transactionId: "0.0.9185802-1793950000-999999999",
    });

    const mockRecon = new ReconciliationService("http://mock-mirror");
    vi.spyOn(mockRecon, "reconcileOnChain").mockResolvedValue({
      isConfirmed: true,
      transactionId: "0.0.9185802-1793950000-999999999",
      consensusTimestamp: "1793950005.123456789",
      payerAccount: "0.0.12345",
      receiverAccount: "0.0.9999999",
      amountTinybars: 25000,
      mirrorStatus: "SUCCESS",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.9185802-1793950000-999999999",
    });

    const mockGateway = new GatewayClient("http://mock-gw", "secret");
    vi.spyOn(mockGateway, "fetchStoredResponse").mockResolvedValue({
      generation_id: "gen_lifecycle_1",
      content: "The decrypted AI analysis of quantum computing algorithms.",
      model: "llama-3.3-70b-versatile",
      total_tokens: 350,
    });
    vi.spyOn(mockGateway, "notifySettlement").mockResolvedValue(true);

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

    // Seed authoritative invoice
    repo.saveInvoice({
      invoice_id: "inv_lifecycle_1",
      generation_id: "gen_lifecycle_1",
      request_id: "req_lifecycle_1",
      user_id: "user_alice",
      prompt_tokens: 150,
      completion_tokens: 200,
      total_tokens: 350,
      charge_tinybars: 25000,
      charge_hbar: "0.00025",
      model: "llama-3.3-70b-versatile",
      status: "UNPAID",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });

    // STEP 1: Client queries protected result without payment
    const challengeRes = await request(app).get("/api/v1/generations/gen_lifecycle_1/result");

    expect(challengeRes.status).toBe(402);
    expect(challengeRes.headers[HTTP_HEADER_PAYMENT_REQUIRED.toLowerCase()]).toBeDefined();

    const reqDocB64 = challengeRes.headers[HTTP_HEADER_PAYMENT_REQUIRED.toLowerCase()];
    const reqDoc = JSON.parse(Buffer.from(reqDocB64, "base64").toString("utf-8"));

    expect(reqDoc.x402Version).toBe(2);
    expect(reqDoc.accepts[0].scheme).toBe("exact");
    expect(reqDoc.accepts[0].network).toBe("hedera:testnet");
    expect(reqDoc.accepts[0].asset).toBe("0.0.0");
    expect(reqDoc.accepts[0].amount).toBe("25000");
    expect(reqDoc.accepts[0].payTo).toBe("0.0.9999999");
    expect(reqDoc.accepts[0].extra.feePayer).toBe("0.0.9185802");

    // Ensure NO response content was leaked
    expect(challengeRes.body.content).toBeUndefined();

    // STEP 2: Client signs the transaction and returns with PAYMENT-SIGNATURE
    const paymentPayload = {
      x402Version: 2,
      scheme: "exact",
      network: "hedera:testnet",
      payload: {
        transaction: Buffer.from("signed-hedera-transfer-bytes").toString("base64"),
        payer: "0.0.12345",
      },
    };
    const paymentSignatureB64 = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

    const unlockRes = await request(app)
      .get("/api/v1/generations/gen_lifecycle_1/result")
      .set(HTTP_HEADER_PAYMENT_SIGNATURE, paymentSignatureB64);

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.headers[HTTP_HEADER_PAYMENT_RESPONSE.toLowerCase()]).toBeDefined();

    // Verify response content is unlocked
    expect(unlockRes.body.generation_id).toBe("gen_lifecycle_1");
    expect(unlockRes.body.content).toBe("The decrypted AI analysis of quantum computing algorithms.");
    expect(unlockRes.body.settlement.transaction_id).toBe("0.0.9185802-1793950000-999999999");
    expect(unlockRes.body.settlement.transaction_url).toContain("https://hashscan.io/testnet/transaction/");

    // Verify invoice is marked PAID in database
    const updatedInvoice = repo.getInvoiceById("inv_lifecycle_1");
    expect(updatedInvoice?.status).toBe("PAID");
  });
});
