# SpendPulse — Personal Automatic Expense & Finance Tracker (PWA)

SpendPulse is a privacy-first personal finance tracking Progressive Web App (PWA) that automatically synchronizes, normalizes, deduplicates, categorizes, reconciles, and visualizes financial transactions directly from bank ledgers without manual entry.

Built with **React + TypeScript + Vite + Tailwind CSS** on the frontend and **Node.js + Express + TypeScript** on the backend.

---

## 🌟 Core Product Architecture

```
Financial Provider (Mock / Setu AA)
        │
        ▼
   Sync Service (Cursor Management)
        │
        ▼
   Merchant Normalization (UPI VPA / POS / NEFT)
        │
        ▼
   Deduplication Engine (External ID + 6-Tuple SHA-256 Fingerprint)
        │
        ▼
   Transfer Detector (Cross-Account Linking & Expense Exclusion)
        │
        ▼
   Categorization Engine (Layer 1 Dictionary → Layer 2 User Rules → Layer 3 Learned Preferences → Layer 4 Confidence Scoring)
        │
        ▼
   Database Persistence (PostgreSQL / SQLite)
        │
        ▼
   Reconciliation & Audit Logs (Ledger Discrepancy Verification)
        │
        ▼
   Notification Engine (Web Push & Deduplicated Alerts)
```

---

## 🚀 Key Features

1. **Zero Manual Expense Entry**: Automatic background and on-demand synchronization directly from financial data providers.
2. **True Ledger Source of Truth**: Original raw bank narrations are preserved verbatim alongside clean, human-readable merchant names.
3. **Idempotent Deduplication**: Composite key `account_id + external_transaction_id` with SHA-256 fallback fingerprinting (`account_id | amount | date | merchant | type | reference`).
4. **Pending $\rightarrow$ Posted State Transitions**: In-place updates when transaction states change without creating duplicates.
5. **Cross-Account Transfer Detection**: Inter-account movements (e.g. ₹10,000 from Savings to Credit Card) are detected and excluded from spending and income metrics.
6. **4-Tier Layered Categorization**:
   - **Layer 1**: 120+ Curated Indian Merchants (Swiggy, Zomato, Blinkit, Zepto, DMart, Amazon, Flipkart, Uber, Ola, Jio, Airtel, Netflix, Spotify, etc.)
   - **Layer 2**: User-defined custom matching rules
   - **Layer 3**: Learned preferences from manual corrections
   - **Layer 4**: Heuristics with confidence scores
7. **Recurring Subscriptions Tracker**: Automatically detects monthly cadences and calculates annual run-rates.
8. **Monthly Budgets**: Category limits with 50%, 75%, 90%, and 100% threshold alert color coding.
9. **Factual Financial Insights**: Data-driven, factual observations calculated directly from your ledger (never invented).
10. **Reconciliation Audit Logs**: Continuous integrity checking surfacing missing, updated, and duplicated entries.
11. **Mobile-First Apple-Grade PWA**: Offline data caching, standalone installable mobile display mode, responsive bottom navigation, and Web Push notifications.
12. **CSV & JSON Export**: Instant date-filtered export of your complete normalized transaction ledger.

---

## 🇮🇳 Indian Account Aggregator (AA) Ecosystem & Regulatory Context

Under Reserve Bank of India (RBI) regulations:
- Live production access to bank statements via the Account Aggregator framework requires an RBI/SEBI/IRDAI-regulated **Financial Information User (FIU)** license or onboarding through an authorized FIU Gateway partner (e.g. **Setu Bridge**, **Finvu**, or **OneMoney**).
- For individual developer evaluation, SpendPulse includes a full **Setu/Sahamati ReBIT FIU Gateway Adapter** (which works with Setu Sandboxes or registered client credentials) and a high-fidelity **Mock Financial Provider** simulating real Indian banking environments (UPI, cards, NEFT salaries, ATM withdrawals, and inter-account transfers).
- The UI strictly differentiates between **Live Sync** and **Demo Data**.

---

## 🛠️ Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (Node 22 LTS recommended)
- NPM 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Database with Realistic Indian Banking Data
```bash
npm run seed
```
This populates:
- Demo user (`demo@spendpulse.local` / `password123`)
- Connected HDFC Corporate Salary, ICICI Sapphiro Credit Card, and SBI Savings accounts
- 13+ real Indian merchant transactions across Food, Shopping, Subscriptions, Salary, and Transfers
- Monthly category budgets

### 4. Run Automated Test Suite
```bash
npm test
```
Validates normalization, deduplication, categorization, learned rules, transfer detection, and notification idempotency.

### 5. Start Development Server
```bash
npm run dev
```
- **Client (PWA)**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## 🔒 Security & Privacy

SpendPulse adheres to strict security standards:
- **Zero PIN/Password Storage**: Bank passwords, UPI PINs, ATM PINs, CVVs, and OTPs are never stored or requested.
- **Bcrypt & JWT**: Secure session authentication.
- **Client Sanitization**: Financial provider secrets are strictly isolated on the backend server.

---

## 🚢 Production Deployment

### Option A: Node / Docker / Managed Postgres
1. Set `DATABASE_URL=postgres://user:pass@host:5432/dbname` in `.env`.
2. Build client and server bundles:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start --workspace=server
   ```
The backend automatically serves the built PWA static client on port 4000.

### Option B: Frontend on Vercel / Netlify + Backend on Railway / Render
1. Deploy `client/` to Vercel/Netlify with rewrites pointing `/api/*` to the backend URL.
2. Deploy `server/` to Railway / Render with `DATABASE_URL` and `JWT_SECRET`.
