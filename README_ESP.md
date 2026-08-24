# ClearBid NJ — Sistema de Inteligencia Pre-Puja para Remates Inmobiliarios

🌐 **Idioma / Language:** [Español](README_ES.md) | [English](README.md)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Habilitado-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 📌 Resumen (Abstract)

Este proyecto presenta el diseño e implementación de una solución informática integral diseñada para optimizar los procesos de toma de decisiones a través del análisis de datos espaciales y reglas de negocio automatizadas. Construido sobre una arquitectura desacoplada moderna —utilizando FastAPI y PostgreSQL/PostGIS en el backend junto con React y TypeScript en el frontend—, el sistema aborda los requerimientos técnicos definidos por el marco Capstone de Duoc UC. La plataforma procesa información geográfica y operativa en tiempo real, ejecutando un mecanismo de semaforización automatizado para alertar sobre umbrales críticos. Este documento detalla el diseño arquitectónico, el modelado de bases de datos, los protocolos de seguridad y la estrategia de aseguramiento de calidad requeridos para cumplir con las competencias del perfil de egreso de Ingeniería Informática.

---

## 🎯 Problemática de Negocio y Solución

Los inversionistas inmobiliarios que participan en subastas del Estado de New Jersey (EE. UU.) —tales como *sheriff sales*, *tax liens*, *tax deeds* y propiedades de bancos— deben evaluar información financiera, legal y física fragmentada y difícil de verificar antes de pujar. Variables críticas como gravámenes sobrevivientes, estado del título, ocupación, valor tras reparación (ARV) y ROI son complejas de analizar en poco tiempo.

**ClearBid NJ** convierte cada propiedad en una ficha verificada de **"Inteligencia Pre-Puja"**:
* **Exploración Interactiva:** Filtros avanzados por Condado (*County*), Código Postal (*ZIP*), color del semáforo, tipo de remate y rango de precio en vistas de tabla, tarjetas y mapa interactivo.
* **Ficha de Propiedad (4 Pestañas):** Información organizada en eje Financiero (ARV, puja máxima sugerida, ROI), Legal (número de caso, título, gravámenes), Físico (superficie, dormitorios, condición) y Barrio/Entorno.
* **Motor de Reglas y Semáforo de Riesgo:** Motor automático que calcula un semáforo de riesgo (Verde / Amarillo / Rojo) evaluando reglas de negocio y nivel de severidad en tiempo real.
* **Alertas y Exportación:** Tareas asíncronas para ingesta de datos, exportación a CSV/Excel y notificación automática de nuevas oportunidades (Push, Email, SMS).

---

## 🛠️ Stack Tecnológico y Arquitectura

* **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet
* **Base de Datos:** PostgreSQL + PostGIS (`pg_trgm`)
* **Seguridad y Autenticación:** OAuth (Google, Apple, Facebook), JWT con refresh rotativo, Argon2/bcrypt, 2FA por SMS (Twilio)
* **DevOps y Asincronismo:** Docker, Docker Compose, `pytest`, Celery / RQ

---


## 👥 Development Team (Team 2 — SCRUM Roles)

| Name | SCRUM Role | Primary Responsibilities | Contact |
| :--- | :--- | :--- | :--- |
| **Alfredo Benjamín Castro Alarcón** | Backend Lead & Security | REST API (FastAPI), OAuth/JWT authentication, 2FA security | `alf.castro@duocuc.cl` |
| **Cristopher Leonardo Hernández Calderón** | Frontend Lead | Web UI (React 18 + TS), GIS maps, i18n, Zustand state | `cr.hernandezc@duocuc.cl` |
| **Felipe Calderón Oliva** | Database & Data Engine Lead | PostgreSQL/PostGIS, SQLAlchemy async models, Risk Rules Engine | `Fel.calderono@duocuc.cl` |
| **Matías Enrique Tirado Jeldes** | DevOps, QA & Async Services | Docker orchestration, background workers, Pytest suite | `Ma.tirado@duocuc.cl` |

---

## 🏫 Academic & Client Context
Client: ClearBid NJ, LLC

Institution: Duoc UC — Escuela de Informática y Telecomunicaciones (Sede Viña del Mar)

asignatura: Capstone (Ingeniería Informática - Plan 1446114 / 2022)

Semestre: 2026-2

---

## 📁 Estructura del Repositorio

```text
clearbid-nj/
├── backend/            # API REST en FastAPI, motor de reglas y modelos
├── frontend/           # Cliente web en React 18 + TypeScript
├── docs/               # Documentación académica Capstone y diagramas
│   ├── fase_1/         # Entregables de planificación Fase 1 e individuales
│   └── arquitectura/   # Diagramas ERD, C4 y especificación OpenAPI
├── docker/             # Archivos Dockerfile y docker-compose
├── README.md           # README principal del repositorio (Inglés)
└── README_ES.md        # README en español para evaluación local
