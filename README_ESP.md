# ClearBid NJ — SIPPRI (Sistema de Inteligencia para Propiedades Pre-Subasta e Insights Inmobiliarios)

🌐 **Language / Idioma:** [English](README.md) | [Español](README_ES.md)

> **Proyecto de Título / APT** — Plataforma integrada para la evaluación, análisis y diagnóstico de riesgo en subastas judiciales e inmobiliarias en el Condado de Mercer, New Jersey.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo (Abstract)](#-resumen-ejecutivo-abstract)
2. [Problema de Negocio y Solución](#-problema-de-negocio-y-solución)
3. [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
4. [Estructura del Repositorio](#-estructura-del-repositorio)
5. [Equipo de Desarrollo y Contexto Académico](#-equipo-de-desarrollo-y-contexto-académico)
6. [Hoja de Ruta SCRUM y Plan de Sprints](#-hoja-de-ruta-scrum-y-plan-de-sprints)
7. [Guía de Despliegue e Instalación Rápida](#-guía-de-despliegue-e-instalación-rápida)
8. [Flujo de Autenticación y API REST](#-flujo-de-autenticación-y-api-rest)
9. [Aseguramiento de Calidad (QA) y Pruebas Pytest](#-aseguramiento-de-calidad-qa-y-pruebas-pytest)
10. [Criterios de Aceptación (DoD) y KPIs](#-criterios-de-aceptación-dod-y-kpis)
11. [Fuentes de Datos y Referencias](#-fuentes-de-datos-y-referencias)

---

## 📌 Resumen Ejecutivo (Abstract)

Este proyecto presenta el diseño e implementación de una solución de software integrada enfocada en optimizar la toma de decisiones en inversiones inmobiliarias mediante el análisis de datos espaciales y la automatización de reglas de negocio. Construido sobre una arquitectura desacoplada moderna —utilizando FastAPI y PostgreSQL/PostGIS en el backend junto con React y TypeScript en el frontend— la plataforma responde a los requerimientos técnicos del marco de Proyecto de Título de Duoc UC. El sistema procesa información geográfica y operativa en tiempo real, ejecutando un mecanismo automatizado de semaforización de riesgos (verde/amarillo/rojo) para destacar umbrales críticos. Este documento detalla el diseño arquitectónico, el modelado de datos en la nube, los protocolos de seguridad y la estrategia de QA requeridos para los estándares de la carrera de Ingeniería Informática.

---

## 🎯 Problema de Negocio y Solución

Los inversionistas inmobiliarios que participan en subastas de propiedades en New Jersey, EE. UU. (ejecuciones hipotecarias del Sheriff, *tax liens*, *tax deeds*, propiedades de bancos) se enfrentan a información legal, financiera y física fragmentada y no verificada antes de pujar. Variables críticas —como gravámenes remanentes, estado del título, ocupación, valor estimado tras reparación (ARV) y retorno de inversión (ROI)— son difíciles de consolidar con rapidez.

**ClearBid NJ (SIPPRI)** transforma cada propiedad en un **"Dossier de Inteligencia Pre-Puja"**:

* **Exploración Interactiva:** Filtrado de oportunidades por Condado, código ZIP, semáforo de riesgo (Verde/Amarillo/Rojo), tipo de subasta y rango de precios.
* **Dossier de Propiedad (4 Pestañas):** Desglose estructurado en área Financiera (ARV, precio de apertura, puja máxima sugerida), Legal (número de expediente/docket, estado de títulos, gravámenes), Física (pies cuadrados, dormitorios, condición) y Vecindario.
* **Motor de Riesgos Automatizado:** Evaluación en tiempo real que determina la viabilidad de la inversión mediante un indicador de semáforo basado en reglas operativas.
* **Alertas y Exportaciones:** Procesamiento asíncrono en segundo plano para exportación de reportes CSV/Excel y notificaciones automatizadas.

---

## 🛠️ Arquitectura y Stack Tecnológico

### Diagrama de Arquitectura del Sistema

```text
   ┌────────────────┐      HTTPS / REST      ┌─────────────────────────┐
   │ React 18 SPA   │ ─────────────────────► │ Backend API FastAPI     │
   │ (TypeScript)   │ ◄───────────────────── │ (Uvicorn / Pydantic v2) │
   └────────────────┘                        └────────────┬────────────┘
            │                                             │
      Estado e UI                             Trabajos    │ SQLAlchemy Async
   (Zustand / Query)                          Asíncronos  │ (Connection Pooler)
                                                          ▼
   ┌────────────────┐   Cola de Tareas       ┌─────────────────────────┐
   │ Worker Celery  │ ◄───────────────────── │ Supabase PostgreSQL 16  │
   │ (8 procesos)   │ ◄───────┐              │ (Soporte PostGIS)       │
   └────────────────┘         │              └─────────────────────────┘
                       ┌──────┴──────┐
                       │ Redis 7.4   │
                       │ Task Broker │
                       └─────────────┘
```

### Componentes Principales

* **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic v1.14.0.
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet.
* **Base de Datos y Persistencia:** PostgreSQL 16 + PostGIS (`pg_trgm`) alojado en Supabase Cloud Pooler (`aws-0-us-east-1.pooler.supabase.com:5432`).
* **Seguridad y Autenticación:** OAuth (Google, Apple, Facebook), JWT con rotación de tokens, hashing de contraseñas con Argon2id, verificación 2FA OTP vía SMTP (Gmail) y Twilio (SMS).
* **DevOps y Servicios Asíncronos:** Docker, Docker Compose, Pytest v8.3.4 (`pytest-asyncio`), Celery v5.6.3, Redis v7.4.11.

---

## 📁 Estructura del Repositorio

```text
clearbid-nj/
├── backend/                     # API REST FastAPI, motor de reglas y modelos
│   ├── app/
│   │   ├── api/                 # Endpoints REST versionados (/api/v1/)
│   │   ├── core/                # Seguridad, JWT, OTP por SMTP, configuración
│   │   ├── db/                  # Modelos SQLAlchemy, sesiones y base
│   │   ├── schemas/             # Esquemas y validadores Pydantic
│   │   └── services/            # Motor de semáforo de riesgo y cálculo ROI
│   ├── alembic/                 # Migraciones de base de datos
│   ├── tests/                   # Suite de pruebas automatizadas Pytest
│   ├── Dockerfile               # Definición de contenedor de producción
│   └── requirements.txt         # Dependencias de Python
├── frontend/                    # Cliente Web React 18 + TypeScript
│   ├── src/
│   │   ├── components/          # Componentes UI reutilizables y tarjetas
│   │   ├── pages/               # Dashboard, Login, 2FA, detalles de propiedad
│   │   ├── store/               # Gestores de estado Zustand
│   │   └── services/            # Cliente API (Axios / TanStack Query)
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # Documentación académica y arquitectura Capstone
│   ├── fase_1/                  # Entregables de Fase 1 (grupales e individuales)
│   ├── arquitectura/            # DER, diagramas C4 y especificaciones OpenAPI
│   └── evidencias/              # Capturas de ejecución y auditoría
├── docker/                      # Configuraciones de Dockerfile y Compose
├── docker-compose.yml           # Orquestación multicontenedor (API, Redis, Worker)
├── .env.example                 # Plantilla de variables de entorno (sin secretos)
├── README.md                    # README principal del repositorio (Inglés)
└── README_ES.md                 # README del repositorio (Versión en Español)
```

---

## 👥 Equipo de Desarrollo y Contexto Académico

### Equipo de Desarrollo (Equipo 2 — Roles SCRUM)

| Nombre | Rol SCRUM | Responsabilidades Principales | Contacto |
| :--- | :--- | :--- | :--- |
| **Alfredo Benjamín Castro Alarcón** | Backend Lead & Security | API REST (FastAPI), autenticación OAuth/JWT, seguridad 2FA | `alf.castro@duocuc.cl` |
| **Cristopher Leonardo Hernández Calderón** | Frontend Lead | Interfaz Web (React 18 + TS), mapas GIS, i18n, estado Zustand | `cr.hernandezc@duocuc.cl` |
| **Felipe Calderón Oliva** | Database & Data Engine Lead | PostgreSQL/PostGIS, modelos asíncronos SQLAlchemy, motor de reglas | `fel.calderono@duocuc.cl` |
| **Matías Enrique Tirado Jeldes** | DevOps, QA & Async Services | Orquestación Docker, workers asíncronos, suite de pruebas Pytest | `ma.tirado@duocuc.cl` |

### Contexto Académico y Cliente

* **Cliente:** ClearBid NJ, LLC en colaboración con **alloxentric**
* **Institución:** Duoc UC — Escuela de Informática y Telecomunicaciones (Sede Viña del Mar)
* **Asignatura:** Proyecto de Título / Capstone (Ingeniería Informática - Plan 1446114)
* **Semestre:** 2026-2

---

## 📑 Hoja de Ruta SCRUM y Plan de Sprints

### Iteraciones Históricas

| Etapa / Iteración | Logros Clave | Evidencias y Artefactos | Estado |
| :--- | :--- | :--- | :--- |
| **Fase 1: Configuración Local** | Creación del esquema PostgreSQL 16 local (`clearbid_db` - 25 tablas), hashing Argon2id, dataset inicial de 3 propiedades. | Consultas pgAdmin 4, modelos preliminares. | ✅ Completado |
| **Fase 2: Migración a la Nube** | Migración a Supabase Cloud, normalización de tipos de datos (`VARCHAR` vs `bigint`), carga de 11 propiedades de Mercer County. | Visualizador ERD Supabase y Editor de Tablas. | ✅ Completado |
| **Fase 2: Seguridad y OTP** | Endpoints de autenticación FastAPI, rotación JWT, transición de SMS simulado a envío real de OTP por SMTP Gmail. | Flujo 2FA operativo, Commit `b2f8fe5`. | ✅ Completado |
| **Fase 2: Contenerización** | Orquestación en Docker Compose (FastAPI + Redis 7 + Worker Celery), suite Pytest integrada (10 tests). | Logs de terminal, ejecución `pytest` (7 Pasados, 3 Fallados). | 🟡 85% Completado |

### Plan de Recuperación y Entregas (Sprints)

* **Sprint 1: Corrección de Auth y Tests (20–25 Oct):** Refactorización de códigos de estado HTTP (401 Unauthorized para OTP erróneo, 201 Created para corrección de registros) para alcanzar el 100% de pruebas pasadas en Pytest. Limpieza de secretos en `.env`.
* **Sprint 2: Docker e Integración Cloud (26–31 Oct - Hito 2):** Construcción limpia en Docker Compose conectada a Supabase IPv4 Pooler. Merge de la rama `feature/frontend` a `main`.
* **Sprint 3: Estabilización y Geolocalización (1–15 Nov):** Integración del visor cartográfico Leaflet/PostGIS para propiedades y ajuste del panel de ingesta.
* **Entrega Duoc UC (16–28 Nov):** Demostración del sistema, entrega del informe técnico e hito de defensa académica.
* **Cierre UTEM / Final (30 Nov–4 Dic):** Liberación final del proyecto, entrega de manuales y retrospectiva de cierre.

---

## 🚀 Guía de Despliegue e Instalación Rápida

### Requisitos Previos

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+)
* [Node.js](https://nodejs.org/) (v18+) y `npm` / `pnpm`
* [Python](https://www.python.org/) (v3.12+)

### 1. Clonar el Repositorio y Configurar Entorno

```bash
git clone https://github.com/Alphareone/CapstoneProject.git
cd CapstoneProject

# Copiar la plantilla de variables de entorno
cp .env.example .env
```

*Complete `.env` con las credenciales de conexión de Supabase y SMTP.*

### 2. Despliegue con Docker Compose

Para levantar todos los servicios (API REST, Redis y Celery Worker) en un entorno local:

```bash
docker compose up --build -d
```

* **Documentación de la API (Swagger UI):** `http://localhost:8000/docs`
* **Verificación de Estado (Healthcheck):** `http://localhost:8000/health`

### 3. Ejecución de la Interfaz Frontend

```bash
cd frontend
npm install
npm run dev
```

* **Aplicación Web:** `http://localhost:5173`

---

## 🔐 Flujo de Autenticación y API REST

ClearBid NJ implementa un flujo de Doble Factor de Autenticación (2FA) para resguardar la información sensible de subastas y perfiles:

```text
[Registro de Usuario] ──► Hashing Argon2id ──► Almacenamiento en Supabase
                                 │
[Intento de Login] ────► Validación JWT ─────► Generación de OTP (6 dígitos)
                                 │
[Envío por SMTP] ──────► Código a Email ─────► [Interfaz de Verificación]
                                                         │
[Sesión Autorizada] ◄── Validación de Desafío ───────────┘
```

### Endpoints Principales (`/api/v1/`)

* `POST /api/v1/auth/register` — Registro de usuarios con encriptación Argon2id.
* `POST /api/v1/auth/login` — Validación de primer factor y emisión del desafío OTP.
* `POST /api/v1/auth/2fa/verify` — Verificación del código OTP y emisión del token JWT definitivo.
* `GET /api/v1/properties` — Catálogo de propiedades con filtros (Condado, Riesgo, ROI).
* `GET /api/v1/properties/{id}/risk` — Evaluación del semáforo de riesgo y resumen de reglas.

---

## 🧪 Aseguramiento de Calidad (QA) y Pruebas Pytest

Las pruebas automatizadas se ejecutan dentro del contenedor del backend mediante `pytest`.

### Ejecución de Pruebas Automatizadas

```bash
docker compose exec api pytest -v
```

### Hallazgos de Auditoría y Plan de Remediación

En la evaluación de Fase 2 se ejecutaron 10 casos de prueba automatizados (duración 1.66s):

* **PASADOS (7):** Consulta al catálogo de propiedades, hashing de contraseñas, verificación OTP válida y esquemas Pydantic.
* **FALLADOS (3 - En corrección):**
  1. `test_2fa_wrong_code`: Se requiere retornar `HTTP 401 Unauthorized` al ingresar un OTP incorrecto (retornaba `200 OK`).
  2. `test_register_duplicate_email`: Ajuste de aserciones para el código de estado `HTTP 201 Created`.
  3. `test_register_login_2fa_flow`: Alineación del test suite con la nueva lógica de envío SMTP de correos.

---

## 📊 Criterios de Aceptación (DoD) y KPIs

### Criterio de Hecho (Definition of Done - DoD)

Una tarea o requerimiento se considera **FINALIZADO** únicamente cuando:

1. Los criterios de aceptación están respaldados por casos de prueba automatizados.
2. El código está integrado en la rama `main` mediante Pull Request y libre de credenciales expuestas.
3. Los endpoints responden con los códigos de estado HTTP estándar.
4. El despliegue ha sido verificado en Docker Compose / Netlify sin procesos huérfanos.
5. Las claves de API, contraseñas y códigos OTP han sido completamente removidos de los commits públicos.

### Indicadores Clave de Rendimiento (KPIs)

* **Cobertura de Pruebas Críticas:** Meta del `100%` de aprobación antes del hito final.
* **Consistencia de Datos:** Consistencia del `100%` entre registros de Supabase, respuestas JSON de la API y las tarjetas de la UI en React.
* **Construcción Reproducible:** Despliegue con un solo comando (`docker compose up`) en entornos limpios.

---

## 📚 Fuentes de Datos y Referencias

1. **Mercer County Sheriff's Office (2026):** *Sheriff's Foreclosure Sales List and Guidelines*. Estándares públicos para subastas ejecutorias. [Oficina del Sheriff de Mercer](https://www.mercercounty.org/government/sheriff-/informational/sheriff-s-foreclosure-sale)
2. **Mercer County Clerk — RecordsNG (2026):** *Public Records Search for Title and Mortgages*. Verificación de gravámenes para el caso de estudio *4216 Nottingham Way, Hamilton Twp (Block 1853, Lot 19)*. [Mercer RecordsNG](https://records.mercercounty.org/RecordsNG_Search/)
3. **Repositorios Oficiales del Proyecto:**
   * Código Activo y Pruebas: [Pruebas_Proyecto_ClearBidNJ](https://github.com/Alphareone/Pruebas_Proyecto_ClearBidNJ.git)
   * Documentación Académica: [CapstoneProject](https://github.com/Alphareone/CapstoneProject.git)