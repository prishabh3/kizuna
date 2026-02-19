# Kizuna DX (絆 DX)

> **Enterprise HR & Project Management System** — Modernizing Legacy Infrastructure with the Strangler Fig Pattern

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

---

## 🏗 The Legacy Modernization Story

Kizuna DX was born from a real-world enterprise challenge: a manufacturing company's HR and project management data lived across **two incompatible systems** — a structured MySQL database used by HR compliance teams, and a MongoDB collection that grew organically over years, accumulating inconsistently named fields and technical debt.

Key data integrity problems in the legacy system:
- Task titles could live in `title`, `name`, OR `task_name`
- Task statuses ranged from string literals to integer codes
- Assignee fields were split between `assignee`, `owner`, and `member`
- Priority was inconsistent across different modules

### The Strangler Fig Pattern

Rather than a risky Big Bang rewrite, Kizuna DX applied the **Strangler Fig Pattern**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        KIZUNA DX ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Next.js Frontend (Port 3000)                                       │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│   │ HR Dashboard│  │ Kanban Board │  │ Agentic API Bridge      │   │
│   │ (Module A)  │  │ (Module B)   │  │ (Module C)              │   │
│   └──────┬──────┘  └──────┬───────┘  └───────────┬─────────────┘   │
│          │                │                       │                  │
│   ───────────────────────────────────────────     │                  │
│          ▼                ▼                       ▼                  │
│   Express Backend (Port 4000)                                        │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  /api/users  │  /api/tasks  │  /api/agent/parse-docs        │  │
│   ├──────────────┤  ┌───────────┤                                │  │
│   │              │  │ Legacy    │  → Language Detection          │  │
│   │  RBAC Auth   │  │ Adapter   │  → Intent Extraction          │  │
│   │  Middleware  │  │ Middleware │  → Schema Inference           │  │
│   │              │  │ (THE KEY) │  → Ticket Assembly            │  │
│   └──────┬───────┘  └─────┬─────┘                               │  │
│          │                │                                       │  │
│   ───────────────────────────────────────────────────────────    │  │
│          ▼                ▼                                       │  │
│   ┌─────────────┐  ┌──────────────────────────────────────┐     │  │
│   │   MySQL     │  │   MongoDB                            │     │  │
│   │  (Prisma)   │  │  LegacyTasks  AuditLogs  ApiDocs    │     │  │
│   │  HR Clean   │  │  (Messy legacy data → normalized)   │     │  │
│   │  Data       │  │                                      │     │  │
│   └─────────────┘  └──────────────────────────────────────┘     │  │
└──────────────────────────────────────────────────────────────────────┘
```

**The Legacy Adapter Middleware** (`backend/src/middleware/legacyAdapter.ts`) is the strangler fig itself — it wraps the old chaotic data, resolves conflicting field names, and outputs clean, typed `NormalizedTask` objects. The frontend never sees the mess.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Module A: HR Dashboard** | Metrics cards, employee CRUD with role-based access, real-time data |
| **Module B: Kanban Board** | dnd-kit drag & drop, fetches legacy MongoDB data through the adapter |
| **Module C: AI Bridge** | Parse raw technical docs → structured Jira ticket (4-stage agent pipeline) |
| **Audit Log** | Every action tracked in MongoDB, viewable with pagination |
| **Swagger UI** | Full API documentation at `http://localhost:4000/api-docs` |

---

## 🚀 Quick Start with Docker

**Prerequisites:** Docker Desktop installed and running.

### 1. Clone and enter the project

```bash
git clone <repository-url> kizuna
cd kizuna
```

### 2. Copy the environment file

```bash
cp .env.example .env
```

### 3. Start all services

```bash
docker-compose up --build
```

This spins up:
- 🟦 **MySQL** on port `3306`
- 🟩 **MongoDB** on port `27017`
- ⚙️  **Express Backend** on port `4000`
- ⚡ **Next.js Frontend** on port `3000`

### 4. Run database migrations and seed data

```bash
# In a separate terminal, run migrations
docker exec kizuna_backend npx prisma migrate dev --name init

# Seed 10 sample users
docker exec kizuna_backend npx ts-node prisma/seed.ts
```

### 5. Open the application

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Main application (HR Dashboard) |
| `http://localhost:3000/kanban` | Kanban Board |
| `http://localhost:3000/agent` | AI Bridge |
| `http://localhost:4000/api-docs` | Swagger UI |

