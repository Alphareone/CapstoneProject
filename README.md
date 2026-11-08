# ClearBid NJ — SIPPRI (System for Intelligence on Pre-Bid Properties & Real Estate Insights)

🌐 **Language / Idioma:** [English](README.md) | [Español](README_ESP.md)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white)

> **Capstone Project / APT** — Integrated platform for evaluation, analysis, and risk assessment of real estate foreclosure auctions in Mercer County, New Jersey.

---

## 📋 Table of Contents

 1. [Abstract](#-abstract)
 2. [Business Problem & Solution](#-business-problem--solution)
 3. [Architecture & Tech Stack](#-architecture--tech-stack)
 4. [Repository Structure & Organization](#-repository-structure--organization)
 5. [Development Team & Academic Context](#-development-team--academic-context)
 6. [Scrum Roadmap & Sprint Tracking](#-scrum-roadmap--sprint-tracking)
 7. [Quickstart & Deployment Guide](#-quickstart--deployment-guide)
 8. [API & Authentication Flow](#-api--authentication-flow)
 9. [QA, Testing & Quality Control](#-qa-testing--quality-control)
10. [Definition of Done & KPIs](#-definition-of-done--kpis)
11. [References & Data Sources](#-references--data-sources)

---

## 📌 Abstract

This project presents the design and implementation of an integrated software solution designed to optimize decision-making processes through spatial data analysis and automated business rules. Built upon a modern decoupled architecture—utilizing FastAPI and PostgreSQL/PostGIS on the backend alongside React and TypeScript on the frontend—the system addresses the technical requirements defined by the Duoc UC Capstone framework. The platform processes geographic and operational information in real-time, executing an automated flagging mechanism (traffic light system) to highlight critical operational thresholds. This document details the architectural design, database modeling, security protocols, and quality assurance strategy required to meet the high-level competencies of the Computer Engineering profile.

---

## 🎯 Business Problem & Solution

Real estate investors participating in New Jersey (USA) property auctions (Sheriff sales, tax liens, tax deeds, bank-owned properties) face fragmented and unverified financial, legal, and physical data before bidding. Key critical variables—such as surviving liens, title status, occupancy, estimated After Repair Value (ARV), and ROI—are difficult to assess quickly.

**ClearBid NJ** converts each property into a verified **"Pre-Bid Intelligence Dossier"**:
- **Interactive Exploration:** Filter opportunities by County, ZIP Code, risk flag (Green/Yellow/Red), auction type, and price range.
- **Property Dossier (4 Tabs):** Detailed breakdowns covering Financial (ARV, opening price, max suggested bid), Legal (docket number, title status, surviving liens), Physical (sqft, bedrooms, condition), and Neighborhood data.
- **Automated Risk Engine:** Real-time risk scoring engine calculating a Green/Yellow/Red traffic light indicator based on custom business rules.
- **Alerts & Exports:** Asynchronous background operations for CSV/Excel data exports and automated notifications (Email, SMS, Push).

---

## 🛠️ Architecture & Tech Stack

### System Architecture Diagram

```
   ┌────────────────┐      HTTPS / REST      ┌─────────────────────────┐
   │ React 18 SPA   │ ─────────────────────► │ FastAPI Backend API     │
   │ (TypeScript)   │ ◄───────────────────── │ (Uvicorn / Pydantic v2) │
   └────────────────┘                        └────────────┬────────────┘
            │                                             │
      State & UI                                Async Jobs│ SQLAlchemy Async
   (Zustand / Query)                                      │ (Connection Pooler)
                                                          ▼
   ┌────────────────┐     Task Queue         ┌─────────────────────────┐
   │ Celery Worker  │ ◄───────────────────── │ Supabase PostgreSQL 16  │
   │ (8 processes)  │ ◄───────┐              │ (PostGIS Enabled)       │
   └────────────────┘         │              └─────────────────────────┘
                       ┌──────┴──────┐
                       │ Redis 7.4   │
                       │ Task Broker │
                       └─────────────┘
```

### Component Details

- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic v1.14.0.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet.
- **Database & Persistence:** PostgreSQL 16 + PostGIS (`pg_trgm`) hosted on Supabase Cloud Pooler (`aws-0-us-east-1.pooler.supabase.com:5432`).
- **Security & Auth:** OAuth (Google, Apple, Facebook), JWT with rotational refresh, Argon2id password hashing, SMTP Email 2FA OTP, Twilio SMS.
- **DevOps & Async Services:** Docker, Docker Compose, Pytest v8.3.4 (`pytest-asyncio`), Celery v5.6.3, Redis v7.4.11.

---

## 📁 Repository Structure & Organization

```text
clearbid-nj/
├── backend/                     # FastAPI REST API, rules engine, and models
│   ├── app/
│   │   ├── api/                 # Versioned REST API endpoints (/api/v1/)
│   │   ├── core/                # Security, JWT, SMTP OTP, settings
│   │   ├── db/                  # SQLAlchemy models, sessions, base
│   │   ├── schemas/             # Pydantic schemas and validators
│   │   └── services/            # Risk Traffic Light engine, ROI calculators
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Pytest automated test suite
│   ├── Dockerfile               # Production container definition
│   └── requirements.txt         # Python dependencies
├── frontend/                    # React 18 + TypeScript web client
│   ├── src/
│   │   ├── components/          # Reusable UI components & Property cards
│   │   ├── pages/               # Dashboard, Login, 2FA, Property details
│   │   ├── store/               # Zustand state stores
│   │   └── services/            # API client (Axios / TanStack Query)
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # Capstone academic documentation & architecture
│   ├── fase_1/                  # Phase 1 deliverables (group & individual)
│   ├── architecture/            # ERD, C4 diagrams, and OpenAPI specifications
│   └── evidence/                # Execution screenshots (Redacted)
├── docker/                      # Dockerfile & docker-compose configurations
├── docker-compose.yml           # Multi-container orchestration (API, Redis, Worker)
├── .env.example                 # Template for environment variables (NO SECRETS)
├── README.md                    # Main repository README (English)
└── README_ES.md                 # Repository README (Spanish version)
```

---

## 👥 Development Team & Academic Context

### Development Team (Team 2 — SCRUM Roles)

| Name | SCRUM Role | Primary Responsibilities | Contact |
| :--- | :--- | :--- | :--- |
| **Alfredo Benjamín Castro Alarcón** | Backend Lead & Security | REST API (FastAPI), OAuth/JWT authentication, 2FA security | `alf.castro@duocuc.cl` |
| **Cristopher Leonardo Hernández Calderón** | Frontend Lead | Web UI (React 18 + TS), GIS maps, i18n, Zustand state | `cr.hernandezc@duocuc.cl` |
| **Felipe Calderón Oliva** | Database & Data Engine Lead | PostgreSQL/PostGIS, SQLAlchemy async models, Risk Rules Engine | `fel.calderono@duocuc.cl` |
| **Matías Enrique Tirado Jeldes** | DevOps, QA & Async Services | Docker orchestration, background workers, Pytest suite | `ma.tirado@duocuc.cl` |

### Academic & Client Context

* **Client:** ClearBid NJ, LLC in collaboration with alloxentric
* **Institution:** Duoc UC — Escuela de Informática y Telecomunicaciones (Sede Viña del Mar)
* **Course:** Capstone Project (Ingeniería Informática - Plan 1446114)
* **Semester:** 2026-2

---

## 📑 Scrum Roadmap & Sprint Tracking

### Historical & Reconstructed Iterations

| Iteration / Stage | Key Accomplishments | Evidence & Artifacts | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1: Local Setup** | Local PostgreSQL 16 schema creation (`clearbid_db` - 25 tables), Argon2id hashing setup, initial 3-property test dataset. | pgAdmin 4 queries, early API models. | ✅ Complete |
| **Phase 2: Cloud Migration** | Migration to Supabase Cloud, schema normalization (handling `VARCHAR` vs `bigint` keys), population of 11 Mercer County properties. | Supabase ERD Visualizer & Table Editor. | ✅ Complete |
| **Phase 2: Security & OTP** | FastAPI auth endpoints, JWT rotation, migration from simulated SMS 2FA to real SMTP Gmail OTP dispatch. | Working 2FA flow, Commit `b2f8fe5`. | ✅ Complete |
| **Phase 2: Containerization** | Docker Compose orchestration (FastAPI + Redis 7 + Celery Worker), Pytest suite setup (10 tests). | Terminal logs, `pytest` run (7 Passed, 3 Failed). | 🟡 85% Complete |

### Recovery & Release Plan (Sprints)

- **Sprint 1: Auth & Test Patching (Oct 20–25):** Refactor authentication status codes (401 Unauthorized for bad OTP, 201 Created for duplicate check) to reach 100% Pytest pass rate. Clean up sensitive data and `.env` files.
- **Sprint 2: Docker & Cloud Integration (Oct 26–31 - Milestone 2):** Perform clean Docker Compose build connecting to IPv4 Supabase Pooler. Merge `feature/frontend` into `main`.
- **Sprint 3: Stabilisation & Geolocation (Nov 1–15):** Integrate geospatial Leaflet/PostGIS mapping for properties and polish admin panel ingesta.
- **Duoc Submission (Nov 16–28):** Project demonstration, technical report submission, and academic defense.
- **UTEM Final Closing (Nov 30–Dec 4):** Final project release, complete manual deliverable, and retrospective closure.

---

## 🚀 Quickstart & Deployment Guide

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+)
- [Node.js](https://nodejs.org/) (v18+) & `npm` / `pnpm`
- [Python](https://www.python.org/) (v3.12+)

### 1. Clone & Configure Environment

```bash
git clone https://github.com/Alphareone/CapstoneProject.git
cd CapstoneProject

# Copy environment template
cp .env.example .env
```

*Fill in `.env` with your Supabase DB connection string and SMTP credentials.*

### 2. Launching with Docker Compose

To build and run all services (API REST, Redis broker, Celery worker) locally:

```bash
docker compose up --build -d
```

- **API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **Healthcheck:** `http://localhost:8000/health`

### 3. Running the Frontend SPA

```bash
cd frontend
npm install
npm run dev
```

- **Web App UI:** `http://localhost:5173`

---

## 🔐 API & Authentication Flow

ClearBid NJ implements a 2-Factor Authentication (2FA) flow to protect access to auction data and user profiles:

```text
[User Registration] ──► Argon2id Password Hash ──► Stored in Supabase
                                 │
[Login Attempt] ──────► Password Check (JWT) ──► Generates 6-digit OTP
                                 │
[SMTP Dispatch] ──────► Email Code sent ────────► [User Verification UI]
                                                         │
[Session Authorization] ◄── Validates OTP Challenge ─────┘
```

### Critical Endpoints (`/api/v1/`)

- `POST /api/v1/auth/register` — Account creation with Argon2id password encryption.
- `POST /api/v1/auth/login` — First factor validation & OTP challenge generation.
- `POST /api/v1/auth/2fa/verify` — OTP code verification and final JWT access token issue.
- `GET /api/v1/properties` — Property catalog listing with filters (County, Risk Level, ROI).
- `GET /api/v1/properties/{id}/risk` — Risk Traffic Light evaluation and rule summary.

---

## 🧪 QA, Testing & Quality Control

Automated testing is executed inside the backend container using `pytest`.

### Running Automated Tests

```bash
docker compose exec api pytest -v
```

### Known Audit Findings & Remediation Plan

During the Phase 2 QA evaluation, 10 automated test cases were executed (1.66s duration):

- **PASSED (7):** Core catalog querying, password hashing, valid OTP verification, Pydantic schema validation.
- **FAILED (3 - In Remediation):**
  1. `test_2fa_wrong_code`: Expects `HTTP 401 Unauthorized` on invalid OTP code (currently returning `200 OK`).
  2. `test_register_duplicate_email`: Expects `HTTP 201 Created` assertion alignment.
  3. `test_register_login_2fa_flow`: Test suite alignment with new SMTP email delivery logic.

---

## 📊 Definition of Done & KPIs

### Definition of Done (DoD)

A story or feature is marked as **DONE** only when:
1. Criteria of acceptance are verified with automated test cases.
2. Code is merged into `main` branch via Pull Request with clear commit history.
3. API endpoints return correct HTTP status codes according to standard contracts.
4. Deployment is verified on Docker Compose / Netlify without orphan processes.
5. All sensitive credentials, API keys, and OTP codes are redacted from commits and public docs.

### Project Tracking KPIs

- **Critical Tests Passed:** Target `100%` before final production milestone.
- **Data Consistency:** `100%` match between Supabase records, API JSON outputs, and React UI card counts.
- **Reproducible Build:** Single-command execution (`docker compose up`) from a clean environment.

---

## 📚 References & Data Sources

1. **Mercer County Sheriff's Office (2026):** *Sheriff's Foreclosure Sales List and Guidelines*. Public foreclosure auction data standards. [Mercer Sheriff Site](https://www.mercercounty.org/government/sheriff-/informational/sheriff-s-foreclosure-sale)
2. **Mercer County Clerk — RecordsNG (2026):** *Public Records Search for Title and Mortgages*. Title and lien validation for Case Study *4216 Nottingham Way, Hamilton Twp (Block 1853, Lot 19)*. [Mercer RecordsNG](https://records.mercercounty.org/RecordsNG_Search/)
3. **Official Repositories:**
   - Active Code & Testing: [Pruebas_Proyecto_ClearBidNJ](https://github.com/Alphareone/Pruebas_Proyecto_ClearBidNJ.git)
   - Academic Documentation: [CapstoneProject](https://github.com/Alphareone/CapstoneProject.git)
