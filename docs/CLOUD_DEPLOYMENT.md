# PerPay — Cloud Deployment Architecture & Runbook
**Product:** PerPay — Usage-based AI payments. Settled on-chain.  
**Network:** Hedera Testnet (`hedera:testnet`) • Protocol: x402 v2  
**Target Environments:** Vercel (Frontend & Serverless) + Google Cloud Run (Containers)  
**Target Region:** `asia-south1` (Mumbai)  

---

## 1. Repository & Component Audit

The PerPay platform is structured into three unified, authoritative modules:

| Component | Path | Language / Runtime | Production Port | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | `frontend-design/` (root mirror `src/`) | React 18, TypeScript, Vite | `8080` (Cloud) / `3000` (Local) | Visual interface, Times New Roman aesthetic, WebGL universe, invoice payment UX |
| **AI Gateway** | `gateway/` | Python 3.12, FastAPI, Uvicorn | `8000` | Groq AI inference, tokenizer accounting, usage pricing, private response escrow |
| **Payment Service** | `x402-service/` | Node.js 22 LTS, Express, TS | `4020` | x402 v2 protocol handler, Hedera cryptoTransfer verification, facilitator settlement |

---

## 2. Fast-Track Deployment: Vercel (Zero-Friction Hackathon Host)

Because you requested deploying directly from your Vercel account, we have configured [`vercel.json`](../vercel.json) at both the repository root and inside `frontend-design/`.

### Deployment Steps on Vercel:

