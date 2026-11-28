# ClearBid NJ — Sistema de Inteligencia Pre-Puja para Remates Inmobiliarios

**Proyecto Capstone — Ingeniería en Informática (Duoc UC)**  
**Cliente Oficial:** ClearBid NJ  
**Ámbito Geográfico Piloto:** Mercer County, New Jersey, EE. UU.

---

## Integrantes — Grupo 2

* **Felipe Calderón Oliva** — `Fel.calderono@duocuc.cl`
* **Alfredo Benjamín Castro Alarcón** — `alf.castro@duocuc.cl`
* **Cristopher Leonardo Hernández Calderón** — `cr.hernandezc@duocuc.cl`
* **Matías Enrique Tirado Jeldes** — `Ma.tirado@duocuc.cl`

---

## Abstract

### Español
Este proyecto presenta el diseño e implementación de una solución informática integral orientada a optimizar la toma de decisiones de inversión inmobiliaria mediante análisis geoespacial, modelado financiero automatizado y un motor determinista de reglas legales. Construido sobre una arquitectura moderna desacoplada —utilizando **FastAPI** y **PostgreSQL** en el backend junto con **React, TypeScript y Tailwind CSS** en el frontend—, el sistema procesa propiedades en subasta judicial y fiscal en tiempo real, ejecutando un mecanismo de semaforización automatizado (*Low / Clear*, *Moderate*, *High Risk*) complementado con un módulo de estimación de puja máxima óptima y generación de reportes ejecutivos en PDF.

### English
This project presents the design and implementation of an end-to-end software solution built to optimize real estate investment decision-making through geospatial analysis, automated financial modeling, and a deterministic legal rules engine. Engineered on a decoupled modern architecture—leveraging **FastAPI** and **PostgreSQL** on the backend alongside **React, TypeScript, and Tailwind CSS** on the frontend—the platform evaluates judicial and tax auction properties in real time, executing an automated traffic-light risk engine (*Low / Clear*, *Moderate*, *High Risk*) paired with an AI-assisted optimal bid estimator and automated PDF due diligence dossier generation.

---

## Despliegue en Producción (Demo en Vivo)

