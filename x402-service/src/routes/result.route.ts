import { Router } from "express";
import { HTTP_HEADER_PAYMENT_SIGNATURE } from "../constants";
import { PaymentService } from "../services/payment.service";

export function createResultRouter(paymentService: PaymentService): Router {
  const router = Router();

  router.get("/api/v1/generations/:generation_id/result", async (req, res, next) => {
    try {
      const { generation_id } = req.params;
      const signatureHeader = req.header(HTTP_HEADER_PAYMENT_SIGNATURE) || undefined;
      const userId = req.header("X-User-Id") || undefined;

      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      const result = await paymentService.handlePayToUnlock(
        generation_id,
        fullUrl,
        signatureHeader,
        userId
      );

      // Set x402 headers (PAYMENT-REQUIRED or PAYMENT-RESPONSE)
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }

      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
