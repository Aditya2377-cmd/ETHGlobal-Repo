import { Router } from "express";
import { PaymentRepository } from "../db/repository";
import { requireInternalSecret } from "../middleware/auth.middleware";
import { OutboxService } from "../services/outbox.service";
import { TrustedInvoiceContext } from "../types";

export function createInternalRouter(
  repo: PaymentRepository,
  outboxService: OutboxService
): Router {
  const router = Router();

  // All internal routes require the service-to-service secret
  router.use(requireInternalSecret);

  /**
   * Allows FastAPI to push an invoice context proactively upon Groq response generation.
   */
  router.post("/internal/v1/invoices/sync", (req, res) => {
    const invoice = req.body as TrustedInvoiceContext;
    if (!invoice || !invoice.invoice_id || !invoice.generation_id) {
      res.status(400).json({ error: "Missing required invoice fields" });
      return;
    }

    repo.saveInvoice(invoice);
    res.json({ success: true, invoice_id: invoice.invoice_id });
  });

  /**
   * Queries settlement state for dashboard or gateway auditing.
   */
  router.get("/internal/v1/settlements/:generation_id", (req, res) => {
    const { generation_id } = req.params;
    const settlement = repo.getSettlementByGenerationId(generation_id);

    if (!settlement) {
      res.status(404).json({ error: "No confirmed settlement found for generation" });
      return;
    }

    res.json(settlement);
  });

  /**
   * Manually triggers an outbox processing run.
   */
  router.post("/internal/v1/outbox/process", async (_req, res) => {
    const result = await outboxService.processPendingEvents();
    res.json({ success: true, ...result });
  });

  return router;
}
