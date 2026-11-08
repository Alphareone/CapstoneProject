# 🏛️ ClearBid NJ — SIPPRI (Sistema de Inteligencia para Propiedades Pre-Subasta e Insights Inmobiliarios)

🌐 **Language / Idioma:** [English](README.md) | [Español](README_ES.md)

> **Proyecto de Título / Capstone (Duoc UC)** — Plataforma integrada para la evaluación, análisis y diagnóstico de riesgo en subastas judiciales e inmobiliarias del Alguacil (*Sheriff’s Sales*) en el estado de Nueva Jersey, con foco inicial en el Condado de Mercer.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-Hosted-46E3B7?style=flat-square&logo=render&logoColor=black)

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo (Abstract)](#-resumen-ejecutivo-abstract)
2. [Problema de Negocio y Solución](#-problema-de-negocio-y-solución)
3. [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
4. [Despliegue e Infraestructura en la Nube](#-despliegue-e-infraestructura-en-la-nube)
5. [Estructura del Repositorio](#-estructura-del-repositorio)
6. [Equipo de Desarrollo y Contexto Académico](#-equipo-de-desarrollo-y-contexto-académico)
7. [Hoja de Ruta SCRUM y Plan de Sprints](#-hoja-de-ruta-scrum-y-plan-de-sprints)
8. [Guía de Instalación y Desarrollo Local](#-guía-de-instalación-y-desarrollo-local)
9. [Flujo de Autenticación 2FA (API Brevo) y REST API](#-flujo-de-autenticación-2fa-api-brevo-y-rest-api)
10. [Aseguramiento de Calidad (QA) y Pruebas Pytest](#-aseguramiento-de-calidad-qa-y-pruebas-pytest)
11. [Criterios de Aceptación (DoD) y KPIs](#-criterios-de-aceptación-dod-y-kpis)
12. [Fuentes de Datos y Referencias](#-fuentes-de-datos-y-referencias)

---

## 📌 Resumen Ejecutivo (Abstract)

Este proyecto presenta el diseño e implementación de una solución de software integrada enfocada en optimizar la toma de decisiones en inversiones inmobiliarias mediante el análisis de datos espaciales y la automatización de reglas de negocio. Construido sobre una arquitectura desacoplada moderna —utilizando FastAPI y PostgreSQL/Supabase en el backend junto con React, Vite y TypeScript en el frontend— la plataforma responde a los requerimientos técnicos del marco de Proyecto de Título de Duoc UC. El sistema procesa información geográfica y operativa en tiempo real, ejecutando un mecanismo automatizado de semaforización de riesgos (verde/amarillo/rojo) para destacar umbrales críticos. Este documento detalla el diseño arquitectónico, la distribución de infraestructura distribuida en la nube (Vercel + Render + Brevo + UptimeRobot), los protocolos de seguridad y la estrategia de QA.

---

## 🎯 Problema de Negocio y Solución

Los inversionistas inmobiliarios que participan en subastas de propiedades en New Jersey, EE. UU. (ejecuciones hipotecarias del Sheriff, *tax liens*, *tax deeds*, propiedades de bancos) se enfrentan a información legal, financiera y física fragmentada y no verificada antes de pujar. Variables críticas —como gravámenes remanentes, estado del título, ocupación, valor estimado tras reparación (ARV) y retorno de inversión (ROI)— son difíciles de consolidar con rapidez.

**ClearBid NJ (SIPPRI)** transforma cada propiedad en un **"Dossier de Inteligencia Pre-Puja"**:

* **Exploración Interactiva:** Filtrado de oportunidades por Condado (foco inicial Condado de Mercer), código ZIP, semáforo de riesgo (Verde/Amarillo/Rojo), tipo de subasta y rango de precios.
* **Dossier de Propiedad (4 Pestañas):** Desglose estructurado en área Financiera (ARV, precio de apertura, puja máxima sugerida), Legal (número de expediente/docket, estado de títulos, gravámenes), Física (pies cuadrados, dormitorios, condición) y Vecindario.
* **Motor de Riesgos Automatizado:** Evaluación en tiempo real que determina la viabilidad de la inversión mediante un indicador de semáforo basado en reglas operativas.
* **Alertas y Exportaciones:** Procesamiento asíncrono en segundo plano para exportación de reportes CSV/Excel y notificaciones automatizadas.

---

## 🛠️ Arquitectura y Stack Tecnológico

### Diagrama General de Arquitectura Distribuida

```text
                  +-----------------------+
                  |    Cliente (Web)      |
                  | React 18 / Vite (SPA) | (Hosting: Vercel)
                  +-----------+-----------+
                              |
               HTTP/HTTPS     | CORS Restringido
                              v
                  +-----------------------+
                  |    Backend API        |
                  |  FastAPI (Python 3.12)| <---+ Ping cada 5 min (UptimeRobot)
                  +-----+-----------+-----+ (Hosting: Render)
                        |           |
             PostgreSQL |           | HTTPS API
                        v           v
          +---------------+       +------------------+
          |   Supabase    |       |    Brevo API     |
          | (PostgreSQL)  |       |  (2FA / OTP Mail)|
          +---------------+       +------------------+
```

### Componentes Principales

* **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 (Async), Pydantic v2, Alembic, Uvicorn.
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React-Leaflet.
* **Base de Datos & Persistencia:** PostgreSQL 16 con extensión PostGIS (`pg_trgm`) alojado en Supabase Cloud Pooler.
* **Seguridad y Autenticación:** OAuth, JWT con rotación de tokens, hashing Argon2id, verificación 2FA OTP a través de la API HTTPS de **Brevo** (transición desde SMTP para 100% de entregabilidad sin bloqueos de puerto).
* **DevOps, Monitoreo y Asincronía:** Docker, Docker Compose, Pytest v8.3.4 (`pytest-asyncio`), Celery, Redis, **UptimeRobot** (evitación de hibernación/Cold Start en Render).

---

## ☁️ Despliegue e Infraestructura en la Nube

La infraestructura del proyecto opera mediante un esquema desacoplado y distribuido de alta eficiencia:

### 1. Frontend (SPA)
* **Plataforma:** Vercel (Repositorio independiente).
* **Enrutamiento:** `HashRouter` para garantizar la resolución sin errores de subrutas en el cliente.
* **Configuración Serverless:** Archivo `vercel.json` con reglas de reescritura de URL para evitar errores HTTP 404 al recargar páginas SPA.
* **Internacionalización:** Detección dinámica de idioma mediante `navigator.language`.

### 2. Backend (API RESTful)
* **Plataforma:** Render.com (Contenedor de aplicaciones Web Service).
* **Estrategia Anti-Cold-Start:** Integración con **UptimeRobot** realizando pings HTTP periódicos cada 5 minutos al endpoint `/healthcheck`, evitando la suspensión automática de la instancia en la capa gratuita.
* **Políticas CORS:** Middleware de seguridad restringido únicamente a los orígenes del cliente en Vercel y entornos locales autorizados.

### 3. Autenticación y Comunicaciones
* **Integración Brevo API:** Generación y envío de códigos OTP de 6 dígitos mediante peticiones HTTPS directas (`POST https://api.brevo.com/v3/smtp/email`), eliminando latencias y bloqueos SMTP. Los códigos OTP cuentan con un tiempo de expiración de **15 minutos**.

---

## 📁 Estructura del Repositorio

```text
clearbid-nj/
├── backend/                     # API REST FastAPI, motor de reglas y modelos
│   ├── app/
│   │   ├── api/                 # Endpoints REST versionados (/api/v1/)
│   │   ├── core/                # Seguridad, JWT, integración Brevo API Key, config
│   │   ├── db/                  # Modelos SQLAlchemy, sesiones asíncronas
│   │   ├── schemas/             # Esquemas y validadores Pydantic v2
│   │   └── services/            # Motor de semáforo de riesgo y cálculo ROI
│   ├── alembic/                 # Migraciones de base de datos
│   ├── tests/                   # Suite de pruebas automatizadas Pytest
│   ├── Dockerfile               # Definición de contenedor de producción
│   └── requirements.txt         # Dependencias de Python 3.12
├── frontend/                    # Cliente Web React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # Componentes UI reutilizables y tarjetas
│   │   ├── pages/               # Dashboard, Login, 2FA, detalles de propiedad
│   │   ├── store/               # Gestores de estado Zustand
│   │   └── services/            # Cliente API (Axios / TanStack Query)
│   ├── vercel.json              # Configuración de reescritura de rutas SPA
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # Documentación académica y arquitectura Capstone
│   ├── fase_1/                  # Entregables de Fase 1
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
| **Alfredo Benjamín Castro Alarcón** | Backend Lead & Security | API REST (FastAPI), autenticación OAuth/JWT, integración Brevo API | `alf.castro@duocuc.cl` |
| **Cristopher Leonardo Hernández Calderón** | Frontend Lead | Interfaz Web (React 18 + TS), despliegue Vercel, i18n, Zustand | `cr.hernandezc@duocuc.cl` |
| **Felipe Calderón Oliva** | Database & Data Engine Lead | Supabase PostgreSQL/PostGIS, modelos SQLAlchemy, motor de reglas | `fel.calderono@duocuc.cl` |
| **Matías Enrique Tirado Jeldes** | DevOps, QA & Async Services | Orquestación Docker, Render + UptimeRobot, suite Pytest | `ma.tirado@duocuc.cl` |

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
| **Fase 1: Configuración Local** | Creación del esquema PostgreSQL local (`clearbid_db` - 25 tablas), hashing Argon2id, dataset inicial. | Consultas pgAdmin 4, modelos preliminares. | ✅ Completado |
| **Fase 2: Migración a la Nube** | Migración a Supabase Cloud, normalización de tipos de datos, carga de 11 propiedades de Mercer County. | Visualizador ERD Supabase y Editor de Tablas. | ✅ Completado |
| **Fase 2: Seguridad y 2FA API** | Endpoints de autenticación FastAPI, rotación JWT, migración de SMTP a API HTTPS de Brevo (100% entrega). | Flujo 2FA operativo, validez OTP 15 min. | ✅ Completado |
| **Fase 3: Despliegue Distribuido** | Frontend SPA en Vercel (`HashRouter`/`vercel.json`), Backend en Render mantenido activo vía UptimeRobot. | Endpoints online, pings cada 5 min. | ✅ Completado |

### Plan de Recuperación y Entregas (Sprints)

* **Sprint 1: Corrección de Auth y Tests:** Refactorización de códigos de estado HTTP (401 Unauthorized para OTP erróneo, 201 Created para registros) y limpieza de secretos.
* **Sprint 2: Docker e Integración Cloud:** Integración final de Docker Compose conectada a Supabase Pooler e integración del frontend en Vercel.
* **Sprint 3: Estabilización y Geolocalización:** Integración del visor cartográfico Leaflet/PostGIS para las propiedades de Mercer County.
* **Entrega Duoc UC:** Demostración integral del sistema, entrega del informe técnico e hito de defensa académica.

---

## 🚀 Guía de Instalación y Desarrollo Local

### Prerrequisitos

* Python 3.12+
* Node.js 18+ y `npm`
* Git
* Docker Desktop (Opcional para modo multicontenedor)

### 1. Configuración del Backend (FastAPI)

```bash
# Clonar el repositorio
git clone https://github.com/Alphareone/CapstoneProject.git
cd CapstoneProject/backend

# Crear entorno virtual estándar
python -m venv venv

# Activar el entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (.env)
cp .env.example .env
# (Completar con credenciales de Supabase y Brevo API Key)

# Ejecutar el servidor local
uvicorn app.main:app --reload --port 8000
```

* **API Docs (Swagger UI):** `http://localhost:8000/docs`
* **Healthcheck:** `http://localhost:8000/healthcheck`

### 2. Configuración del Frontend (React 18 + Vite)

```bash
cd ../frontend

# Instalar dependencias
npm install

# Configurar variables de entorno (.env)
VITE_API_BASE_URL=http://localhost:8000

# Iniciar servidor de desarrollo
npm run dev
```

* **Aplicación Web Local:** `http://localhost:5173`

### 3. Ejecución Alternativa con Docker Compose

```bash
cd ..
docker compose up --build -d
```

---

## 🔐 Flujo de Autenticación 2FA (API Brevo) y REST API

ClearBid NJ implementa un flujo de Doble Factor de Autenticación (2FA) resguardado vía HTTPS:

```text
[Registro / Login Usuario] ──► Hashing Argon2id / Generación OTP (6 dígitos)
                                          │
[Petición HTTPS POST] ────────► API Brevo (https://api.brevo.com/v3/smtp/email)
                                          │
[Entrega Garantizada] ────────► Correo Electrónico del Usuario (Validez 15 min)
                                          │
[Verificación en App] ────────► Validación de Token OTP y emisión de JWT de Sesión
```

### Endpoints Principales (`/api/v1/`)

* `POST /api/v1/auth/register` — Registro de usuario con encriptación Argon2id.
* `POST /api/v1/auth/login` — Validación de credenciales de primer factor y emisión de OTP.
* `POST /api/v1/auth/2fa/verify` — Verificación de OTP (Brevo API) y emisión de JWT final.
* `GET /api/v1/properties` — Catálogo de propiedades (Filtros por Condado, Semáforo de Riesgo, ROI).
* `GET /api/v1/properties/{id}/risk` — Diagnóstico automatizado de riesgo y semaforización.

---

## 🧪 Aseguramiento de Calidad (QA) y Pruebas Pytest

Las pruebas automatizadas backend se ejecutan localmente o dentro del contenedor mediante `pytest`:

```bash
# Ejecución directa en backend
pytest -v

# O mediante Docker Compose
docker compose exec api pytest -v
```

### Remediaciones y Auditoría
* Cobertura de tests ajustada a los flujos reales de respuesta HTTP (`401 Unauthorized` para errores OTP, `201 Created` en registros nuevos).
* Validación estricta del payload hacia la API de Brevo en los entornos de prueba.

---

## 📊 Criterios de Aceptación (DoD) y KPIs

### Criterio de Hecho (Definition of Done - DoD)

1. Funcionalidades cubiertas con casos de prueba automatizados en Pytest.
2. Código integrado a `main` vía Pull Request sin credenciales o claves expuestas.
3. Despliegues continuos verificados operativamente en Vercel (Frontend) y Render (Backend).
4. Pings de UptimeRobot configurados y activos para garantizar respuesta continua en Render.

### Indicadores Clave de Rendimiento (KPIs)

* **Disponibilidad del Backend:** >99.5% de uptime en Render mediante UptimeRobot.
* **Entregabilidad OTP:** 100% de éxito en la entrega de correos 2FA vía Brevo API.
* **Consistencia de Datos:** 100% de coincidencia entre Supabase, respuestas API y tarjetas React.

---

## 📚 Fuentes de Datos y Referencias

1. **Mercer County Sheriff's Office:** *Sheriff's Foreclosure Sales List and Guidelines*. Estándares públicos para subastas ejecutorias en Mercer County, NJ. [Mercer County Sheriff](https://www.mercercounty.org/government/sheriff-/informational/sheriff-s-foreclosure-sale)
2. **Mercer County Clerk — RecordsNG:** *Public Records Search for Title and Mortgages*. Búsqueda de registros de títulos y gravámenes. [Mercer RecordsNG](https://records.mercercounty.org/RecordsNG_Search/)
3. **Repositorios Oficiales del Proyecto:**
   * Repositorio de Documentación y Capstone: [CapstoneProject](https://github.com/Alphareone/CapstoneProject.git)
   * Repositorio de Pruebas: [Pruebas_Proyecto_ClearBidNJ](https://github.com/Alphareone/Pruebas_Proyecto_ClearBidNJ.git)