---

## 💻 Local Development (without Docker)

### Backend

```bash
cd backend
npm install
cp .env .env.local   # Edit DATABASE_URL and MONGO_URI to point to local DBs

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed sample data
npx ts-node prisma/seed.ts

# Start dev server
npm run dev
```

### Seed Legacy MongoDB Tasks

After the backend is running, call the seed endpoint:

```bash
curl -X POST http://localhost:4000/api/tasks/seed/legacy
```

This populates MongoDB with intentionally messy, legacy data so you can see the Strangler Fig adapter in action on the Kanban board.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
kizuna/
├── docker-compose.yml
├── .env.example
├── shared/
│   └── types/
│       └── index.ts          ← Shared TypeScript types (frontend + backend)
│
├── backend/
│   ├── src/
│   │   ├── server.ts         ← Express entry point
│   │   ├── db/
│   │   │   └── mongoose.ts   ← MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.ts       ← JWT + RBAC middleware
│   │   │   ├── errorHandler.ts  ← Global error handler
│   │   │   └── legacyAdapter.ts ← 🌟 Strangler Fig adapter
│   │   ├── models/           ← Mongoose models (LegacyTask, AuditLog, ApiDoc)
│   │   ├── routes/           ← Express routers (users, tasks, agent, auditLogs)
│   │   ├── validation/
│   │   │   └── schemas.ts    ← Zod schemas + validate middleware
│   │   └── swagger.ts        ← Swagger spec
│   └── prisma/
│       ├── schema.prisma     ← MySQL schema (User, Attendance, Leave)
│       └── seed.ts           ← Sample data seeder
│
└── frontend/
    ├── messages/
    │   └── en.json           ← English translations
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── dashboard/page.tsx  ← Module A
        │   ├── kanban/page.tsx     ← Module B
        │   ├── agent/page.tsx      ← Module C
        │   └── audit-logs/page.tsx
        ├── components/
        │   └── Navbar.tsx    ← Main navigation
        ├── lib/
        │   └── api.ts        ← Typed Axios API service
        └── middleware.ts     ← Routing middleware
```

---

## 🔒 RBAC & Security

| Role | Can Read | Can Create | Can Edit/Delete |
|------|----------|------------|-----------------|
| `EMPLOYEE` | ✅ | ✅ tasks | ❌ |
| `MANAGER` | ✅ | ✅ tasks | ✅ own tasks |
| `ADMIN` | ✅ | ✅ all | ✅ all |

In development mode, the backend auto-authenticates as the seed Admin user (`hiroshi.tanaka@kizuna.com`) so you can test all features without obtaining a JWT token.

---

## 🤖 AI Agent Pipeline

The `POST /api/agent/parse-docs` endpoint simulates an LLM agent pipeline — **no API key required**:

1. **Content Analysis** — Deep scanning of document structure and text content
2. **Intent Extraction** — Keyword heuristics to infer HTTP method, entity, and priority
3. **Schema Inference** — Generates typed request/response fields per entity type
4. **Ticket Assembly** — Builds a full Jira-style ticket with Given/When/Then acceptance criteria

Try it from the **AI Bridge** page with the built-in example auth spec!

---

## 📡 API Reference

Full interactive documentation available at **`http://localhost:4000/api-docs`** (Swagger UI).

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List users with pagination |
| `POST` | `/api/users` | Create user (Admin only) |
| `GET` | `/api/tasks` | Get normalized tasks (via legacy adapter) |
| `POST` | `/api/tasks/seed/legacy` | Seed messy MongoDB data |
| `PATCH` | `/api/tasks/:id` | Update task status |
| `POST` | `/api/agent/parse-docs` | Parse docs → Jira ticket |
| `GET` | `/api/audit-logs` | Paginated audit trail |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | Next.js 14 (App Router) + TypeScript |
| **UI Components** | Radix UI + Tailwind CSS |
| **Drag & Drop** | dnd-kit |
| **Backend** | Node.js + Express.js + TypeScript |
| **MySQL ORM** | Prisma |
| **MongoDB ODM** | Mongoose |
| **Validation** | Zod |
| **API Docs** | Swagger UI (swagger-jsdoc) |
| **Auth** | JWT (jsonwebtoken) + RBAC |
| **Containerization** | Docker Compose |

---

*Built to demonstrate enterprise-grade dual-database architecture and the Strangler Fig modernization pattern.*
