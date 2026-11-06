import dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import {
  DEFAULT_FACILITATOR_URL,
  DEFAULT_MIRROR_NODE_URL,
  DEFAULT_TIMEOUT_SECONDS,
  HEDERA_TESTNET_CAIP2,
} from "./constants";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4020),
  HEDERA_NETWORK: z.string().default(HEDERA_TESTNET_CAIP2),
  HEDERA_RECEIVER_ACCOUNT_ID: z
    .string()
    .regex(/^0\.0\.[1-9][0-9]*$/, "Receiver account must follow Hedera 0.0.x format")
    .default("0.0.9999999"),
  FACILITATOR_URL: z.string().url().default(DEFAULT_FACILITATOR_URL),
  FASTAPI_GATEWAY_URL: z.string().url().default("http://localhost:8000"),
  INTERNAL_SERVICE_SECRET: z.string().min(8).default("perpay_internal_secret_dev_mode_only"),
  HEDERA_MIRROR_NODE_URL: z.string().url().default(DEFAULT_MIRROR_NODE_URL),
  SQLITE_DB_PATH: z.string().default("./data/perpay_payments.db"),
  MAX_PAYMENT_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(DEFAULT_TIMEOUT_SECONDS),
  TESTNET_SMOKE_PAYER_ID: z.string().optional(),
  TESTNET_SMOKE_PAYER_KEY: z.string().optional(),
});

function loadConfig() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Configuration validation error:", parsed.error.format());
    throw new Error(`Invalid configuration: ${JSON.stringify(parsed.error.format())}`);
  }

  const cfg = parsed.data;

  // Strict Mainnet rejection
  if (cfg.HEDERA_NETWORK !== HEDERA_TESTNET_CAIP2 || cfg.HEDERA_NETWORK.toLowerCase().includes("mainnet")) {
    throw new Error(
      `Accidental mainnet configuration rejected: "${cfg.HEDERA_NETWORK}". PerPay payment service strictly requires "${HEDERA_TESTNET_CAIP2}".`
    );
  }

  // Ensure mirror node is not pointed to mainnet
  if (cfg.HEDERA_MIRROR_NODE_URL.toLowerCase().includes("mainnet-public")) {
    throw new Error("Hedera mirror node cannot point to mainnet in testnet environment.");
  }

  return cfg;
}

export const config = loadConfig();
export type Config = typeof config;
