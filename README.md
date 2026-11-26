# VanguardHire — Full-Stack Online Job Portal

**Platform Architect & Super Administrator:** Raghuraj Pratap Singh (`raghurajpratapsingh8787@gmail.com`)

VanguardHire is a full-stack recruitment platform and applicant tracking system (ATS) built with React, TypeScript, Tailwind CSS, Express.js, Mongoose ODM schemas, JWT cookie authentication, Socket.IO real-time updates, and private document storage.

---

## Key Capabilities

### Three Role-Based Workspaces
1. **Job Seeker / Candidate**
   - Profile builder with animated profile completion score, education, work experience, skills, certifications, projects, and portfolio links.
   - Private Resume Manager (PDF/DOC/DOCX upload, magic-byte validation, default selection, replacement, authorized download).
   - Advanced job discovery with 8 server-side filters, debounced search suggestions, saved jobs, and saved search alerts.
   - Multi-step job application flow with screening questions, application timeline tracking, and withdrawal.
2. **Employer / Recruiter**
   - Company profile management, logo upload, and verification requests.
   - Complete job posting lifecycle (`draft`, `pending_approval`, `published`, `paused`, `closed`, `expired`, `rejected`) with edit history and verified-employer publishing enforcement.
   - Applicant Tracking System (ATS) with both Data Table and Pipeline Board views, status transitions, private recruiter-only notes, and authorized candidate resume downloads.
   - Interview scheduler with slot conflict detection and status management.
3. **Super Admin**
   - Platform KPIs and interactive Recharts analytics (application trends, category demand, job status distribution).
   - Moderation queue for job posting approvals/rejections and company verifications.
   - User governance (suspend/reactivate accounts), job category CRUD, complaint resolution, and immutable append-only audit logs.

---

## Technology Stack

- **Frontend (`/src`)**: React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), React Router, TanStack Query, React Hook Form, Zod, Recharts, Lucide React, Socket.IO Client.
- **Backend (`/backend` + `/server.ts`)**: Node.js, Express.js, TypeScript, Mongoose ODM (15 schemas in `/backend/models/schemas.ts`), persistent atomic storage + optional MongoDB Atlas connection (`MONGODB_URI`), JWT access + rotating refresh tokens, bcryptjs, Multer private uploads, Helmet, CORS, `express-rate-limit`, Socket.IO, Nodemailer, server-side TTL cache.

---

## Demo Accounts

All demo accounts are automatically seeded on startup (or manually via `npm run seed`):

| Role | Name | Email | Password | Notes |
| --- | --- | --- | --- | --- |
| **Super Admin** | Raghuraj Pratap Singh | `raghurajpratapsingh8787@gmail.com` | `Admin@1234` | Full platform governance, moderation, audit logs |
| **Employer (Verified)** | David Chen | `recruiter@apexcloud.io` | `Employer@1234` | Verified company (`ApexCloud Systems`), active ATS pipeline |
| **Employer (Unverified)** | Liam Foster | `hr@velocecommerce.com` | `Employer@1234` | Pending verification (tests approval business rule) |
| **Job Seeker** | Maya Lin | `maya.lin@candidate.io` | `Candidate@1234` | Complete profile, uploaded resume, active applications |

---

## Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env` and populate your secrets for production:
   ```bash
   cp .env.example .env
   ```
   - `MONGODB_URI` *(optional)*: MongoDB Atlas connection string. When omitted, VanguardHire runs with a local persistent JSON store (`backend/data/portal-db.json`) so all features work immediately out of the box.
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Cryptographic signing secrets for JWTs.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` *(optional)*: Nodemailer SMTP credentials.

3. **Seed database (optional — runs automatically if empty)**
   ```bash
   npm run seed
   ```

4. **Start development server (port 3000)**
   ```bash
   npm run dev
   ```

5. **Production build & start**
   ```bash
   npm run build
   npm start
   ```

---

## REST API Overview

- **Auth (`/api/auth`)**: `POST /register`, `POST /verify-email`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`, `GET /me`, `PUT /settings`, `PUT /change-password`
- **Public (`/api/public`)**: `GET /home`, `GET /jobs/suggestions`, `GET /jobs`, `GET /jobs/:id`, `GET /companies`, `GET /companies/:id`, `GET /categories`, `POST /newsletter`, `POST /complaints`
- **Candidate (`/api/candidate`)**: `GET /dashboard`, `GET /profile`, `PUT /profile`, `GET/POST/DELETE /saved-jobs`, `GET/POST/DELETE /saved-searches`, `GET/POST/DELETE /resumes`, `PATCH /resumes/:id/default`, `GET /resumes/:id/download`, `GET/POST /applications`, `PATCH /applications/:id/withdraw`
- **Employer (`/api/employer`)**: `GET /dashboard`, `GET/PUT /company`, `POST /company/logo`, `POST /company/verification`, `GET/POST/PUT/DELETE /jobs`, `PATCH /jobs/:id/status`, `GET /applicants`, `PATCH /applicants/:id/status`, `POST /applicants/:id/notes`, `GET/POST /interviews`, `PATCH /interviews/:id`
- **Super Admin (`/api/admin`)**: `GET /overview`, `GET /users`, `PATCH /users/:id/status`, `GET /moderation`, `PATCH /moderation/jobs/:id`, `PATCH /moderation/verifications/:id`, `GET/POST/PUT/DELETE /categories`, `GET /complaints`, `PATCH /complaints/:id`, `GET /audit-logs`, `GET/PUT /settings`
- **Collaboration (`/api/collab`)**: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /messages/threads`, `GET /messages/:applicationId`, `POST /messages`

---

## Security Architecture

- **Authentication & Sessions**: bcrypt password hashing (12 rounds), short-lived JWT access tokens + rotating refresh tokens stored in `HttpOnly` cookies (never persisted to `localStorage`).
- **RBAC & Object Ownership**: Server-side role guards (`super_admin`, `employer`, `candidate`) and ownership validation on jobs, companies, messages, interviews, and resumes. Private recruiter `internalNotes` are stripped from all candidate API responses.
- **File Upload Hardening**: Strict MIME, extension, size (5MB resumes / 2MB logos), and binary magic-byte checks (`%PDF-`, `PK\x03\x04`, PNG/JPEG/WebP), randomized filenames, path-traversal containment, and authenticated download authorization.
- **API Defense**: Helmet security headers, strict CORS allowlist, rate limiting (`express-rate-limit`), CSRF origin/header verification, Zod schema validation, and recursive NoSQL `$`/`.` operator key sanitization.

---

## Testing

Run the pure business-rule and security unit test suite:

```bash
npm test
```

Run TypeScript and build checks:

```bash
npm run lint
npm run build
```
