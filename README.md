# Ledger: AI Expense Management System

Ledger is a full stack web application that automates submitting, verifying, categorizing, approving, and analyzing employee expense claims. It uses OCR and AI to read receipts, classify expenses, detect duplicate or suspicious claims, and route each claim through a multi level approval workflow, so finance and management teams spend less time on manual data entry and more time on the claims that actually need a human decision.

**Live application:** [https://ledger-zeta-gules.vercel.app](https://ledger-zeta-gules.vercel.app)

| | |
|---|---|
| Frontend | React and Vite, deployed on Vercel |
| Backend | Node.js and Express, deployed on Render |
| Database, auth, storage | Supabase (PostgreSQL) |
| AI | Groq API, Llama 3.3 70B |
| OCR | Tesseract.js with Sharp preprocessing |

## Table of contents

1. [Overview](#overview)
2. [Live demo](#live-demo)
3. [Core features](#core-features)
4. [How a claim moves through the system](#how-a-claim-moves-through-the-system)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [Database schema](#database-schema)
8. [Environment variables](#environment-variables)
9. [Running the project locally](#running-the-project-locally)
10. [API reference](#api-reference)
11. [Deployment](#deployment)
12. [Security model](#security-model)
13. [Known limitations](#known-limitations)

## Overview

An employee uploads a photo or PDF of a receipt. The backend runs OCR to extract the text, parses out the merchant, amount, date, and tax details, sends the extracted text to an AI model for categorization and fraud scoring, and saves the result. The employee sees the full outcome immediately: extracted merchant and amount, an AI assigned category with a confidence percentage, and a fraud score with a plain language explanation.

From there the claim moves through manager approval and finance approval before being marked reimbursed. Every step is visible in real time to the relevant role, and access is enforced by row level security at the database layer rather than only in the UI, so the rules hold even if a request bypasses the frontend entirely.

## Live demo

Try the app at [ledger-zeta-gules.vercel.app](https://ledger-zeta-gules.vercel.app).

Signup is open, but role assignment is automatic and not left to the person registering:

- The first account ever created on a deployment becomes an **admin** automatically.
- Every account created after that becomes a standard **employee**.
- Additional roles (manager, finance, hr) are assigned afterward by an admin or hr user from inside the app, not at signup.

The backend runs on Render's free tier, which spins down after a period of inactivity. If the app has been idle, the first request can take 30 to 50 seconds to respond while the server wakes up. This is expected behavior, not an error.

## Core features

**Receipt intelligence**
- Receipt upload supporting both image files and PDF documents
- OCR text extraction using Tesseract.js, with image preprocessing (resize, grayscale, normalize) via Sharp
- PDF to image conversion using pdfjs-dist and napi-rs canvas, so PDFs go through the same OCR pipeline as photos
- Deterministic, regex based extraction of total amount and GST from OCR text. This is done in code rather than by the AI model, since language models are unreliable at exact arithmetic
- Automatic OCR error correction: the extracted total and GST are cross checked against India's official GST slabs (0, 0.25, 3, 5, 12, 18, 28 percent), and misread leading digits are corrected when the numbers do not imply a valid slab
- Manual entry fallback: if a total cannot be detected automatically, the employee is prompted to enter the amount, GST, date, and category by hand rather than the system guessing
- AI categorization into nine expense categories, with a confidence score, via the Groq API (model: llama-3.3-70b-versatile)

**Fraud and duplicate detection**
- A SHA-256 hash of employee, amount, date, and merchant is checked against existing claims before anything is saved. A match is rejected outright with a 409 response rather than being silently accepted and only flagged, so a true duplicate never creates a second row
- A claim that was previously rejected does not count as a block, so a legitimately corrected resubmission is still allowed
- An LLM based fraud score from 0 to 1 with a written reason, for everything that passes the duplicate check
- Automatic routing: claims with a fraud score of 0.75 or higher skip manager approval and go straight to finance review

**Claim management**
- A visible AI results panel shown to the employee immediately after submission
- Employees can withdraw or delete their own claim at any point before it has been approved. Once a claim is approved it becomes a settled record and can no longer be deleted
- Real time claim status tracking with totals for amount claimed, claims in review, and claims approved

**Approval workflow**
- Multi level approval: employee, then manager, then finance, with an approvals table logging every decision and an optional comment
- In app notifications on every status change, with an unread count badge

**Admin and reporting tools**
- Admin analytics dashboard: total claims, total value, fraud flagged count, plus a pie chart of spend by category, a bar chart of claims by status, and a line chart of spend over time, built with Recharts
- Report generator: filter by monthly, quarterly, or yearly period, with claim count, total value, approved and paid value, category breakdown, and CSV export
- In app user management: admins and hr users can create new accounts and change an existing user's role from a dropdown, without touching the database directly

## How a claim moves through the system

1. Employee uploads a receipt (image or PDF) via `POST /api/expenses/submit`.
2. If the file is a PDF, its first page is rendered to a PNG buffer.
3. The image buffer is preprocessed with Sharp, then passed to Tesseract for OCR.
4. `extractTotal()` and `extractGst()` pull the total and tax figures from the OCR text using regex.
5. `correctTotalUsingGst()` checks whether the implied GST rate is valid. If not, it tests digit stripped variants of both the total and GST and picks the combination that produces a valid slab.
6. `parseWithGroq()` sends the OCR text to the LLM to get the merchant name, expense date, category, and category confidence.
7. A SHA-256 hash of employee id, amount, expense date, and merchant name is computed. If a non rejected claim with the same hash already exists, the submission is rejected immediately with a 409 response and nothing is inserted. Otherwise `checkFraud()` sends the parsed claim and OCR text to the LLM for a fraud score and fraud reason.
8. The claim is inserted into `expenses` with status `pending`, or `finance_review` if the fraud score is 0.75 or higher.
9. The employee sees the full result (merchant, amount, category, confidence, fraud score, fraud reason) in the UI immediately, and can delete the claim from here if needed, as long as it has not yet been approved.
10. A manager (or finance, if auto routed) approves or rejects the claim. This inserts a row into `approvals` and a row into `notifications` for the employee.
11. Finance gives final approval, updating status to `approved`.

Flow summary: `employee submits` then `manager review` then `finance review` then `approved`, with an automatic shortcut straight to `finance review` for anything the fraud check flags.

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React, Vite, Tailwind CSS | Component based UI |
| Charts | Recharts | Admin analytics dashboard |
| Icons | Lucide | Consistent icon set across the UI |
| Frontend data access | Supabase JS client | Reads and realtime, using the restricted anon key |
| Backend runtime | Node.js, Express | Persistent server process, not serverless |
| File upload | Multer | Handles multipart receipt uploads |
| OCR | Tesseract.js | Runs against a preprocessed image buffer |
| Image preprocessing | Sharp | Resize, grayscale, normalize before OCR |
| PDF handling | pdfjs-dist, napi-rs canvas | Converts the first page of a PDF into an image |
| External API calls | Axios | Used for Groq API requests |
| Hashing | Node's built in crypto module | SHA-256 duplicate detection |
| Database, auth, storage | Supabase (PostgreSQL) | Row level security enforced at the database layer |
| AI | Groq API, model llama-3.3-70b-versatile | Used only for categorization and fraud scoring, never for numeric extraction |
| Frontend hosting | Vercel | |
| Backend hosting | Render, as a persistent web service | Chosen because OCR requests can exceed typical serverless execution limits |

Note on deviations from the original project brief: the original spec suggested Python (FastAPI or Flask), Tesseract or Google Vision, and AWS, Azure, or GCP. This build uses Node and Express instead of Python, and Tesseract instead of Google Vision, since Google Vision requires a linked billing account even on its free tier, and this project was built with no billing setup anywhere. Supabase replaces a separately provisioned database, auth service, and storage bucket with a single free tier product covering all three.

## Project structure

```
expense-ai/
├── backend/
│   ├── config/
│   │   └── supabase.js          Supabase client using the service role key
│   ├── routes/
│   │   ├── expenses.js          submit, submit-manual, and delete endpoints
│   │   ├── parse.js             standalone OCR text parsing endpoint
│   │   └── admin.js             public self-registration and admin user creation
│   ├── utils/
│   │   ├── receiptParser.js     extractTotal, extractGst, correctTotalUsingGst,
│   │   │                        parseWithGroq, checkFraud, evaluateGstConsistency
│   │   └── pdfToImage.js        pdfBufferToImageBuffer
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── SubmitExpenseForm.jsx
    │   │   ├── ClaimsList.jsx
    │   │   ├── StatusStamp.jsx
    │   │   ├── NotificationBell.jsx
    │   │   ├── ReportGenerator.jsx
    │   │   ├── AddUserForm.jsx
    │   │   ├── AmbientBackground.jsx
    │   │   ├── AnimatedNumber.jsx
    │   │   ├── PasswordInput.jsx
    │   │   └── Reveal.jsx
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── ManagerDashboard.jsx
    │   │   ├── FinanceDashboard.jsx
    │   │   ├── HRDashboard.jsx
    │   │   └── AdminDashboard.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── hooks/
    │   │   └── useTilt.js
    │   ├── lib/
    │   │   ├── supabase.js
    │   │   └── formatters.js
    │   ├── utils/
    │   │   └── periods.js       getPeriodKey, formatPeriodLabel, matchesPeriod
    │   ├── App.jsx
    │   └── index.css            design tokens, animation, and layout classes
    ├── package.json
    └── .env
```

## Database schema

Run in the Supabase SQL editor:

```sql
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text check (role in ('employee','manager','finance','admin','hr')) default 'employee',
  manager_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles(id) not null,
  receipt_url text,
  merchant_name text,
  amount numeric,
  gst_amount numeric,
  expense_date date,
  category text,
  ai_category_confidence numeric,
  fraud_score numeric,
  fraud_reason text,
  duplicate_hash text,
  status text check (status in ('pending','manager_review','finance_review','approved','rejected')) default 'pending',
  created_at timestamptz default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id),
  approver_id uuid references profiles(id),
  decision text check (decision in ('approved','rejected')),
  comment text,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);
```

Row level security is enabled on all four tables. Employees can only select their own rows in `expenses`. Managers can select rows where `expenses.employee_id` reports to them (`profiles.manager_id = auth.uid()`). Finance, hr, and admin roles can select all rows. Two `security definer` helper functions, `get_my_role()` and `is_my_report(uuid)`, are used inside the policies to avoid the infinite recursion that occurs when a policy on `profiles` queries `profiles` directly.

A Supabase Storage bucket named `receipts` must exist and be set to public, so uploaded files are retrievable by URL.

## Environment variables

Backend, in `backend/.env`:

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key, backend only |
| `GROQ_API_KEY` | API key for the Groq API |

Frontend, in `frontend/.env`:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_API_URL` | Base URL of the deployed or local backend |

The service role key must only ever be used in the backend. It bypasses row level security and must never be exposed to the browser. The frontend uses the restricted anon key, which relies entirely on the row level security policies above to enforce access control.

## Running the project locally

Backend:

```
cd backend
npm install
node server.js
```

Frontend, in a separate terminal:

```
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default (Vite), and expects the backend to be reachable at the URL set in `VITE_API_URL`. When running both locally, that should point at `http://localhost:5000` (or whatever `PORT` you set on the backend).

## API reference

| Method | Endpoint | Auth required | Purpose |
|---|---|---|---|
| GET | `/api/health` | None | Confirms the backend is running |
| POST | `/api/expenses/submit` | None (employee id in body) | Full pipeline: OCR, parsing, categorization, fraud check, insert |
| POST | `/api/expenses/submit-manual` | None (employee id in body) | Completes a claim by hand when automatic total detection fails |
| DELETE | `/api/expenses/:id` | None (employee id in query) | Deletes a claim owned by the caller, unless it is already approved |
| POST | `/api/expenses/parse` | None | Standalone regex plus Groq parsing of raw OCR text, without saving anything |
| POST | `/api/admin/register` | None, public signup | Creates an account. The first ever account becomes admin, every account after that becomes employee |
| POST | `/api/admin/create-user` | Bearer token, admin or hr role | Creates a Supabase Auth user and a matching profile in one call, with an explicit role |

Details worth noting:

- `POST /api/expenses/submit` returns `{ expense: {...} }` on success, or `{ error: "..." }` with a 422 status for recoverable failures such as no total detected, and 409 specifically for a detected duplicate.
- `POST /api/admin/create-user` whitelists the role against a fixed list (`employee`, `manager`, `finance`, `admin`, `hr`). If the caller is an hr user rather than an admin, the assigned role is forced to `employee` regardless of what was requested, so hr accounts cannot grant elevated roles.

## Deployment

Frontend: Vercel, root directory `frontend`, environment variables set in the Vercel project settings. A new deployment is required after changing an environment variable, since Vite bakes these values in at build time rather than reading them at runtime.

Backend: Render, as a persistent web service rather than a serverless function, root directory `backend`, build command `npm install`, start command `node server.js`, environment variables set in the Render service settings. A persistent process was chosen because Tesseract OCR requests can take longer than the execution time typically allowed on serverless platforms.

Cross origin configuration: the backend's CORS allowlist must include the exact frontend origin, scheme and host only, with no trailing path or trailing slash, since browsers send the `Origin` header without one. A mismatch here causes every request from the deployed frontend to fail with a CORS error even though the backend itself is reachable.

Live deployment: [https://ledger-zeta-gules.vercel.app](https://ledger-zeta-gules.vercel.app)

## Security model

Row level security on every table means access control is enforced by PostgreSQL itself, independent of the frontend code. A request that bypasses the UI entirely and queries Supabase directly with a valid employee session still cannot read another employee's claims, since the policy is evaluated on every query regardless of where it originates.

On the backend, routes that create or modify accounts with elevated privileges are additionally guarded in application code. `POST /api/admin/create-user` requires a valid Supabase session token and checks the caller's role in `profiles` before proceeding, rejecting the request with 401 if the token is missing or invalid, and 403 if the caller is not an admin or hr user. The public registration endpoint deliberately never accepts a role from the request body. Role is always derived server side, so a crafted request cannot self assign admin access.

## Known limitations

OCR accuracy depends on receipt image quality. Very blurry or low contrast receipts may fail to extract a total, in which case the employee is prompted to enter it manually rather than the system guessing.

Duplicate detection is based on an exact match of employee, amount, date, and merchant name. A genuine duplicate receipt that OCRs to a slightly different merchant spelling between submissions will not be caught by this check, since it relies on an exact hash rather than a fuzzy match.

The first account ever created on a deployment automatically becomes admin. Anyone who deploys their own instance of this project should register immediately after setup to claim that account, since a later signup will only ever receive an employee role.

Notifications are in app only and are not delivered by email.

The Render free tier spins down after a period of inactivity, so the first request after idle time can take 30 to 50 seconds to respond.

