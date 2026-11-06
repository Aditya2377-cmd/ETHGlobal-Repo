# Payper — Frontend Design & Technical Architecture Document

## Overview

**Payper** is a usage-based AI payment gateway settled on the **Hedera Testnet** via the **x402 Protocol v2**. This document specifies the frontend architecture, visual design system, interaction patterns, and component hierarchy implemented for the ETHGlobal Mumbai hackathon.

---

## 1. Visual Design System

### 1.1 Aesthetic & Style Principles
* **Brutalist Editorial Fintech**: Clean, professional, authoritative aesthetic inspired by financial institutions and modern Web3 interfaces.
* **Sharp Rectangular Geometry**: Universal zero border-radius (`border-radius: 0px !important`). Every container, button, card, modal, badge, chip, and input is a crisp, sharp-edged rectangle with solid `2px solid #0F172A` or `#CBD5E1` borders.
* **Pure White & High Contrast**: Pure `#FFFFFF` surfaces layered over crisp `#F8FAFC` backgrounds, contrasted with `#0F172A` deep ink text and saturated cobalt blue accents (`#1D4ED8`).
* **Editorial Typography**: Styled entirely in **Times New Roman** (`font-family: 'Times New Roman', Times, serif`) across all headings, body text, buttons, and tables, with monospace numbers (`IBM Plex Mono`) for cryptographic hashes and tinybar balances.
* **Large-Scale Hierarchy**: Scaled up font sizes and padding across the app:
  * Main headings: `32px`–`48px`
  * Dashboard balance typography: `48px` with `28px` `ℏ HBAR` accents
  * AI Output Text: `24px` with `1.9` line height for readability
  * Primary action buttons: `18px`–`22px` font with `16px 36px` padding

### 1.2 Official Brand Identity
* **Logo**: The dynamic speed-striped italic "P" icon rendered in electric royal blue and deep cobalt gradients.
* **Asset Location**: `public/payper-logo.png`
* **Favicon**: Embedded in `index.html` for browser tab branding.
* **Header Presence**: Displayed at `46px` height with sharp borders in the persistent navigation bar.

---

## 2. Technical Architecture & Tech Stack

* **Framework**: React 18 + TypeScript
* **Build Tool**: Vite 5
* **CSS Framework**: Tailwind CSS + Custom brutalist design tokens (`src/styles/globals.css`)
* **State Management**: React Context API (`AppContext.tsx`)
* **Icons**: Lucide React
* **QR Codes**: Native SVG QR Code Generator (`QRCode.tsx`)
* **Interactive Background**: GPU-accelerated WebGL 2 shader (`PerPayBackground.tsx`) with light-mode white canvas and procedure energy flows.

---

## 3. User Flows & Screen Hierarchy

### 3.1 Dual-View Experience
Payper provides an instant switcher between two responsive modes:
1. **Desktop Fintech Dashboard** (`maxWidth: 1440px`): Full enterprise view with expanded data tables, token metrics, and side navigation.
2. **Interactive Smartphone App View** (`PhoneAppPreview.tsx`): 480px mobile mockup showcasing the end-user experience (PhonePe / GPay style).

---

### 3.2 Core Screens

#### 1. Home / Overview Screen (`HomeScreen.tsx`)
* **Account Balance Card**: Displays real-time Hedera testnet balance in HBAR (`48px`) and tinybars.
* **Quick Inference Terminal**: In-app prompt input with model chips (Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1, Mixtral 8x7B) showing rates per 1M tokens.
* **Critical Pending Alert Banner**: Highlights unsettled invoices with a direct action button to pay and unlock responses.
* **Metrics Grid**: Tracks total generations, total tokens measured, total HBAR settled, and protocol compliance.
* **Settlements Ledger**: Displays recent confirmed on-chain transactions with links to Hedera HashScan.

#### 2. AI Workspace (`WorkspaceScreen.tsx`)
* **Model Configuration**: Select AI model and adjust maximum token limits with an interactive slider.
* **Prompt Engineering Console**: Large textarea with real-time character and estimated token counting.
* **Template Quick Starters**: 1-click prompt templates for Hedera consensus, x402 verification, and smart contracts.
* **Usage Guarantee Notice**: Explains the exact post-generation metering policy.

#### 3. Generation Lifecycle Screen (`GenerationProgressScreen.tsx`)
* **5-Stage State Machine**:
  1. *Prompt Validation & Tokenizer Check*
  2. *Private Provider Generation (Groq Gateway)*
  3. *Actual Token Measurement & Metering*
  4. *Exact Tinybar Invoice Generation*
  5. *Encrypted Output Custody*

#### 4. Usage Invoice Review Screen (`InvoiceScreen.tsx`)
* **Invoice Identifiers**: Unique Invoice ID, Generation ID, and timestamp.
* **Token Metering Breakdown**: Measured input tokens, measured output tokens, and total billable units.
* **Payment Selector**:
  * **Option 1: Wallet Sign**: Direct 1-click authorization via connected Hedera wallet (HashPack, Blade, or custom account).
  * **Option 2: QR Transfer**: Interactive QR code formatted with `hedera:testnet?account=...&amount=...&memo=...` for mobile camera scanning.
* **Cryptographic Memo Link**: Enforces invoice ID inclusion in transaction memos for automatic response unlocking.

#### 5. Unlocked AI Output Screen (`UnlockedResponseScreen.tsx`)
* **Secured Response Presentation**: High-contrast, large-font (`24px`) editorial layout displaying the unlocked AI completion.
* **Settlement Ledger Receipt**: Complete audit trail showing actual tokens, exact tinybars deducted, and receiving treasury account (`0.0.5109822`).
* **Cryptographic Proof Link**: Direct external link to the transaction on the **Hedera HashScan Mirror Node**.

#### 6. Activity Ledger (`ActivityScreen.tsx`)
* **Audit Trail**: Searchable, filterable list of all past token settlements.
* **CSV Export**: One-click export of complete transaction history for accounting.

#### 7. Settings & Pricing Schedule (`SettingsScreen.tsx`)
* **Account Configuration**: Connected Hedera wallet management and disconnect options.
* **Transparent Tariff Matrix**: Live pricing schedule per 1,000 input/output tokens and estimated cost per 1M tokens.
* **Network Specifications**: x402 v2 protocol architecture and HashScan mirror node endpoints.

#### 8. Wallet Connection Modal (`WalletModal.tsx`)
* **Supported Wallets**: HashPack, Blade, and direct Hedera testnet Account ID input (`0.0.X`).
* **Zero Private Key Policy**: Explains non-custodial signing security.

---

## 4. Blockchain & Protocol Details

* **Blockchain**: Hedera Testnet
* **Asset**: Native HBAR (1 HBAR = 100,000,000 tinybars)
* **Settlement Method**: `cryptoTransfer` with invoice ID reference memo
* **Explorer**: [Hedera HashScan Testnet](https://hashscan.io/testnet)
* **Treasury Receiving Account**: `0.0.5109822`

---

## 5. Build & Test Verification

* **Unit & Integration Tests**: 20/20 test cases passing via Vitest (`tests/perpay.test.mjs`).
* **TypeScript Compilation**: `tsc` compiles with 0 errors.
* **Production Bundle**: Built via Vite (`npm run build`) producing optimized assets in `dist/`.
