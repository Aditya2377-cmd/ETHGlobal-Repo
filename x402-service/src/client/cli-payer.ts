import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  HTTP_HEADER_PAYMENT_REQUIRED,
  HTTP_HEADER_PAYMENT_RESPONSE,
  HTTP_HEADER_PAYMENT_SIGNATURE,
} from "../constants";
import { PaymentRequirementDoc } from "../types";
import { tinybarsToHbar } from "../utils/amount";
import { HederaTestnetSigner } from "./hedera-signer";

async function ask(rl: readline.Interface, query: string): Promise<string> {
  try {
    return await rl.question(query);
  } catch {
    return "";
  }
}

export async function runCliPayer(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("\n=======================================================");
    console.log(" PerPay x402 v2 Hedera Testnet Interactive CLI Payer");
    console.log("=======================================================\n");

    const defaultUrl = "http://localhost:4020/api/v1/generations/test_gen_1/result";
    const userEnteredUrl =
      process.argv[2] ||
      (await ask(rl, `Enter PerPay Result URL [Press Enter for default: ${defaultUrl}]: `));

    const targetUrl = userEnteredUrl.trim() || defaultUrl;

    console.log(`\nQuerying protected endpoint: ${targetUrl}...`);

    let initialResp: Response;
    try {
      initialResp = await fetch(targetUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Could not connect to ${targetUrl}: ${msg}`);
      console.log("Tip: Please ensure the PerPay payment server is running (e.g. 'npm run dev').");
      return;
    }

    if (initialResp.status === 200) {
      console.log("\n✅ Result is already unlocked!");
      const data = await initialResp.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (initialResp.status === 404) {
      console.log(`\n⚠️  No active invoice found for this generation URL (HTTP 404).`);
      console.log("PerPay uses post-generation exact billing. A generation must be created first.");
      console.log(`Tip: Test with the auto-seeded demo generation: ${defaultUrl}`);
      return;
    }

    if (initialResp.status !== 402) {
      console.error(`\nUnexpected HTTP response: ${initialResp.status}`);
      console.error(await initialResp.text());
      return;
    }

    const reqHeader = initialResp.headers.get(HTTP_HEADER_PAYMENT_REQUIRED);
    if (!reqHeader) {
      console.error(`HTTP 402 received but missing ${HTTP_HEADER_PAYMENT_REQUIRED} header.`);
      return;
    }

    const reqDoc = JSON.parse(Buffer.from(reqHeader, "base64").toString("utf-8")) as PaymentRequirementDoc;
    const accept = reqDoc.accepts[0];

    const amountTinybars = BigInt(accept.amount);
    const amountHbar = tinybarsToHbar(amountTinybars);

    console.log("\n--- PAYMENT REQUIREMENT DETAILS ---");
    console.log(`Network:       ${accept.network}`);
    console.log(`Scheme:        ${accept.scheme}`);
    console.log(`Asset:         HBAR (${accept.asset})`);
    console.log(`Amount:        ${amountTinybars.toString()} tinybars (${amountHbar} HBAR)`);
    console.log(`Receiver:      ${accept.payTo}`);
    console.log(`Fee Payer:     ${accept.extra.feePayer} (Sponsored by Facilitator)`);
    console.log(`Resource:      ${reqDoc.resource.description}`);
    console.log("------------------------------------\n");

    let payerId = process.env.TESTNET_SMOKE_PAYER_ID;
    if (!payerId) {
      payerId = await ask(rl, "Enter Payer Hedera Account ID (e.g. 0.0.12345): ");
    }

    let payerKey = process.env.TESTNET_SMOKE_PAYER_KEY;
    if (!payerKey) {
      payerKey = await ask(rl, "Enter Payer Private Key (DER or Hex): ");
    }

    if (!payerId.trim() || !payerKey.trim()) {
      console.log("\n⚠️  Payer credentials were not entered. Payment signing canceled.");
      console.log("Tip: You can get free testnet credentials from https://portal.hedera.com");
      return;
    }

    const approval = await ask(
      rl,
      `\nAUTHORIZE PAYMENT: Transfer ${amountTinybars.toString()} tinybars to ${accept.payTo}? [yes/no]: `
    );

    if (approval.trim().toLowerCase() !== "yes") {
      console.log("\nPayment canceled by user.");
      return;
    }

    console.log("\nSigning Hedera Testnet TransferTransaction...");
    let signer: HederaTestnetSigner;
    try {
      signer = new HederaTestnetSigner({
        payerAccountId: payerId.trim(),
        payerPrivateKey: payerKey.trim(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Failed to initialize Hedera signer: ${msg}`);
      console.log("Tip: Verify your Hedera private key format (DER or Hex) from https://portal.hedera.com");
      return;
    }

    let signatureHeader: string;
    try {
      signatureHeader = await signer.createPaymentSignatureHeader(accept);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Transaction signing failed: ${msg}`);
      signer.close();
      return;
    }
    signer.close();

    console.log("Submitting x402 payment signature to resource server...");
    let unlockResp: Response;
    try {
      unlockResp = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          [HTTP_HEADER_PAYMENT_SIGNATURE]: signatureHeader,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Unlock request network error: ${msg}`);
      return;
    }

    console.log(`\nServer Response: HTTP ${unlockResp.status}`);
    const unlockData = await unlockResp.json();
    console.log("\nResponse Body:\n", JSON.stringify(unlockData, null, 2));

    const paymentResponseHeader = unlockResp.headers.get(HTTP_HEADER_PAYMENT_RESPONSE);
    if (paymentResponseHeader) {
      const proof = JSON.parse(Buffer.from(paymentResponseHeader, "base64").toString("utf-8"));
      console.log("\n--- SETTLEMENT PROOF ---");
      console.log(`Transaction ID:  ${proof.transaction}`);
      console.log(`HashScan Link:   ${proof.transactionUrl}`);
      console.log("------------------------");
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  runCliPayer().catch((err) => {
    console.error("CLI Payer Error:", err);
  });
}
