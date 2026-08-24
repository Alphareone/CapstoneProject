# ClearBid NJ — Pre-Bid Real Estate Intelligence System

🌐 **Language / Idioma:** [English](README.md) | [Español](README_ES.md)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 📌 Abstract

This project presents the design and implementation of an integrated software solution designed to optimize decision-making processes through spatial data analysis and automated business rules. Built upon a modern decoupled architecture—utilizing FastAPI and PostgreSQL/PostGIS on the backend alongside React and TypeScript on the frontend—the system addresses the technical requirements defined by the Duoc UC Capstone framework. The platform processes geographic and operational information in real-time, executing an automated flagging mechanism (traffic light system) to highlight critical operational thresholds. This document details the architectural design, database modeling, security protocols, and quality assurance strategy required to meet the high-level competencies of the Computer Engineering profile.

---

## 🎯 Business Problem & Solution

Real estate investors participating in New Jersey (USA) property auctions (Sheriff sales, tax liens, tax deeds, bank-owned properties) face fragmented and unverified financial, legal, and physical data before bidding. Key critical variables—such as surviving liens, title status, occupancy, estimated After Repair Value (ARV), and ROI—are difficult to assess quickly.

**ClearBid NJ** converts each property into a verified **"Pre-Bid Intelligence Dossier"**:
* **Interactive Exploration:** Filter opportunities by County, ZIP Code, risk flag (Green/Yellow/Red), auction type, and price range.
* **Property Dossier (4 Tabs):** Detailed breakdowns covering Financial (ARV, opening price, max suggested bid), Legal (docket number, title status, surviving liens), Physical (sqft, bedrooms, condition), and Neighborhood data.
* **Automated Risk Engine:** Real-time risk scoring engine calculating a Green/Yellow/Red traffic light indicator based on custom business rules.
* **Alerts & Exports:** Asynchronous background operations for CSV/Excel data exports and automated notifications (Email, SMS, Push).

---

## 🛠️ Tech Stack & Architecture

* **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet
* **Database:** PostgreSQL + PostGIS (`pg_trgm`)
* **Security & Auth:** OAuth (Google, Apple, Facebook), JWT with rotational refresh, Argon2/bcrypt, Twilio 2FA (SMS)
* **DevOps & Async Services:** Docker, Docker Compose, `pytest`, Celery / RQ

---

## 👥 Development Team (Team 2 — SCRUM Roles)
Alfredo Benjamín Castro Alarcón — Backend Lead & Security (alf.castro@duocuc.cl)

Cristopher Leonardo Hernández Calderón — Frontend Lead (cr.hernandezc@duocuc.cl)

Felipe Calderón Oliva — Database & Data Engine Lead (Fel.calderono@duocuc.cl)

Matías Enrique Tirado Jeldes — DevOps, QA & Async Services (Ma.tirado@duocuc.cl)
---

## 🏫 Academic & Client Context
Client: ClearBid NJ, LLC

Institution: Duoc UC — Escuela de Informática y Telecomunicaciones (Sede Viña del Mar)

Course: Capstone Project (Ingeniería Informática - Plan 1446114)

Semester: 2026-1
---

## 📁 Repository Structure

```text
clearbid-nj/
├── backend/            # FastAPI REST API, rules engine, and models
├── frontend/           # React 18 + TypeScript web client
├── docs/               # Capstone academic documentation & architecture
│   ├── fase_1/         # Phase 1 deliverables (group & individual)
│   └── architecture/   # ERD, C4 diagrams, and OpenAPI specifications
├── docker/             # Dockerfile & docker-compose configurations
├── README.md           # Main repository README (English)
└── README_ES.md        # Repository README (Spanish version)
