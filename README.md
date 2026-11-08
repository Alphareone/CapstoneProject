# 🏛️ ClearBid NJ — Pre-Auction Intelligence & Real Estate Risk Analytics PlatformInstitutional Real Estate Intelligence Platform — Comprehensive pre-bidding risk analysis, legal title evaluation, automated ROI modeling, and GIS mapping for Sheriff's Foreclosure Sales in New Jersey (focusing on Mercer County).📋 Table of ContentsExecutive SummaryMarket Opportunity & Business SolutionSystem Architecture & Tech StackCloud Infrastructure & DeploymentRepository StructureEngineering Team & StakeholdersAgile Roadmap & Sprint ExecutionGetting Started & Local SetupAuthentication & API ReferenceQuality Assurance (QA) & Test AutomationDefinition of Done (DoD) & Target KPIsData Sources & Legal Disclaimers📌 Executive SummaryClearBid NJ provides real estate investors, private equity funds, and distress-asset buyers with data-driven insights to navigate Sheriff’s Foreclosure Sales across New Jersey. Built on a decoupled cloud architecture—leveraging FastAPI and PostgreSQL/Supabase on the backend alongside a React 18, Vite, and TypeScript frontend—the platform consolidates fragmented legal, tax, and property valuation data in real time.By automating risk scoring via an algorithmic traffic-light indicator (Green / Yellow / Red), ClearBid NJ enables institutional and retail buyers to run automated underwriting pipelines, evaluate title encumbrances, and accurately calculate Maximum Allowable Bids (MAB) before entering county auctions.🎯 Market Opportunity & Business SolutionThe Industry ChallengeParticipating in New Jersey Sheriff Sales (foreclosures, tax liens, bank REOs) is traditionally opaque and high-risk. Investors must manually pull records across county clerk databases, verify superior liens, assess tax arrearages, determine occupancy status, and estimate After Repair Value (ARV)—often with incomplete data and tight auction deadlines.The ClearBid NJ SolutionClearBid NJ transforms raw county foreclosure filings into an Actionable Pre-Bid Dossier:Interactive Deal Finder: Multi-parametric filtering by County (Mercer County pilot), Zip Code, Risk Traffic-Light Score, Auction Type, and Estimated Equity.4-Tab Institutional Dossier:Financials: ARV, Opening Bid, Estimated Lien Amounts, Maximum Allowable Bid (MAB), and ROI projections.Legal & Title: Docket number, plaintiff/defendant details, outstanding senior liens, mortgage status, and title defects.Physical Asset: Living space (sq. ft.), lot size, bedroom/bathroom breakdown, condition score, and occupancy status.Neighborhood & GIS: Interactive geospatial maps, municipal tax rates, school ratings, and comparable sales.Automated Risk Engine: Real-time algorithmic risk evaluation highlighting severe title flaws, high senior debt, or missing documentation.Background Processing & Export: Automated PDF summary reports, CSV market exports, and instant SMS/Email bid alerts.🛠️ System Architecture & Tech StackHigh-Level Distributed Architecture Diagram                  ┌───────────────────────┐
                  │   Web Client (SPA)    │
                  │ React 18 / Vite / TS  │ (Hosting: Vercel Cloud)
                  └───────────┬───────────┘
                              │
               HTTP/HTTPS     │ CORS Restricted
                              ▼
                  ┌───────────────────────┐
                  │    Backend API REST   │
                  │ FastAPI (Python 3.12) │ ◄─── Pings every 5m (UptimeRobot)
                  └─────┬───────────┬─────┘ (Hosting: Render Web Service)
                        │           │
             PostgreSQL │           │ HTTPS API
                        ▼           ▼
          ┌───────────────┐       ┌──────────────────┐
          │   Supabase    │       │    Brevo API     │
          │ (PostgreSQL)  │       │ (2FA / Mail OTP) │
          └───────────────┘       └──────────────────┘
