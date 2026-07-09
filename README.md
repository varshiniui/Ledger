# Ledger — AI Expense Management System

Ledger is a full stack web application that automates submitting, verifying, categorizing, approving, and analyzing employee expense claims, using OCR and AI to read receipts, classify expenses, detect duplicate or suspicious claims, and route each claim through a multi level approval workflow.

## Table of contents

1. Overview
2. Core features
3. How a claim moves through the system
4. Tech stack
5. Project structure
6. Database schema
7. Environment variables
8. Running the project locally
9. API reference
10. Deployment
11. Security model
12. Known limitations

## Overview

An employee uploads a photo or PDF of a receipt. The backend runs OCR to extract the text, parses out the merchant, amount, date, and tax details, sends the extracted text to an AI model for categorization and fraud scoring, and saves the result. The claim then moves through manager approval and finance approval before being marked reimbursed. Every step is visible in real time to the relevant role, enforced by row level security at the database layer, not just in the UI.

## Core features

- Landing page with feature overview, shown before login
- Email and password authentication via Supabase Auth
- Receipt upload supporting both image files and PDF documents
- OCR text extraction using Tesseract.js, with image preprocessing (resize, grayscale, normalize) via Sharp
- PDF to image conversion using pdfjs-dist and napi-rs canvas, so PDFs go through the same OCR pipeline as photos
- Deterministic regex based extraction of total amount and GST from OCR text (not AI, since LLMs are unreliable at arithmetic)
- Automatic OCR error correction: cross checks the extracted total and GST against India's official GST slabs (0, 0.25, 3, 5, 12, 18, 28 percent) and corrects misread leading digits when the numbers do not imply a valid slab
- AI categorization into nine expense categories, with a confidence score, via the Groq API (model: llama-3.3-70b-versatile)
- Two layer fraud detection: a SHA-256 hash based duplicate check (employee + amount + date + merchant), and an LLM based fraud score (0 to 1) with a written reason
- Automatic routing: claims with fraud_score >= 0.75 skip manager approval and go straight to finance_review
- Visible AI results panel shown to the employee immediately after submission (extracted fields, category with confidence percent, fraud score with a visual meter and reason text)
- Multi level approval workflow: employee -> manager -> finance, with an approvals table logging every decision and optional comment
- In app notifications on status change, with an unread count badge
- Admin analytics dashboard: total claims, total value, fraud flagged count, plus a pie chart (spend by category), bar chart (claims by status), and line chart (spend over time), built with Recharts
- Report generator: filter by monthly, quarterly, or yearly period, with claim count, total value, approved and paid value, category breakdown, and CSV export for the selected period
- In app user management: admins can create new users (email, password, name, role) and change any existing user's role from a dropdown, without touching the database directly

## How a claim moves through the system

1. Employee uploads a receipt (image or PDF) via `POST /api/expenses/submit`.
2. If the file is a PDF, its first page is rendered to a PNG buffer.
3. The image buffer is preprocessed with Sharp, then passed to Tesseract for OCR.
4. `extractTotal()` and `extractGst()` pull the total and tax figures from the OCR text using regex.
5. `correctTotalUsingGst()` checks whether the implied GST rate is valid; if not, it tests digit stripped variants of both the total and GST and picks the combination that produces a valid slab.
6. `parseWithGroq()` sends the OCR text to the LLM to get merchant_name, expense_date, category, and category_confidence.
7. A SHA-256 hash of employee_id + amount + expense_date + merchant_name is computed and checked against existing rows in `expenses`. If it matches, fraud_score is set to 1 without another LLM call. Otherwise `checkFraud()` sends the parsed claim and OCR text to the LLM for a fraud_score and fraud_reason.
8. The claim is inserted into `expenses` with status `pending`, or `finance_review` if fraud_score >= 0.75.
9. The employee sees the full result (merchant, amount, category, confidence, fraud score, fraud reason) in the UI immediately.
10. A manager (or finance, if auto routed) approves or rejects via a direct Supabase update, which also inserts a row into `approvals` and a row into `notifications` for the employee.
11. Finance gives final approval, updating status to `approved`.

## Tech stack

Frontend: React, Vite, Tailwind CSS, Recharts, Lucide icons, Supabase JS client.