* **Aplicación Web (Frontend en Vercel):** [https://capstone-project-ruddy-gamma.vercel.app](https://capstone-project-ruddy-gamma.vercel.app)
* **API REST & Documentación Swagger (Backend en Render):** [https://clearbid-backend-1s56.onrender.com/docs](https://clearbid-backend-1s56.onrender.com/docs)

---

## Contexto del Problema y Propuesta de Valor

Las subastas inmobiliarias en Estados Unidos (*Sheriff Sales*, *Tax Liens*, *Tax Deeds* y *Bank Owned / REO*) se realizan bajo modalidad *AS-IS* (en el estado físico y legal en que se encuentran). Un inversionista que puja sin realizar una debida diligencia (*due diligence*) exhaustiva se expone a asumir gravámenes sobrevivientes (*IRS liens*, hipotecas senior), propiedades ocupadas que requieren procesos judiciales de desalojo (*ejectment*), o costos de rehabilitación que superan el valor de mercado posterior a la reparación (*ARV*).

**ClearBid NJ** centraliza, normaliza y evalúa esta información antes de la subasta, entregando en segundos:
1. Un **diagnóstico legal automatizado** mediante un sistema de semáforo basado en reglas verificables.
2. Una **proyección financiera clara** de retorno sobre la inversión (*ROI*) y utilidad potencial neta.
3. Una **recomendación de puja máxima óptima** asistida por heurística inteligente para evitar sobrepagar en el remate.

---

## Funcionalidades Implementadas (Alcance MVP)

### 1. Motor Determinista de Riesgo Legal y Documental (Semáforo)
* Clasificación automática de cada propiedad en niveles de riesgo:
  * **Green (`LOW / CLEAR`):** Sin alertas legales críticas ni gravámenes sobrevivientes detectados.
  * **Yellow (`MODERATE`):** Advertencias documentales, ocupación activa o datos parciales que requieren verificación previa.
  * **Red (`HIGH`):** Presencia de riesgos críticos (gravámenes IRS o senior sobrevivientes, indicadores de bancarrota, defectos graves de título).
  * **Pending (`Not assessed`):** Expediente con información insuficiente para emitir veredicto seguro.
* Evaluación individualizada por reglas trazables (`pass`, `fail`, `unknown`) con severidad (`info`, `warning`, `critical`) y respaldo de antecedentes documentales.

### 2. Análisis Financiero y Predictor IA Pre-Puja
* Cálculo automatizado de métricas clave:
  * **Precio de apertura (*Opening Price*)** y **Valor de mercado post-reparación (*ARV*)**.
  * **Costos estimados de reparación (*Estimated Repairs*)** y **Deuda / gravámenes totales (*Total Liens*)** con indicador de verificación.
  * **ROI estimado tras reparaciones (%)** y **Utilidad potencial neta ($)**.
* **ClearBid AI Predictor:**
  * Genera un **Puntaje de Viabilidad (`0–100`)** con porcentaje de confianza según completitud del expediente.
  * Emite un veredicto accionable (*Strong Buy*, *Moderate / Caution*, *High Risk / Avoid*).
  * Calcula la **Puja Máxima Óptima IA (*AI Optimal Max Bid*)** ajustada dinámicamente por el nivel de riesgo legal y los costos de rehabilitación.

### 3. Exploración Multi-Vista, Filtros Combinados y Gestión
* **Tres vistas sincronizadas:** **Tabla** (con ordenamiento por columnas y selección múltiple), **Tarjetas** (con vista previa fotográfica real de *Street View* de Mercer County) y **Mapa Interactivo** (geolocalización con Leaflet y marcadores codificados por color de semáforo).
* **Filtrado avanzado:** Búsqueda instantánea por dirección, ciudad o código postal (ZIP); filtros por estado de semáforo, condado, tipo de subasta (*Sheriff sale*, *Tax lien*, *Tax deed*, *Bank owned*), tipo de propiedad (*Single family*, *Multi-family*, *Condo*, *Land*) y umbrales mínimos de ROI (`≥15%`, `≥35%`, `≥100%`).
* **Herramientas de productividad:** Guardado de propiedades favoritas (*Saved*), segmentos de búsqueda personalizados, exportación masiva a **CSV** y centro de **Alertas** por zona de cobertura.

### 4. Dossier Ejecutivo en PDF y Envío por Correo
* Generación instantánea en el navegador (mediante `jsPDF`) de un reporte ejecutivo descargable con el resumen financiero, estatus legal, perfil físico, evaluación de IA y avisos regulatorios.
* Opción integrada para adjuntar y enviar una copia del PDF directamente al correo electrónico registrado del usuario.

### 5. Seguridad, Internacionalización (i18n) y Accesibilidad (a11y)
* **Autenticación y Control de Acceso:** Registro e inicio de sesión con contraseñas cifradas, tokens **JWT**, verificación en dos pasos (**2FA**) mediante código de 6 dígitos por correo electrónico y soporte para inicio de sesión con **Google OAuth**.
* **Soporte Multi-Idioma (4 idiomas):** Interfaz completamente localizada en **Español (`es`)**, **Inglés (`en`)**, **Alemán (`de`)** y **Chino (`zh`)** mediante `i18next`.
* **Accesibilidad y Diseño Responsivo:** Interfaz adaptable a escritorio, tablet y móvil; soporte de tema claro/oscuro y selector persistente de **escala tipográfica (`A` / `A+` / `A++`)** en *Settings* para facilitar la lectura.

---

## Arquitectura del Sistema y Stack Tecnológico

El sistema sigue una arquitectura cliente-servidor desacoplada con comunicación vía API REST sobre HTTPS:

| Capa | Tecnologías Utilizadas | Infraestructura / Despliegue |
| :--- | :--- | :--- |
| **Frontend (SPA)** | React 18, TypeScript, Vite, Tailwind CSS, TanStack React Query, Zustand, React Router (`HashRouter`), `i18next`, Leaflet, `jsPDF` | **Vercel** (CI/CD automático desde Git + `vercel.json` rewrites) |
| **Backend (API REST)** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic, Passlib/Bcrypt, Python-JOSE (JWT), SMTP / Email Service | **Render** (Web Service) |
| **Base de Datos** | PostgreSQL (esquema relacional normalizado para propiedades, finanzas, reglas de riesgo, alertas y usuarios) | **Render Managed PostgreSQL** |

### Decisiones de Arquitectura Destacadas
* **Enrutamiento resiliente en producción:** Uso combinado de `HashRouter` en React y reglas de redirección en `vercel.json` para garantizar recargas de página (`F5`) y retornos de autenticación externa sin errores `404`.
* **Motor de reglas desacoplado:** Las reglas legales y financieras están modeladas en base de datos, permitiendo auditar exactamente qué criterio disparó cada alerta en una propiedad sin depender de cajas negras.

---

## Estructura del Repositorio

```text
CapstoneProject/
├── backend/                          # Servidor API REST en FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/                   # Endpoints versionados (auth, properties, saved, alerts, users)
│   │   ├── core/                     # Configuración, variables de entorno, seguridad JWT y DB session
│   │   ├── models/                   # Modelos SQLAlchemy (User, Property, RiskRule, SavedProperty, Alert)
│   │   ├── schemas/                  # Esquemas Pydantic de validación entrada/salida
│   │   ├── services/                 # Lógica de negocio (cálculo financiero, motor de semáforo, correo)
│   │   └── main.py                   # Punto de entrada FastAPI y configuración CORS
│   └── requirements.txt              # Dependencias de Python
│
├── web/                              # Aplicación Frontend en React + TypeScript
│   ├── public/                       # Activos estáticos
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # TopBar, Sidebar, AppShell
│   │   │   ├── properties/           # PropertyTable, PropertyCards, MapView, DetailDrawer
│   │   │   └── ui/                   # FlagPill, Spinner, Toast, controles reutilizables
│   │   ├── hooks/                    # Hooks de consulta y mutación (useProperties, useSaved, useAlerts)
│   │   ├── i18n/
│   │   │   ├── index.ts              # Configuración i18next
│   │   │   └── locales/              # Traducciones completas (es.json, en.json, de.json, zh.json)
│   │   ├── lib/                      # Cliente API, formateadores, generador PDF, catálogo Street View
│   │   ├── pages/                    # DashboardPage, SavedPage, AlertsPage, ProfilePage, SettingsPage, LoginPage
│   │   ├── store/                    # Stores Zustand (auth, theme, toast)
│   │   └── types/                    # Definiciones TypeScript de contratos API
│   ├── index.html
│   ├── package.json
│   └── vercel.json                   # Configuración de rewrites en Vercel
│
└── README.md                         # Documentación principal del proyecto
```

---

## Instalación y Ejecución Local

### Requisitos Previos
* **Node.js** `v18+` y `npm`
* **Python** `3.11+`
* Instancia de **PostgreSQL** (local o remota)

### 1. Configuración y Ejecución del Backend
```bash
cd backend
python -m venv .venv

# Activar entorno virtual:
# En Windows (PowerShell):
.venv\Scripts\Activate.ps1
# En Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

Crear un archivo `.env` dentro de `backend/` con las variables requeridas:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/clearbid_nj
SECRET_KEY=tu_clave_secreta_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173
```

Iniciar el servidor FastAPI:
```bash
uvicorn app.main:app --reload --port 8000
```
* API disponible en: `http://localhost:8000`
* Documentación interactiva Swagger UI: `http://localhost:8000/docs`

### 2. Configuración y Ejecución del Frontend
```bash
cd web
npm install
```

Crear un archivo `.env` dentro de `web/` apuntando al backend:
```env
VITE_API_URL=http://localhost:8000
```

Iniciar el servidor de desarrollo:
```bash
npm run dev
```
* Aplicación web disponible en: `http://localhost:5173`

---

## Alcance del MVP, Limitaciones y Trabajo Futuro

Por priorización de alcance y tiempos del ciclo Capstone, la versión actual entrega el flujo operativo completo para el perfil de inversionista. Se identifican las siguientes líneas de evolución para etapas posteriores:

1. **Consola Administrativa Web:** Actualmente, la carga de lotes de subastas, verificación de gravámenes y parametrización de reglas se ejecuta mediante scripts controlados directamente en el backend. Como trabajo futuro se proyecta construir una interfaz administrativa visual con control de roles (`admin` / `analyst`).
2. **Integración Directa con Portales Públicos de Condados:** Automatización mediante pipelines ETL/scraping programado para ingestar edictos judiciales y listados de *Sheriff Sales* directamente desde las oficinas de los condados de Nueva Jersey.
3. **Expansión Geográfica:** Escalamiento del catálogo piloto de **Mercer County** hacia otros condados de alta actividad en Nueva Jersey (Essex, Hudson, Bergen y Middlesex).