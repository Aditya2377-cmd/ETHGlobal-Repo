import { Router } from "express";
import { config } from "../config";
import { FacilitatorService } from "../services/facilitator.service";

export function createHealthRouter(facilitatorService: FacilitatorService): Router {
  const router = Router();

  router.get("/health", async (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      network: config.HEDERA_NETWORK,
      receiverAccountId: config.HEDERA_RECEIVER_ACCOUNT_ID,
      version: "2.0.0",
      uptime: process.uptime(),
    });
  });

  router.get("/ready", async (_req, res) => {
    const facilitatorStatus = await facilitatorService.getSupported();

    const isReady = facilitatorStatus.isCompatible;
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      network: config.HEDERA_NETWORK,
      facilitator: {
        url: facilitatorService.getFacilitatorUrl(),
        isCompatible: facilitatorStatus.isCompatible,
        feePayer: facilitatorStatus.feePayer,
        error: facilitatorStatus.errorMessage,
      },
    });
  });

  return router;
}