Backend: Node.js, Express, Multer (file upload handling), Tesseract.js (OCR), Sharp (image preprocessing), pdfjs-dist and napi-rs canvas (PDF to image), Axios (Groq API calls), crypto (Node built in, for duplicate hashing).

Database, auth, and storage: Supabase (PostgreSQL, Supabase Auth, Supabase Storage).

AI: Groq API, model llama-3.3-70b-versatile, used for categorization and fraud scoring only, never for numeric extraction.

Deployment: frontend on Vercel, backend on Render (persistent Node process, not serverless, since OCR requests can exceed typical serverless execution limits).

Note on deviations from the original spec: the original brief suggested Python (FastAPI/Flask), Tesseract or Google Vision, and AWS/Azure/GCP. This build uses Node/Express instead of Python, and Tesseract instead of Google Vision, since Google Vision requires a linked billing account even on its free tier and this project was built with zero billing setup anywhere. Supabase replaces a separately provisioned cloud database, auth service, and storage bucket with a single free tier product covering all three.

## Project structure

```
expense-ai/
├── backend/
│   ├── config/
│   │   └── supabase.js          Supabase client using the service role key
│   ├── routes/
│   │   ├── expenses.js          POST /api/expenses/submit (full pipeline)
│   │   └── admin.js             POST /api/admin/create-user (admin only)
│   ├── utils/
│   │   ├── receiptParser.js     extractTotal, extractGst, correctTotalUsingGst,
│   │   │                        parseWithGroq, checkFraud
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
    │   │   ├── Dashboard.jsx
    │   │   ├── ManagerDashboard.jsx
    │   │   ├── FinanceDashboard.jsx
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
  role text check (role in ('employee','manager','finance','admin')) default 'employee',
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

Row level security is enabled on all four tables. Employees can only select their own rows in `expenses`. Managers can select rows where `expenses.employee_id` reports to them (`profiles.manager_id = auth.uid()`). Finance and admin roles can select all rows. Two `security definer` helper functions, `get_my_role()` and `is_my_report(uuid)`, are used inside the policies to avoid infinite recursion that occurs when a policy on `profiles` queries `profiles` directly.

A Supabase Storage bucket named `receipts` must exist and be set to public, so uploaded files are retrievable by URL.

## Environment variables

Backend (`backend/.env`):

```
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

Frontend (`frontend/.env`):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
VITE_API_URL=your_backend_url
```

The service role key must only ever be used in the backend. It bypasses row level security and must never be exposed to the browser. The frontend uses the restricted anon key, which relies on the row level security policies above to enforce access control.

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

The frontend runs on `http://localhost:5173` by default (Vite), and expects the backend to be reachable at the URL set in `VITE_API_URL`.

## API reference

`GET /api/health`
Returns `{ status: "ok" }`. Used to confirm the backend is running.

`POST /api/expenses/submit`
Multipart form data. Fields: `receipt` (file, image or PDF), `employee_id` (uuid). Runs the full OCR, parsing, categorization, and fraud detection pipeline, and inserts a row into `expenses`. Returns `{ expense: {...} }` on success, or `{ error: "..." }` with a 200 status for recoverable failures such as no total detected.

`POST /api/admin/create-user`
JSON body: `{ email, password, full_name, role }`. Requires an `Authorization: Bearer <access_token>` header for a user whose profile role is `admin`; otherwise returns 401 or 403. Creates a Supabase Auth user and a matching `profiles` row in one call.

## Deployment

Frontend: Vercel, root directory `frontend`, environment variables set in the Vercel project settings.

Backend: Render, as a web service (not a serverless function), root directory `backend`, build command `npm install`, start command `node server.js`, environment variables set in the Render service settings. A persistent process was chosen specifically because Tesseract OCR requests can take longer than the execution time typically allowed by serverless platforms.

## Security model

Row level security on every table means access control is enforced by PostgreSQL itself, independent of the frontend code. A request that bypasses the UI entirely and queries Supabase directly with a valid employee session still cannot read another employee's claims, since the policy is evaluated on every query regardless of where it originates.

## Known limitations

OCR accuracy depends on receipt image quality; very blurry or low contrast receipts may fail to extract a total, in which case the employee is prompted to enter it manually rather than the system guessing.

Notifications are in app only, not delivered by email.

The Render free tier spins down after a period of inactivity, so the first request after idle time can take 30 to 50 seconds to respond.