1. **Log in to Vercel**: Navigate to [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Import Repository**:
   * Click **"Add New..."** $\to$ **"Project"**.
   * Select your GitHub repository: `Aditya2377-cmd/ETHGlobal-Repo`.
3. **Configure Project Settings**:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Leave as `./` (or select `frontend-design`)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. **Environment Variables** (Optional — Default fallbacks already exist):
   ```env
   VITE_GATEWAY_URL=https://perpay-gateway.your-cloud-run.app
   VITE_X402_FACILITATOR_URL=https://perpay-x402.your-cloud-run.app
   VITE_PERPAY_TREASURY_ACCOUNT=0.0.5109822
   ```
5. Click **"Deploy"**.
6. **Result**: Within ~45 seconds, Vercel will output your permanent public URL:
   `https://ethglobal-repo.vercel.app` (or custom subdomain).

---

## 3. Google Cloud Run Deployment Architecture

For full containerized deployment across Google Cloud Platform in the **`asia-south1` (Mumbai)** region:

### Services Topology:

```
[ Customer Browser ]
        │
        ▼ (Public HTTPS)
┌──────────────────────────────────────────────┐
│  perpay-frontend (Google Cloud Run)          │
│  - NGINX Alpine + Built Vite Assets          │
│  - Auto-scales to 0 when idle                │
└──────────────┬───────────────────────────────┘
               │
       ┌───────┴────────────────────────┐
       ▼ (REST / x402)                  ▼ (x402 Requirement)
┌────────────────────────────┐   ┌────────────────────────────┐
│  perpay-gateway (FastAPI)  │   │  perpay-x402 (Express/TS)  │
│  - Groq API Client         │◄──┤  - Facilitator Client      │
│  - Dynamic Tokenizer       │   │  - Hedera Mirror Node      │
│  - Escrow Ledger (SQLite)  │   │  - Settlement Reconciliation
└────────────────────────────┘   └─────────────┬──────────────┘
                                               │ (cryptoTransfer)
                                               ▼
                                  [ Hedera Testnet Nodes ]
```

---

## 4. Google Cloud Prerequisite Check

Run the following checks from Google Cloud Shell or your local machine with Google Cloud SDK installed:

```powershell
# 1. Authenticate with your Google Cloud account
gcloud auth login

# 2. Set your active Project ID
gcloud config set project YOUR_PROJECT_ID

# 3. Set default region to Mumbai (asia-south1)
gcloud config set run/region asia-south1

# 4. Enable required Google Cloud APIs
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com
```

---

## 5. Step-by-Step Cloud Run Deployment

### Service 1: `perpay-gateway` (FastAPI)

```powershell
# Build and deploy from repository root
gcloud run deploy perpay-gateway \
    --source . \
    --region asia-south1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8000 \
    --min-instances 0 \
    --max-instances 2 \
    --memory 512Mi \
    --cpu 1 \
    --set-env-vars "PORT=8000,HEDERA_NETWORK=testnet,HEDERA_RECEIVER_ACCOUNT_ID=0.0.5109822,INTERNAL_SERVICE_SECRET=perpay-production-secret-2026"
```
*Note the returned service URL: `https://perpay-gateway-xyz-el.a.run.app`.*

---

### Service 2: `perpay-x402` (Hedera Payment Service)

```powershell
# Build and deploy x402 payment service
gcloud run deploy perpay-x402 \
    --source . \
    --region asia-south1 \
    --platform managed \
    --allow-unauthenticated \
    --port 4020 \
    --min-instances 0 \
    --max-instances 2 \
    --memory 512Mi \
    --cpu 1 \
    --set-env-vars "PORT=4020,NODE_OPTIONS=--experimental-sqlite,HEDERA_NETWORK=testnet,HEDERA_RECEIVER_ACCOUNT_ID=0.0.5109822,FACILITATOR_URL=https://x402.org/facilitator,HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com,FASTAPI_GATEWAY_URL=https://perpay-gateway-xyz-el.a.run.app,INTERNAL_SERVICE_SECRET=perpay-production-secret-2026"
```
*Note the returned service URL: `https://perpay-x402-xyz-el.a.run.app`.*

---

### Service 3: `perpay-frontend` (React + NGINX)

```powershell
# Build and deploy production frontend pointing to backend Cloud Run URLs
gcloud run deploy perpay-frontend \
    --source . \
    --region asia-south1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --min-instances 0 \
    --max-instances 5 \
    --memory 256Mi \
    --cpu 1 \
    --set-env-vars "VITE_GATEWAY_URL=https://perpay-gateway-xyz-el.a.run.app,VITE_X402_FACILITATOR_URL=https://perpay-x402-xyz-el.a.run.app,VITE_PERPAY_TREASURY_ACCOUNT=0.0.5109822"
```

---

## 6. Database Persistence Evaluation

1. **Current State**: Both `gateway/` and `x402-service/` use file-based SQLite databases (`gateway_ledger.db` and `x402_payments.db`).
2. **Cloud Run Constraint**: Cloud Run containers use ephemeral in-memory container filesystems. When an instance scales to 0, local files are reset.
3. **Hackathon / Demonstration Strategy**:
   * For the ETHGlobal demonstration, Cloud Run instances stay warm during your demo, and in-memory/ephemeral SQLite is completely sufficient.
   * For long-term production persistence, attach a **Cloud Storage FUSE Volume** or connect to a **Cloud SQL PostgreSQL** instance via standard database connection string (`DATABASE_URL`).

---

## 7. Cost Management & Billing Limits

To ensure zero unexpected costs:

* **Minimum instances set to `0`**: When nobody is browsing, Cloud Run scales to zero instances. You incur **$0.00 / hour** when idle.
* **Maximum instances set to `2`**: Prevents accidental cost runaways from high traffic.
* **Free Tier Allocation**:
  * Google Cloud Run offers **2 million free requests per month**.
  * Cloud Build offers **120 free build-minutes per day**.
  * Vercel Hobby Tier offers **100 GB bandwidth / month for free**.

---

## 8. Rollback & Redeployment

If you need to rollback to a previous working revision on Cloud Run:

```powershell
# List revisions
gcloud run revisions list --service perpay-frontend --region asia-south1

# Rollback traffic 100% to a known good revision
gcloud run services update-traffic perpay-frontend \
    --to-revisions=perpay-frontend-00001-abc=100 \
    --region asia-south1
```