Core Technology StackBackend Framework: FastAPI (Python 3.12), SQLAlchemy 2.0 (AsyncIO), Pydantic v2, Alembic Migrations, Uvicorn ASGI server.Frontend Web Client: React 18, TypeScript 5.0, Vite, Tailwind CSS, Zustand (State Management), TanStack Query, Leaflet GIS mapping.Database & Persistence: PostgreSQL 16 with PostGIS (pg_trgm extension) hosted via Supabase Cloud Connection Pooler.Security & Auth: OAuth 2.0, JWT with token rotation, Argon2id password hashing, and 2FA Multi-Factor Authentication powered by the Brevo HTTPS API (overcoming standard SMTP delivery bottlenecks).DevOps, Monitoring & Async Workers: Docker & Docker Compose, Pytest 8.3.4 (pytest-asyncio), Celery, Redis, and UptimeRobot (preventing Render cold-start latency).☁️ Cloud Infrastructure & DeploymentThe system is deployed using a decoupled, globally distributed cloud infrastructure designed for high availability:1. Frontend Client (Single Page Application)Platform: Vercel Global Edge Network.Routing Strategy: Integrated HashRouter combined with custom vercel.json rewrite rules to prevent 404 routing errors on deep-link reloads.Localization: Automatic language detection fallback (navigator.language) supporting English and Spanish interfaces.2. Backend Web ServicesPlatform: Render.com Web Service environment.Cold-Start Elimination: Integrated with UptimeRobot, triggering automated HTTP GET /healthcheck pings every 5 minutes to prevent container idling on standard tiers.CORS Policy: Strict CORS origin policies restricted to domain white-lists on Vercel and secured local testing environments.3. Authentication & Messaging GatewayBrevo API Integration: Deliverability engine utilizing direct HTTPS API requests (POST https://api.brevo.com/v3/smtp/email) to dispatch 6-digit 2FA OTP tokens with a 15-minute expiration window, ensuring 100% email inbox delivery.📁 Repository Structureclearbid-nj/
├── backend/                     # Python 3.12 FastAPI core & rules engine
│   ├── app/
│   │   ├── api/                 # Versioned REST endpoints (/api/v1/)
│   │   ├── core/                # Core config, JWT auth, Brevo API handler
│   │   ├── db/                  # SQLAlchemy models & async DB session managers
│   │   ├── schemas/             # Pydantic v2 validation schemas
│   │   └── services/            # Risk scoring engine & ROI underwriting logic
│   ├── alembic/                 # Database schema migrations
│   ├── tests/                   # Pytest test automation suite
│   ├── Dockerfile               # Production container specification
│   └── requirements.txt         # Backend Python dependencies
├── frontend/                    # React 18 + TypeScript + Vite web client
│   ├── src/
│   │   ├── components/          # Reusable UI components & Property Cards
│   │   ├── pages/               # Dashboard, Login, 2FA, Property Dossier views
│   │   ├── store/               # Zustand application state management
│   │   └── services/            # API Client (Axios / TanStack Query)
│   ├── vercel.json              # Serverless SPA route rewrites
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # Architecture & Technical Documentation
│   ├── architecture/            # ERD diagrams, OpenAPI specs, C4 diagrams
│   └── compliance/              # Audit reports & performance evidence
├── docker-compose.yml           # Multi-container orchestration (API, Redis, Worker)
├── .env.example                 # Environment variables blueprint
└── README.md                    # Primary repository documentation
👥 Engineering Team & StakeholdersCore Development TeamNameRoleCore ResponsibilitiesContactAlfredo Benjamín Castro AlarcónBackend Lead & SecurityFastAPI Architecture, OAuth/JWT, Brevo API Gatewayalf.castro@duocuc.clCristopher Leonardo Hernández CalderónFrontend LeadReact 18/Vite SPA, Vercel Pipelines, Zustand, GIS UIcr.hernandezc@duocuc.clFelipe Calderón OlivaData Engine & Database LeadSupabase PostgreSQL, Async SQLAlchemy, Risk Algorithmsfel.calderono@duocuc.clMatías Enrique Tirado JeldesDevOps, QA & Async ServicesDocker Orchestration, Render/UptimeRobot, Pytest Suitema.tirado@duocuc.clAcademic Context & Institutional PartnersSponsor / Client: ClearBid NJ, LLC in technical collaboration with alloxentricInstitution: Duoc UC — School of Informatics and Telecommunications (Viña del Mar, Chile)Academic Program: Senior Capstone Project — Software Engineering Degree📑 Agile Roadmap & Sprint ExecutionCompleted MilestonesPhase / IterationKey DeliverablesArtifacts & EvidenceStatusPhase 1: Local FoundationPostgreSQL schema (clearbid_db - 25 tables), Argon2id hashing, initial Mercer County sample dataset.pgAdmin 4 queries, ER diagrams.✅ CompletedPhase 2: Cloud MigrationSupabase Cloud migration, data type normalization, live Mercer County auction data feed.Supabase ERD Visualizer.✅ CompletedPhase 3: 2FA & Security APIFastAPI Auth Endpoints, JWT token refresh, migration from legacy SMTP to Brevo HTTPS API.Operational 2FA pipeline, 15m expiration.✅ CompletedPhase 4: Distributed CloudVercel production SPA frontend deployment (HashRouter), Render backend deployment, UptimeRobot monitoring active.Live endpoints, zero cold starts.✅ Completed🚀 Getting Started & Local SetupSystem PrerequisitesPython: 3.12 or higherNode.js: v18.0.0 or higher (npm included)GitDocker Desktop (Optional, for containerized run)1. Backend Setup (FastAPI)# Clone repository
git clone https://github.com/Alphareone/CapstoneProject.git
cd CapstoneProject/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment secrets
cp .env.example .env
# (Fill in your Supabase DB URI and Brevo API Key)

# Launch local API development server
uvicorn app.main:app --reload --port 8000
Interactive API Docs (Swagger UI): http://localhost:8000/docsHealthcheck Verification: http://localhost:8000/healthcheck2. Frontend Setup (React 18 + Vite)cd ../frontend

# Install node packages
npm install

# Configure environment variables
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# Run Vite development server
npm run dev
Local Web Application: http://localhost:51733. Alternative: Launching via Docker Composecd ..
docker compose up --build -d
🔐 Authentication & API ReferenceClearBid NJ features a multi-tiered Two-Factor Authentication (2FA) workflow to protect proprietary deal analysis:[User Login / Registration] ──► Argon2id Validation / 6-Digit OTP Generation
                                             │
[HTTPS Request POST] ────────► Brevo API (https://api.brevo.com/v3/smtp/email)
                                             │
[Guaranteed Delivery] ───────► User Inbox (Valid for 15 minutes)
                                             │
[Verification Endpoint] ─────► Validation of OTP Token ──► Issue Session JWT
Core API Routes (/api/v1/)POST /api/v1/auth/register — Creates user account with Argon2id password encryption.POST /api/v1/auth/login — Validates primary credentials and initiates 2FA challenge.POST /api/v1/auth/2fa/verify — Validates Brevo API OTP token and issues session JWT.GET /api/v1/properties — Queries property catalog with filters (County, Risk Traffic-Light, Min ROI).GET /api/v1/properties/{id}/risk — Returns detailed risk scoring and rule-by-rule breakdown.🧪 Quality Assurance (QA) & Test AutomationThe backend test suite is executed using pytest and pytest-asyncio:# Execute tests directly inside backend environment
pytest -v

# Or run via Docker Compose container
docker compose exec api pytest -v
QA Standards & Code CoverageStatus Code Standardization: Verification of strict REST responses (HTTP 401 Unauthorized for bad OTP challenges, HTTP 201 Created on registration).Payload Verification: Automated mocking and verification of Brevo HTTPS API outbound requests during unit testing.📊 Definition of Done (DoD) & Target KPIsDefinition of Done (DoD)A feature is marked as COMPLETE only when:All acceptance criteria are covered by automated unit/integration tests in Pytest.Code is merged into main via Pull Request with zero exposed secrets or API keys.Continuous deployment is verified live on Vercel (Frontend) and Render (Backend).UptimeRobot monitors are active, ensuring sub-second response times without cold starts.Target Key Performance Indicators (KPIs)Backend Uptime: > 99.5% uptime on Render backed by UptimeRobot pinging.2FA Email Deliverability: 100% successful inbox delivery rate via Brevo API.Data Fidelity: 100% parity between Supabase database records, FastAPI JSON payloads, and React UI components.📚 Data Sources & Legal DisclaimersMercer County Sheriff's Office: Sheriff's Foreclosure Sales List and Statutory Guidelines. Official legal foreclosure notices for Mercer County, NJ. Mercer County SheriffMercer County Clerk — RecordsNG: Public Search System for Mortgages, Deeds, and Liens. Public records search for superior encumbrances and title status. Mercer RecordsNGOfficial Repositories:Documentation & Capstone Artifacts: CapstoneProjectAutomated Test Suite & Codebase: Pruebas_Proyecto_ClearBidNJDisclaimer: ClearBid NJ is an analytical tool intended for informational and underwriting support. Users should perform independent title searches and consult licensed real estate attorneys before bidding at foreclosure sales.
