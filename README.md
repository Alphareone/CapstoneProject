# ClearBid NJ — SIPPRI (Intelligence System for Pre-Auction Properties and Real Estate Insights)

🌐 **Language / Idioma:** [English](README.md) | [Español](README_ES.md)

> **Capstone Project / APT** — Integrated platform for the evaluation, analysis, and risk diagnosis of judicial and real estate auctions in Mercer County, New Jersey.

---

## 📋 Table of Contents

1. [Executive Summary (Abstract)](https://www.google.com/search?q=%23-executive-summary-abstract)
2. [Business Problem and Solution](https://www.google.com/search?q=%23-business-problem-and-solution)
3. [Architecture and Technology Stack](https://www.google.com/search?q=%23-architecture-and-technology-stack)
4. [Repository Structure](https://www.google.com/search?q=%23-repository-structure)
5. [Development Team and Academic Context](https://www.google.com/search?q=%23-development-team-and-academic-context)
6. [SCRUM Roadmap and Sprint Plan](https://www.google.com/search?q=%23-scrum-roadmap-and-sprint-plan)
7. [Deployment and Quick Start Guide](https://www.google.com/search?q=%23-deployment-and-quick-start-guide)
8. [Authentication Flow and REST API](https://www.google.com/search?q=%23-authentication-flow-and-rest-api)
9. [Quality Assurance (QA) and Pytest Suite](https://www.google.com/search?q=%23-quality-assurance-qa-and-pytest-suite)
10. [Definition of Done (DoD) and KPIs](https://www.google.com/search?q=%23-definition-of-done-dod-and-kpis)
11. [Data Sources and References](https://www.google.com/search?q=%23-data-sources-and-references)

---

## 📌 Executive Summary (Abstract)

This project presents the design and implementation of an integrated software solution focused on optimizing real estate investment decision-making through spatial data analysis and business rules automation. Built on a modern decoupled architecture — using FastAPI and PostgreSQL/PostGIS on the backend alongside React and TypeScript on the frontend — the platform responds to the technical requirements of Duoc UC's Capstone Project framework. The system processes real-time geographical and operational data, executing an automated risk color-coding mechanism (green/yellow/red) to highlight critical thresholds. This document details the architectural design, cloud data modeling, security protocols, and QA strategy required to meet the standards of the Computer Science Engineering degree.

---

## 🎯 Business Problem and Solution

Real estate investors participating in property auctions across New Jersey, USA (Sheriff foreclosures, tax liens, tax deeds, bank-owned REO properties) face fragmented and unverified legal, financial, and physical information prior to bidding. Critical variables — such as surviving liens, title status, occupancy, After Repair Value (ARV), and Return on Investment (ROI) — are difficult to consolidate quickly.

**ClearBid NJ (SIPPRI)** transforms every property into a **"Pre-Bid Intelligence Dossier"**:

* **Interactive Exploration:** Filter opportunities by County, ZIP code, risk status (Green/Yellow/Red), auction type, and price range.
* **Property Dossier (4 Tabs):** Structured breakdown into Financial (ARV, opening bid, suggested max bid), Legal (docket number, title status, encumbrances), Physical (square footage, bedrooms, condition), and Neighborhood areas.
* **Automated Risk Engine:** Real-time evaluation determining investment viability through a traffic light system indicator driven by operational rules.
* **Alerts and Exports:** Asynchronous background processing for CSV/Excel report generation and automated notifications.

---

## 🛠️ Architecture and Technology Stack

### System Architecture Diagram

```text
    ┌────────────────┐       HTTPS / REST      ┌─────────────────────────┐
    │ React 18 SPA   │ ─────────────────────► │ Backend API FastAPI     │
    │ (TypeScript)   │ ◄───────────────────── │ (Uvicorn / Pydantic v2) │
    └────────────────┘                        └────────────┬────────────┘
            │                                              │
        State & UI                               Async     │ SQLAlchemy Async
    (Zustand / Query)                            Jobs      │ (Connection Pooler)
                                                           ▼
    ┌────────────────┐   Task Queue           ┌─────────────────────────┐
    │ Worker Celery  │ ◄───────────────────── │ Supabase PostgreSQL 16  │
    │ (8 processes)  │ ◄───────┐              │ (PostGIS Support)       │
    └────────────────┘         │              └─────────────────────────┘
                               ┌──────┴──────┐
                               │ Redis 7.4   │
                               │ Task Broker │
                               └─────────────┘

```

### Core Components

* **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic v1.14.0.
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet.
* **Database & Persistence:** PostgreSQL 16 + PostGIS (`pg_trgm`) hosted on Supabase Cloud Pooler (`aws-0-us-east-1.pooler.supabase.com:5432`).
* **Security & Authentication:** OAuth (Google, Apple, Facebook), JWT with token rotation, password hashing with Argon2id, 2FA OTP verification via SMTP (Gmail) and Twilio (SMS).
* **DevOps & Async Services:** Docker, Docker Compose, Pytest v8.3.4 (`pytest-asyncio`), Celery v5.6.3, Redis v7.4.11.

---

## 📁 Repository Structure

```text
clearbid-nj/
├── backend/                  # FastAPI REST API, rules engine, and models
│   ├── app/
│   │   ├── api/              # Versioned REST endpoints (/api/v1/)
│   │   ├── core/             # Security, JWT, SMTP OTP, app settings
│   │   ├── db/               # SQLAlchemy models, sessions, and base
│   │   ├── schemas/          # Pydantic schemas and validators
│   │   └── services/         # Risk engine traffic light system and ROI calculations
│   ├── alembic/              # Database migration scripts
│   ├── tests/                # Pytest automated testing suite
│   ├── Dockerfile            # Production container definition
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Web Client React 18 + TypeScript
│   ├── src/
│   │   ├── components/       # Reusable UI components and property cards
│   │   ├── pages/            # Dashboard, Login, 2FA, property details
│   │   ├── store/            # Zustand state management stores
│   │   └── services/         # API Client (Axios / TanStack Query)
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # Academic documentation & Capstone architecture
│   ├── fase_1/               # Phase 1 deliverables (group and individual)
│   ├── arquitectura/         # ERD, C4 diagrams, and OpenAPI specs
│   └── evidencias/           # Execution screenshots and audit evidence
├── docker/                   # Dockerfile and Docker Compose configurations
├── docker-compose.yml        # Multi-container orchestration (API, Redis, Worker)
├── .env.example              # Environment variables template (no secrets)
├── README.md                 # Main repository README (English)
└── README_ES.md              # Repository README (Spanish Version)

```

---

## 👥 Development Team and Academic Context

### Development Team (Team 2 — SCRUM Roles)

| Name | SCRUM Role | Core Responsibilities | Contact |
| --- | --- | --- | --- |
| **Alfredo Benjamín Castro Alarcón** | Backend Lead & Security | REST API (FastAPI), OAuth/JWT authentication, 2FA security | `alf.castro@duocuc.cl` |
| **Cristopher Leonardo Hernández Calderón** | Frontend Lead | Web Interface (React 18 + TS), GIS maps, i18n, Zustand state | `cr.hernandezc@duocuc.cl` |
| **Felipe Calderón Oliva** | Database & Data Engine Lead | PostgreSQL/PostGIS, SQLAlchemy async models, business rules engine | `fel.calderono@duocuc.cl` |
| **Matías Enrique Tirado Jeldes** | DevOps, QA & Async Services | Docker orchestration, async background workers, Pytest suite | `ma.tirado@duocuc.cl` |

### Academic Context & Client

* **Client:** ClearBid NJ, LLC in collaboration with **alloxentric**
* **Institution:** Duoc UC — School of Informatics and Telecommunications (Viña del Mar Campus)
* **Course:** Capstone Project / Proyecto de Título (Computer Science Engineering - Curriculum 1446114)
* **Semester:** 2026-2

---

## 📑 SCRUM Roadmap and Sprint Plan

### Historical Iterations

| Stage / Iteration | Key Achievements | Evidence & Artifacts | Status |
| --- | --- | --- | --- |
| **Phase 1: Local Setup** | Local PostgreSQL 16 schema setup (`clearbid_db` 25 tables), Argon2id hashing, 3 initial sample properties. | pgAdmin 4 queries, preliminary models. | ✅ Completed |
| **Phase 2: Cloud Migration** | Migration to Supabase Cloud, data type normalization (`VARCHAR` vs `bigint`), ingested 11 Mercer County properties. | Supabase ERD visualizer and Table Editor. | ✅ Completed |
| **Phase 2: Security & OTP** | FastAPI auth endpoints, JWT rotation, transition from simulated SMS to real SMTP Gmail OTP dispatch. | Live 2FA flow, Commit `b2f8fe5`. | ✅ Completed |
| **Phase 2: Containerization** | Docker Compose orchestration (FastAPI + Redis 7 + Celery Worker), integrated Pytest suite (10 tests). | Terminal logs, `pytest` run (7 Passed, 3 Failed). | 🟡 85% Completed |

### Recovery Plan & Delivery Milestones (Sprints)

* **Sprint 1: Auth Fixes & Test Remediation (Oct 20–25):** Refactor HTTP status codes (401 Unauthorized for invalid OTP, 201 Created for registration fixes) to achieve 100% passing rate in Pytest. Scrub secrets from `.env`.
* **Sprint 2: Docker & Cloud Integration (Oct 26–31 - Milestone 2):** Clean Docker Compose build connected to Supabase IPv4 Pooler. Merge `feature/frontend` branch into `main`.
* **Sprint 3: Stabilization & Geolocation (Nov 1–15):** Integrate Leaflet/PostGIS mapping view for property spatial visualization and fine-tune ingestion workflow.
* **Duoc UC Capstone Delivery (Nov 16–28):** System demonstration, technical report submission, and academic defense presentation.
* **UTEM / Final Project Handover (Nov 30–Dec 4):** Final project release, technical handoff manuals, and closing retrospective.

---

## 🚀 Deployment and Quick Start Guide

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+)
* [Node.js](https://nodejs.org/) (v18+) & `npm` / `pnpm`
* [Python](https://www.python.org/) (v3.12+)

### 1. Clone Repository & Environment Setup

```bash
git clone https://github.com/Alphareone/CapstoneProject.git
cd CapstoneProject

# Copy environment variables template
cp .env.example .env

```

*Fill out `.env` with your Supabase database connection strings and SMTP credentials.*

### 2. Multi-Container Docker Deployment

To launch all backend services (REST API, Redis, and Celery Worker) locally:

```bash
docker compose up --build -d

```

* **API Interactive Documentation (Swagger UI):** `http://localhost:8000/docs`
* **Healthcheck Endpoint:** `http://localhost:8000/health`

### 3. Running the Frontend Application

```bash
cd frontend
npm install
npm run dev

```

* **Web Application:** `http://localhost:5173`

---

## 🔐 Authentication Flow and REST API

ClearBid NJ implements a Two-Factor Authentication (2FA) flow to safeguard sensitive auction and property data:

```text
[User Registration] ──► Argon2id Hashing ──► Supabase Persistence
                                                  │
[Login Attempt]     ────► JWT Validation  ─────► Generate 6-Digit OTP Code
                                                  │
[SMTP Email Out]    ──────► Sent to Email ─────► [2FA Verification Screen]
                                                           │
[Authorized Session] ◄── Challenge Verified ──────────────┘

```

### Core API Endpoints (`/api/v1/`)

* `POST /api/v1/auth/register` — User registration with Argon2id password hashing.
* `POST /api/v1/auth/login` — First-factor validation and OTP challenge generation.
* `POST /api/v1/auth/2fa/verify` — OTP verification and final JWT access token issuance.
* `GET /api/v1/properties` — Property catalog search with filtering (County, Risk Status, ROI).
* `GET /api/v1/properties/{id}/risk` — Property risk traffic light evaluation and rule breakdown.

---

## 🧪 Quality Assurance (QA) and Pytest Suite

Automated integration and unit tests run inside the backend container using `pytest`.

### Running Automated Tests

```bash
docker compose exec api pytest -v

```

### Audit Findings & Remediation Plan

During the Phase 2 assessment, 10 automated test cases were executed (execution time 1.66s):

* **PASSED (7):** Property catalog querying, password hashing, valid OTP validation, and Pydantic schemas.
* **FAILED (3 - In Progress):**
1. `test_2fa_wrong_code`: Update assertion to return `HTTP 401 Unauthorized` when entering an invalid OTP code (previously returned `200 OK`).
2. `test_register_duplicate_email`: Adjust assertion matching for `HTTP 201 Created` status code.
3. `test_register_login_2fa_flow`: Align test suite assertions with the updated SMTP email dispatch logic.



---

## 📊 Definition of Done (DoD) and KPIs

### Definition of Done (DoD)

A task or feature is marked **DONE** only when:

1. Acceptance criteria are covered and verified by automated unit/integration test cases.
2. Code is merged into the `main` branch via Pull Request and verified clean of exposed secrets or credentials.
3. API endpoints return standard HTTP status codes.
4. Deployment is validated in Docker Compose / Netlify without hanging or orphan processes.
5. All API keys, passwords, and real OTP tokens are excluded from git history and public commits.

### Key Performance Indicators (KPIs)

* **Critical Test Coverage:** Target of `100%` test pass rate prior to the final academic defense.
* **Data Consistency:** `100%` alignment between Supabase stored data, API JSON payloads, and React UI state.
* **Reproducible Build:** One-command setup (`docker compose up`) verified on clean environments.

---

## 📚 Data Sources and References

1. **Mercer County Sheriff's Office (2026):** *Sheriff's Foreclosure Sales List and Guidelines*. Public standards for execution sales. [Mercer Sheriff's Office](https://www.mercercounty.org/government/sheriff-/informational/sheriff-s-foreclosure-sale)
2. **Mercer County Clerk — RecordsNG (2026):** *Public Records Search for Title and Mortgages*. Title and lien verification case study for *4216 Nottingham Way, Hamilton Twp (Block 1853, Lot 19)*. [Mercer RecordsNG](https://records.mercercounty.org/RecordsNG_Search/)
3. **Official Project Repositories:**
* Active Code & Testing Suite: [Pruebas_Proyecto_ClearBidNJ](https://github.com/Alphareone/Pruebas_Proyecto_ClearBidNJ.git)
* Academic Documentation: [CapstoneProject](https://github.com/Alphareone/CapstoneProject.git)



---
