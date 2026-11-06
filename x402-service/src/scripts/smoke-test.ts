import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../config";
import { HEDERA_TESTNET_CAIP2 } from "../constants";
import { FacilitatorService } from "../services/facilitator.service";
import { ReconciliationService } from "../services/reconciliation.service";
import { HederaTestnetSigner } from "../client/hedera-signer";
import { PaymentRequirementDoc } from "../types";
import { tinybarsToHbar } from "../utils/amount";

async function ask(rl: readline.Interface, query: string): Promise<string> {
  try {
    return await rl.question(query);
  } catch {
    return "";
  }
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("=================================================================");
    console.log("       PERPAY — HEDERA TESTNET LIVE PAYMENT SMOKE TEST           ");
    console.log("=================================================================\n");

    // Safety check 1: Network strictly hedera:testnet
    if (config.HEDERA_NETWORK !== HEDERA_TESTNET_CAIP2) {
      console.error(`FATAL: Smoke test can ONLY run on "${HEDERA_TESTNET_CAIP2}". Current: "${config.HEDERA_NETWORK}"`);
      return;
    }

    console.log(`[Config] Network:               ${config.HEDERA_NETWORK}`);
    console.log(`[Config] Receiver Account ID:   ${config.HEDERA_RECEIVER_ACCOUNT_ID}`);
    console.log(`[Config] Facilitator URL:       ${config.FACILITATOR_URL}`);
    console.log(`[Config] Mirror Node URL:       ${config.HEDERA_MIRROR_NODE_URL}`);

    // Safety check 2: Validate Receiver Account ID format
    if (!/^0\.0\.[1-9][0-9]*$/.test(config.HEDERA_RECEIVER_ACCOUNT_ID)) {
      console.error(`Invalid receiver account ID: ${config.HEDERA_RECEIVER_ACCOUNT_ID}`);
      return;
    }

    // Check Facilitator
    console.log("\nQuerying Facilitator /supported endpoint...");
    const facilitatorService = new FacilitatorService(config.FACILITATOR_URL);
    let supported;
    try {
      supported = await facilitatorService.getSupported();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to reach facilitator at ${config.FACILITATOR_URL}: ${msg}`);
      return;
    }

    if (!supported.isCompatible) {
      console.error(`Facilitator at ${config.FACILITATOR_URL} is NOT compatible: ${supported.errorMessage}`);
      return;
    }

    console.log(`[Facilitator] Compatibility:    VERIFIED (x402 v2 exact on hedera:testnet)`);
    console.log(`[Facilitator] Sponsoring FeePayer: ${supported.feePayer}`);

    const defaultTestTinybars = 10_000n;
    const testTinybars = defaultTestTinybars;
    const testHbar = tinybarsToHbar(testTinybars);

    console.log("\n--- TEST TRANSACTION PARAMETERS ---");
    console.log(`Test Invoice Amount:   ${testTinybars.toString()} tinybars (~${testHbar} HBAR)`);
    console.log(`Destination (PayTo):   ${config.HEDERA_RECEIVER_ACCOUNT_ID}`);
    console.log(`Fee Payer:             ${supported.feePayer} (Sponsored by facilitator)`);
    console.log("------------------------------------\n");

    // Read payer credentials
    let payerId = config.TESTNET_SMOKE_PAYER_ID;
    if (!payerId) {
      payerId = await ask(rl, "Enter your Hedera Testnet Payer Account ID (e.g. 0.0.12345): ");
    }

    let payerKey = config.TESTNET_SMOKE_PAYER_KEY;
    if (!payerKey) {
      payerKey = await ask(rl, "Enter your Hedera Testnet Payer Private Key (DER or Hex): ");
    }

    if (!payerId?.trim() || !payerKey?.trim()) {
      console.log("\n⚠️  Testnet payer credentials were not entered.");
      console.log("Tip: To execute a live payment on Hedera Testnet, get free credentials at: https://portal.hedera.com");
      return;
    }

    // Safety check 3: Explicit Human Authorization Prompt
    console.log("\n⚠️  WARNING: You are about to sign a REAL on-chain transaction on Hedera Testnet.");
    console.log(`This will transfer ${testTinybars} tinybars from ${payerId.trim()} to ${config.HEDERA_RECEIVER_ACCOUNT_ID}.`);
    const confirm = await ask(rl, `Type 'CONFIRM' to authorize signing and submission: `);

    if (confirm.trim() !== "CONFIRM") {
      console.log("Operation aborted by user. No on-chain transaction was signed or submitted.");
      return;
    }

    console.log("\n1. Constructing and signing TransferTransaction...");
    let signer: HederaTestnetSigner;
    try {
      signer = new HederaTestnetSigner({
        payerAccountId: payerId.trim(),
        payerPrivateKey: payerKey.trim(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Failed to load payer private key: ${msg}`);
      console.log("Tip: Provide a valid Hedera private key format (DER or Hex) from https://portal.hedera.com");
      return;
    }

    const requirements: PaymentRequirementDoc["accepts"][0] = {
      scheme: "exact",
      network: "hedera:testnet",
      asset: "0.0.0",
      amount: testTinybars.toString(),
      payTo: config.HEDERA_RECEIVER_ACCOUNT_ID,
      maxTimeoutSeconds: 120,
      extra: {
        feePayer: supported.feePayer,
      },
    };

    let payloadDoc;
    try {
      payloadDoc = await signer.createSignedPaymentPayload(requirements);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Failed to create signed transaction: ${msg}`);
      signer.close();
      return;
    }
    signer.close();
    console.log("   Signed successfully!");

    console.log("\n2. Submitting to Facilitator /verify endpoint...");
    const verifyResult = await facilitatorService.verifyPayment(payloadDoc, requirements);
    console.log(`   Verification result: isValid = ${verifyResult.isValid}`);

    if (!verifyResult.isValid) {
      console.error(`   Facilitator rejected transaction: ${verifyResult.invalidReason}`);
      return;
    }

    console.log("\n3. Submitting to Facilitator /settle endpoint...");
    const settleResult = await facilitatorService.settlePayment(payloadDoc, requirements);
    console.log(`   Settlement result: success = ${settleResult.success}`);

    if (!settleResult.success || !settleResult.transactionId) {
      console.error(`   Facilitator settlement failed: ${settleResult.error}`);
      return;
    }

    const txId = settleResult.transactionId;
    console.log(`   Hedera Transaction ID: ${txId}`);

    console.log("\n4. Performing independent reconciliation via Hedera Testnet Mirror Node...");
    const reconService = new ReconciliationService(config.HEDERA_MIRROR_NODE_URL);
    const recon = await reconService.reconcileOnChain(
      txId,
      config.HEDERA_RECEIVER_ACCOUNT_ID,
      Number(testTinybars),
      payerId.trim()
    );

    console.log(`   On-chain Status:      ${recon.mirrorStatus}`);
    console.log(`   Consensus Timestamp:  ${recon.consensusTimestamp}`);
    console.log(`   Verified Receiver:    ${recon.receiverAccount}`);
    console.log(`   Verified Amount:      ${recon.amountTinybars} tinybars`);
    console.log(`   Explorer Link:        ${recon.hashscanUrl}`);

    if (recon.isConfirmed) {
      console.log("\n🎉 SMOKE TEST COMPLETED SUCCESSFULLY! Transaction is permanently settled on Hedera Testnet.");
    } else {
      console.warn(`\n⚠️  Transaction submitted, but Mirror Node reconciliation incomplete: ${recon.errorMessage}`);
      console.log(`Check HashScan in 15 seconds: ${recon.hashscanUrl}`);
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Smoke test failure:", err);
  });
}
