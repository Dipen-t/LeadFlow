# LeadFlow — Multi-Tenant CRM for Mortgage Brokerages

A full-stack CRM platform purpose-built for mortgage brokerages, featuring multi-tenant data isolation, real-time document verification via background workers, pipeline automation, and role-based dashboards.

---

## What Was Built

LeadFlow is a multi-tenant CRM for mortgage brokerages that manages the complete lead-to-client workflow. Brokerage admins can manage their team, receive leads through the external webhook, identify potential duplicate leads, assign leads to advisors, and manage them through a configurable pipeline. Advisors can work assigned leads, move them through pipeline stages, convert leads into clients, manage client cases, documents, and tasks, while real-time updates keep open screens synchronized. Clients have their own portal where they can log in, view their mortgage case, upload multiple documents, track upload progress, and see document verification status update in real time. Brokerage admins can also configure pipeline stages, email templates, stage-based automations, and task triggers, while dashboards provide an overview of leads, documents, and tasks.

---

## What's Incomplete / What Would Be Improved Next

The core CRM workflow is implemented, but a few areas are intentionally simplified for the assignment. Document verification currently uses a simulated background process with an intentional delay and failure rate instead of a real document/OCR verification provider. Email automation is implemented through the background-job flow, but external email delivery is not connected to a production email provider. Test coverage could be expanded across the lead, document, task, and automation modules, and the frontend could use more comprehensive loading and error states. The authentication flow could also be extended with refresh tokens, and the external webhook could be strengthened with signed requests and replay protection for a production deployment.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Roles & Access Control](#roles--access-control)
- [Core Features](#core-features)
- [API Reference](#api-reference)
- [Real-Time Events](#real-time-events)
- [Background Workers](#background-workers)
- [Testing](#testing)
- [Deployment](#deployment)
- [Git Workflow & Branches](#git-workflow--branches)
- [Default Login Credentials](#default-login-credentials)

---

## Architecture Overview

```
┌─────────────────────────┐      ┌───────────────────────────────┐
│   React Frontend        │◄────►│   Express REST API            │
│   (Vite + TailwindCSS)  │ WS   │   (Node.js + TypeScript)      │
│   Port 5173             │◄────►│   Port 5000                   │
└─────────────────────────┘      └───────────┬───────────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
                   │  MongoDB    │   │    Redis     │   │ Cloudinary  │
                   │  Atlas      │   │  (BullMQ)    │   │  (Storage)  │
                   └─────────────┘   └──────┬───────┘   └─────────────┘
                                            │
                                     ┌──────▼───────┐
                                     │  BullMQ      │
                                     │  Workers     │
                                     │  (Document   │
                                     │  Verification│
                                     │  + Email)    │
                                     └──────────────┘
```

Every API query is scoped by `brokerageId` ensuring complete **tenant data isolation**.

---

## Tech Stack

| Layer         | Technology                                    |
|---------------|-----------------------------------------------|
| Frontend      | React 19, TypeScript, Vite, TailwindCSS 4     |
| UI Components | Lucide Icons, Recharts, @hello-pangea/dnd     |
| State         | Zustand                                       |
| Routing       | React Router v7                               |
| Backend       | Express 5, TypeScript, Node.js                |
| Database      | MongoDB (Mongoose 9)                          |
| Auth          | JWT (jsonwebtoken), bcryptjs                  |
| Queue/Workers | BullMQ + Redis (ioredis)                      |
| File Storage  | Cloudinary (via multer-storage-cloudinary)     |
| Real-time     | Socket.IO                                     |
| Validation    | Zod                                           |
| Logging       | Pino + pino-http                              |
| Security      | Helmet, CORS, express-rate-limit              |
| Testing       | Vitest, Supertest                             |

---

## Project Structure

```
unsquare/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # Sidebar, AdminLayout
│   │   │   └── ui/                  # Reusable UI primitives
│   │   ├── hooks/                   # useSocket, custom hooks
│   │   ├── lib/                     # axios instance, utils
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Role-aware dashboard with charts
│   │   │   ├── ClientPortal.tsx     # Client document upload portal
│   │   │   ├── Login.tsx            # Auth page
│   │   │   ├── Settings.tsx         # Pipeline & automation config
│   │   │   ├── leads/               # Lead management + Kanban board
│   │   │   ├── users/               # User CRUD (admin)
│   │   │   └── tasks/               # Task management
│   │   ├── store/                   # Zustand auth store
│   │   └── App.tsx                  # Root routing + role guards
│   ├── vercel.json                  # SPA routing for Vercel
│   └── package.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                # MongoDB connection
│   │   │   ├── env.ts               # Zod-validated env vars
│   │   │   └── redis.ts             # Redis/ioredis connection
│   │   ├── middleware/
│   │   │   ├── authHandler.ts       # JWT verification + role injection
│   │   │   ├── errorHandler.ts      # Centralized error handling
│   │   │   └── tenantHandler.ts     # brokerageId scoping
│   │   ├── modules/
│   │   │   ├── auth/                # Login, JWT issuance
│   │   │   ├── automations/         # Stage-based email automation
│   │   │   ├── brokerages/          # Brokerage CRUD
│   │   │   ├── clients/             # Client CRUD + lead conversion
│   │   │   ├── dashboard/           # Aggregated metrics
│   │   │   ├── documents/           # Upload, download, delete
│   │   │   ├── leads/               # Lead CRUD + pipeline stage mgmt
│   │   │   ├── pipeline/            # Pipeline stage configuration
│   │   │   ├── tasks/               # Task CRUD + assignment
│   │   │   ├── users/               # User management
│   │   │   └── webhooks/            # External lead ingestion
│   │   ├── jobs/
│   │   │   ├── documentQueue.ts     # BullMQ queue definition
│   │   │   ├── documentWorker.ts    # Simulated document verification
│   │   │   └── emailWorker.ts       # Email dispatch worker
│   │   ├── sockets/                 # Socket.IO event broadcasting
│   │   └── utils/
│   │       ├── errors.ts            # AppError, NotFoundError
│   │       ├── logger.ts            # Pino logger (with header redaction)
│   │       └── cloudinary.ts        # Cloudinary config + multer storage
│   ├── .npmrc                       # legacy-peer-deps for Cloudinary
│   └── package.json
│
├── docs/                            # Phase-by-phase design docs
├── docker-compose.yml               # Local Redis via Docker
├── PRODUCT.md                       # Full product specification
├── PROMPTS.md                       # AI prompt log
└── .gitignore
```

---

## Getting Started

### Prerequisites

| Tool       | Version  | Purpose                        |
|------------|----------|--------------------------------|
| Node.js    | ≥ 18     | Runtime                        |
| npm        | ≥ 9      | Package manager                |
| Docker     | Any      | Local Redis (or use cloud)     |
| MongoDB    | Atlas    | Database (free tier works)     |
| Cloudinary | Free     | Document file storage          |

### Environment Variables

**Server** (`server/.env`):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/leadflow
JWT_SECRET=your_jwt_secret_min_10_chars
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Client** (`client/.env`):

```env
VITE_API_URL=http://localhost:5000
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Dipen-t/LeadFlow.git
cd LeadFlow

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# 1. Start Redis (via Docker)
docker compose up -d

# 2. Start the backend (from /server)
cd server
npm run dev

# 3. Start the frontend (from /client — new terminal)
cd client
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Roles & Access Control

The system enforces strict RBAC at both the API and UI layers:

| Role               | Capabilities                                                                                             |
|--------------------|----------------------------------------------------------------------------------------------------------|
| `PLATFORM_ADMIN`   | Full system access. Manage brokerages, users, view all data across tenants.                              |
| `BROKERAGE_ADMIN`  | Manage their brokerage's users, leads, pipeline stages, automations, tasks. View all brokerage data.     |
| `ADVISOR`          | View/manage only leads assigned to them. Create/complete tasks. View documents of their clients only.    |
| `CLIENT`           | Access their own Client Portal. Upload documents. View their own document status.                        |

**Important:** All queries are filtered by `brokerageId` at the middleware level. An advisor from Brokerage A cannot access data from Brokerage B under any circumstances.

---

## Core Features

### 1. Lead Pipeline Management
- Configurable pipeline stages per brokerage
- Drag-and-drop Kanban board for stage transitions
- Lead status tracking: `NEW` → `CONTACTED` → `QUALIFIED` → `WON` / `LOST`
- Advisor assignment with scoped visibility

### 2. External Webhook Lead Ingestion
- `POST /api/webhooks/lead` accepts external leads (e.g., from forms, landing pages)
- Validates required fields, creates lead, and broadcasts via Socket.IO
- Idempotent — duplicate source references are rejected

### 3. Document Upload & Background Verification
- Clients upload documents through the Client Portal
- Files are stored on **Cloudinary** immediately (HTTP 202 returned)
- A **BullMQ worker** picks up each document for simulated verification
- Status transitions: `PENDING` → `PROCESSING` → `VERIFIED` / `FAILED`
- Real-time status updates pushed via Socket.IO
- Max **10 files** per upload batch
- Sequential upload processing to prevent server overload

### 4. Stage-Based Email Automation
- Configure email templates per pipeline stage
- Supports `{{clientName}}` and `{{advisorName}}` placeholders
- Emails are triggered automatically when a lead enters a stage
- Processed via a dedicated BullMQ email worker

### 5. Task Management
- Create, assign, and track tasks linked to leads
- Dashboard shows pending, overdue, and completed task counts
- Advisors see only their assigned tasks

### 6. Real-Time Dashboard
- **Lead Categories** — Pie chart showing leads by stage
- **Task Distribution** — Bar chart showing task status breakdown
- Advisor-scoped: advisors see only their own metrics
- Live updates via Socket.IO (debounced to prevent race conditions)

---

## API Reference

All endpoints require `Authorization: Bearer <JWT>` unless noted.

| Method   | Endpoint                             | Role(s)                        | Description                       |
|----------|--------------------------------------|--------------------------------|-----------------------------------|
| `POST`   | `/api/auth/login`                    | Public                         | Authenticate and receive JWT      |
| `GET`    | `/api/dashboard/stats`               | Admin, Advisor                 | Dashboard metrics                 |
| `GET`    | `/api/leads`                         | Admin, Advisor                 | List leads (scoped)               |
| `POST`   | `/api/leads`                         | Admin                          | Create a new lead                 |
| `PATCH`  | `/api/leads/:id`                     | Admin, Advisor                 | Update lead (stage, advisor, etc) |
| `POST`   | `/api/webhooks/lead`                 | Public (API Key)               | Ingest lead from external source  |
| `GET`    | `/api/clients`                       | Admin, Advisor                 | List clients                      |
| `POST`   | `/api/clients`                       | Admin, Advisor                 | Convert lead to client            |
| `POST`   | `/api/documents/upload`              | Client                         | Upload document (multipart)       |
| `GET`    | `/api/documents/client/:clientId`    | Client, Advisor, Admin         | List client's documents           |
| `GET`    | `/api/documents/:documentId/download`| Client, Advisor, Admin         | Download document                 |
| `DELETE` | `/api/documents/:documentId`         | Client, Admin                  | Delete document                   |
| `GET`    | `/api/pipeline`                      | Admin, Advisor                 | List pipeline stages              |
| `POST`   | `/api/pipeline`                      | Admin                          | Create pipeline stage             |
| `GET`    | `/api/tasks`                         | Admin, Advisor                 | List tasks                        |
| `POST`   | `/api/tasks`                         | Admin, Advisor                 | Create task                       |
| `PATCH`  | `/api/tasks/:id`                     | Admin, Advisor                 | Update task status                |
| `GET`    | `/api/users`                         | Admin                          | List users                        |
| `POST`   | `/api/users`                         | Admin                          | Create user                       |
| `GET`    | `/api/automations`                   | Admin                          | List automations                  |
| `POST`   | `/api/automations`                   | Admin                          | Create/update automation          |
| `GET`    | `/health`                            | Public                         | Health check                      |

---

## Real-Time Events

Socket.IO events are scoped to `brokerageId` rooms:

| Event                | Direction      | Payload                | Description                        |
|----------------------|----------------|------------------------|------------------------------------|
| `document.processing`| Server → Client| `{ documentId }`       | Document verification started      |
| `document.verified`  | Server → Client| `{ documentId }`       | Document passed verification       |
| `document.failed`    | Server → Client| `{ documentId, reason}`| Document failed verification       |
| `lead.created`       | Server → Client| `{ lead }`             | New lead ingested via webhook      |
| `data.update`        | Server → Client| `{}`                   | Generic refresh trigger            |

---

## Background Workers

| Worker             | Queue              | Concurrency | Retries | Backoff       |
|--------------------|--------------------|-------------|---------|---------------|
| Document Verifier  | `document-queue`   | 5           | 3       | Exponential   |
| Email Dispatcher   | `email-queue`      | 3           | 2       | Fixed 5s      |

The document worker simulates verification with a configurable random failure rate (~40%) and an 8–12 second processing delay per document.

---

## Testing

```bash
cd server
npm test
```

Tests use **Vitest** and **Supertest** for API integration tests. Test files are co-located with modules in `__tests__/` directories.

---

## Deployment

| Service          | Platform       | Notes                                    |
|------------------|----------------|------------------------------------------|
| Backend API      | Render.com     | Web Service, `npm install && npm run build`, Start: `npm start` |
| Frontend         | Vercel         | Framework: Vite, Root: `client/`         |
| Database         | MongoDB Atlas  | Free M0 cluster                          |
| Redis            | Upstash        | Free tier, serverless Redis              |
| File Storage     | Cloudinary     | Free tier (25 credits/month)             |

> **Important:** Set `NODE_ENV=production` and configure all env vars on each platform. The Render build command needs `npm install --legacy-peer-deps && npm run build` due to a Cloudinary peer dependency.

---

## Git Workflow & Branches

Development followed a feature-branch workflow with PRs merged into `main`:

| Branch                          | Purpose                                                     |
|---------------------------------|-------------------------------------------------------------|
| `main`                          | Production-ready code                                       |
| `feat/phase-3`                  | Phase 3: Client portal + document uploads                   |
| `feat/phase-4`                  | Phase 4: Automations + task management                      |
| `feat/phase-5`                  | Phase 5: Dashboard + user management                        |
| `feat/tenant-rbac`              | Tenant isolation + RBAC enforcement                         |
| `feature/refactor-modularity`   | Frontend modular architecture refactor                      |
| `feat/minor-inconsistencies-fix`| Security fixes, auth improvements, bulk upload fixes        |
| `final-inconsistencies`         | Final polish: dashboard charts, socket debouncing, UX fixes |
| `fixed-build-error`             | TypeScript build error resolutions                          |

---

## Default Login Credentials

The following seeded credentials are available for testing. They are also displayed on the login page for convenience:

| Role               | Email                     | Password       |
|--------------------|---------------------------|----------------|
| `PLATFORM_ADMIN`   | `admin@leadflow.com`      | `Admin@123`    |

> After logging in as Platform Admin, you can create additional users with any role through the Users management page.

---

## License

This project was built as an assessment submission. All rights reserved.
