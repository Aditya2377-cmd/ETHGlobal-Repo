import cors from "cors";
import express from "express";
import type Database from "better-sqlite3";
import { config } from "./config";
import { getDatabase } from "./db";
import { PaymentRepository } from "./db/repository";
import { errorHandler } from "./middleware/error.middleware";
import { safeLoggingMiddleware } from "./middleware/logging.middleware";
import { createHealthRouter } from "./routes/health.route";
import { createInternalRouter } from "./routes/internal.route";
import { createResultRouter } from "./routes/result.route";
import { FacilitatorService } from "./services/facilitator.service";
import { GatewayClient } from "./services/gateway.client";
import { OutboxService } from "./services/outbox.service";
import { PaymentService } from "./services/payment.service";
import { ReconciliationService } from "./services/reconciliation.service";

export interface AppContext {
  app: express.Express;
  facilitatorService: FacilitatorService;
  outboxService: OutboxService;
  paymentService: PaymentService;
  repo: PaymentRepository;
  db: Database.Database;
}

export function createApp(): AppContext {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(safeLoggingMiddleware);

  // Initialize DB and repositories
  const db = getDatabase();
  const repo = new PaymentRepository(db);

  // Initialize Core Services
  const facilitatorService = new FacilitatorService(config.FACILITATOR_URL);
  const reconciliationService = new ReconciliationService(config.HEDERA_MIRROR_NODE_URL);
  const gatewayClient = new GatewayClient(
    config.FASTAPI_GATEWAY_URL,
    config.INTERNAL_SERVICE_SECRET
  );
  const outboxService = new OutboxService(repo, gatewayClient);
  const paymentService = new PaymentService(
    repo,
    facilitatorService,
    reconciliationService,
    gatewayClient,
    config.HEDERA_RECEIVER_ACCOUNT_ID,
    config.MAX_PAYMENT_TIMEOUT_SECONDS
  );

  // Mount Routers
  app.use(createHealthRouter(facilitatorService));
  app.use(createResultRouter(paymentService));
  app.use(createInternalRouter(repo, outboxService));

  // Global Error Handler
  app.use(errorHandler);

  return {
    app,
    facilitatorService,
    outboxService,
    paymentService,
    repo,
    db,
  };
}

const { app, facilitatorService, outboxService } = createApp();

if (require.main === module) {
  const port = config.PORT;

  const server = app.listen(port, async () => {
    console.log(`=======================================================`);
    console.log(` PerPay x402 Hedera Payment Engine running on port ${port}`);
    console.log(` Network:        ${config.HEDERA_NETWORK}`);
    console.log(` Receiver:       ${config.HEDERA_RECEIVER_ACCOUNT_ID}`);
    console.log(` Facilitator:    ${config.FACILITATOR_URL}`);
    console.log(` Mirror Node:    ${config.HEDERA_MIRROR_NODE_URL}`);
    console.log(` Database:       ${config.SQLITE_DB_PATH}`);
    console.log(`=======================================================`);

    // Verify facilitator connectivity on start
    try {
      const supported = await facilitatorService.getSupported();
      if (supported.isCompatible) {
        console.log(`[Facilitator] Hedera Testnet x402 v2 supported! Sponsored Fee Payer: ${supported.feePayer}`);
      } else {
        console.warn(`[Facilitator] Warning: ${supported.errorMessage}`);
      }
    } catch (err) {
      console.error(`[Facilitator] Startup connectivity check failed:`, err);
    }
  });

  // Background outbox processor interval
  const outboxTimer = setInterval(() => {
    outboxService.processPendingEvents().catch(() => {});
  }, 10_000);

  const shutdown = () => {
    console.log("Shutting down PerPay payment engine...");
    clearInterval(outboxTimer);
    server.close(() => {
      console.log("PerPay payment engine stopped.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export default app;
