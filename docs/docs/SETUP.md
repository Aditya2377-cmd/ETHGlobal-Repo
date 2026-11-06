# PerPay Setup & Run Guide — Windows 11 & PowerShell

Welcome! This guide is written step-by-step for running the **PerPay Hedera x402 Payment Service** on Windows 11 using PowerShell.

---

## 1. Prerequisites Check

Open PowerShell (Press `Win + X`, then choose **Terminal** or **PowerShell**):

```powershell
# 1. Verify Node.js v20+ or v22+ LTS is installed
node -v

# 2. Verify npm is available
npm -v

# 3. Verify Git is available
git --version
```

> [!NOTE]
> If PowerShell displays an error about script execution (`npm.ps1 cannot be loaded because running scripts is disabled`), run this one-time command to permit local scripts:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
> ```

---

## 2. Opening the Project

Navigate to the project root:

```powershell
cd C:\Users\kastu\Desktop\perpay
```

To open in Antigravity or Visual Studio Code:
```powershell
code .
```

---

## 3. Install Dependencies

Install all pinned packages and generate the lockfile:

```powershell
# From the repository root:
npm install

# Or specifically inside the payment service:
cd x402-service
npm install
cd ..
```

---

## 4. Environment Configuration

Copy the example configuration to `.env`:

```powershell
# In x402-service folder
cd x402-service
Copy-Item .env.example .env
```

Open `.env` in your editor and verify:
- `PORT=4020`
- `HEDERA_NETWORK=hedera:testnet`
- `HEDERA_RECEIVER_ACCOUNT_ID=0.0.9999999` (Replace with your PerPay receiver account from https://portal.hedera.com)
- `FACILITATOR_URL=https://x402.org/facilitator`
- `HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com`

---

## 5. Build and Typecheck

Ensure the TypeScript compiler verifies all types:

```powershell
npm run typecheck
npm run build
```

Both commands should complete with 0 errors.

---

## 6. Run Automated Tests

Execute the complete automated test suite (Unit, Security, and Integration tests):

```powershell
npm test
```

Expected output:
```
Test Files  10 passed (10)
     Tests  38 passed (38)
```

To run tests in watch mode during development:
```powershell
npm run test:watch
```

---

## 7. Start the Payment Service

Start the payment service locally on port 4020:

```powershell
# Production build mode:
npm run build
node x402-service/dist/index.js

# Or live TypeScript hot-reload mode:
npm run dev
```

You will see the startup banner:
```
=======================================================
 PerPay x402 Hedera Payment Engine running on port 4020
 Network:        hedera:testnet
 Receiver:       0.0.YOUR_RECEIVER_ID
 Facilitator:    https://x402.org/facilitator
 Mirror Node:    https://testnet.mirrornode.hedera.com
 Database:       ./data/perpay_payments.db
=======================================================
[Facilitator] Hedera Testnet x402 v2 supported! Sponsored Fee Payer: 0.0.9185802
```

---

## 8. Verify Service Health

Open another PowerShell tab and run:

```powershell
# Check basic health
curl.exe http://localhost:4020/health

# Check facilitator connectivity and sponsored fee-payer discovery
curl.exe http://localhost:4020/ready
```

Both should return HTTP 200 with `status: "ok"` and `ready: true`.

---

## 9. Run the Live Hedera Testnet Smoke Test (Optional)

When you are ready to test a real on-chain transaction on Hedera Testnet:

1. Obtain a free Hedera Testnet account from [portal.hedera.com](https://portal.hedera.com/).
2. Run:
   ```powershell
   npm run testnet:smoke
   ```
3. The script will:
   - Check facilitator compatibility.
   - Display the test tinybar amount (~0.0001 HBAR).
   - Display the PerPay receiving account.
   - Prompt for your payer account ID and private key.
   - Prompt for explicit authorization: `Type 'CONFIRM' to authorize:`.
   - Submit the transaction and print the verified Hedera HashScan link!

---

## 10. Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.
The graceful shutdown hook will clear the outbox timer and close database connections cleanly.
