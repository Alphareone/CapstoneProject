# PAQUETE DE DOCUMENTACIÓN DE CUMPLIMIENTO DE NORMAS ISO Y ESTÁNDARES GLOBALES
**Proyecto:** ClearBid NJ (Sistema de Inteligencia Pre-Puja para Remates Inmobiliarios)  
**Entorno Operativo:** FastAPI, Supabase Cloud, React 18, Docker Compose, Redis, Celery  
**Ubicación de Aplicación:** Mercer County, New Jersey  
**Fecha de Emisión:** Octubre 2026  

---

## DOCUMENTO 1: POLÍTICA DE SEGURIDAD DE LA INFORMACIÓN WEB

**Código Documental:** POL-SEC-001  
**Normativa de Referencia:** ISO/IEC 27001:2022 (Anexo A / Controles de Ciberseguridad)  
**Versión:** 1.0  
**Clasificación:** Confidencial / Uso Interno  

### 1. OBJETIVO
Garantizar la **Confidencialidad, Integridad y Disponibilidad (Tríada CID)** de los datos judiciales, financieros y de usuarios procesados en la plataforma web ClearBid NJ, estableciendo las salvaguardas técnicas exigidas por la norma ISO/IEC 27001:2022.

### 2. ALCANCE
Aplica al dominio de producción, endpoints de la API REST (`/api/v1/`), base de datos administrada en Supabase Cloud (`aws-0-us-east-1.pooler.supabase.com`), microservicios contenedorizados en Docker (FastAPI, Redis, Celery) y la aplicación Frontend SPA en React 18.

### 3. ROLES Y RESPONSABILIDADES
* **Oficial de Seguridad de la Información (CISO / Liderazgo TI):** Supervisar la ejecución del SGSI y auditar accesos a la base de datos.
* **Administradores Web y Desarrolladores:** Mantener los parches de seguridad en FastAPI/Pydantic, asegurar la integridad de las variables de entorno (`.env`) y ejecutar pruebas automatizadas.
* **Operadores / Equipo del Sheriff:** Cumplir con las políticas de uso aceptable y custodia de credenciales.

### 4. CONTROLES TÉCNICOS ISO 27001 IMPLEMENTADOS

#### 4.1. Cifrado de Comunicaciones y Almacenamiento (A.8.24)
* **Tráfico en Tránsito:** Todo el tráfico HTTP es forzado a **HTTPS** bajo protocolo **TLS 1.3** / TLS 1.2. Se implementa la cabecera `Strict-Transport-Security` (HSTS).
* **Protección de Credenciales:** Las contraseñas de los usuarios no se almacenan en texto plano. Se aplica el algoritmo de hashing criptográfico de memoria dura **Argon2id** (`argon2idv=19$m=65536,t=3,p=4`) verificado en base de datos.
* **Tokens de Sesión:** Manejo de sesiones mediante **JSON Web Tokens (JWT)** con tiempo de expiración definido y rotación de claves secretas.

#### 4.2. Autenticación de Doble Factor (2FA OTP) (A.5.15, A.8.5)
* Todo acceso administrativo exige la verificación en dos pasos. Tras validar las credenciales primarias, el backend genera un desafío de código de un solo uso (**OTP de 6 dígitos**) despachado por correo electrónico cifrado (SMTP / Gmail Service) hacia la casilla institucional del usuario.

#### 4.3. Seguridad en el Desarrollo y Manejo de Errores (A.8.28)
* Prevención activa contra vulnerabilidades OWASP Top 10 (Inyección SQL mediante ORM SQLAlchemy 2.0 asíncrono, XSS y CSRF mediante sanitización estricta con Pydantic V2).
* Separación de entornos: desarrollo en GitHub Codespaces / Docker Staging y producción en la nube.

#### 4.4. Respaldos y Continuidad de Negocio (A.8.13)
* **Copias de Seguridad:** Respaldos automáticos diarios gestionados por la infraestructura en la nube de Supabase Cloud (PostgreSQL 16) con replicación geográfica en AWS us-east-1.
* **Recuperación:** Pruebas semestrales de restauración del esquema de 25 tablas relacionales mediante migraciones versionadas con **Alembic**.

---

## DOCUMENTO 2: MANUAL DE CONTROL DE CALIDAD, MANTENIMIENTO Y MOTOR DE IA

**Código Documental:** MAN-CAL-001  
**Normativa de Referencia:** ISO 9001:2015 (Gestión de la Calidad) & ISO/IEC 25000 (SQuaRE - Calidad del Software)  
**Versión:** 1.0  
**Clasificación:** Documento Operativo  

### 1. OBJETIVO Y ENFOQUE DE CALIDAD
Definir los procesos de control de calidad del software, mantenibilidad de la infraestructura en contenedores y las especificaciones técnicas del **Motor de Decisión Inteligente (Sistema Experto de IA / Semáforo de Riesgo)** de ClearBid NJ.

### 2. ESPECIFICACIÓN DEL MÓDULO DE INTELIGENCIA ARTIFICIAL (SISTEMA EXPERTO DE RIESGO)
El componente de Inteligencia Artificial de ClearBid NJ opera bajo el paradigma de **IA Simbólica / Sistema Experto de Reglas Ponderadas y Análisis Predictivo**:

```
[Datos de Entrada: Subastas / Registros Públicos]
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  MOTOR DE DECISIÓN ANALÍTICO (SISTEMA EXPERTO)│
│  - Reglas financieras (ARV, Opening Bid, Debt)│
│  - Detección de Gravámenes (IRS / Tax Liens)  │
│  - Algoritmo de Proyección de ROI            │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           RESULTADO PREDICTIVO DE IA          │
│  - Clasificación: VERDE / AMARILLO / ROJO     │
│  - Estimación ROI (% Porcentaje de Retorno)   │
└──────────────────────────────────────────────┘
```

#### 2.1. Lógica del Algoritmo de Inferencia:
1. **Extracción y Normalización:** El motor consume variables físicas (`property_physical`), financieras (`property_financials`) y legales (`property_legal`).
2. **Evaluación de Reglas de Riesgo:**
   * **Riesgo Bajo (VERDE - No Issues):** Relación Deuda / ARV < 15%, sin títulos de segundo orden o deudas federales.
   * **Riesgo Moderado (AMARILLO - Warning):** Relación Deuda / ARV entre 15% y 35%, o falta de inspección física confirmada.
   * **Riesgo Crítico (ROJO - High Risk):** Relación Deuda / ARV > 35%, presencia de gravámenes preferentes del IRS o avisos judiciales severos.
3. **Cálculo Predictivo de ROI:** Automatización de la fórmula de rendimiento financiero proyectado ($ROI = \frac{ARV - \text{Deuda Total} - \text{Opening Bid}}{\text{Inversión Total}} \times 100$), entregando valores en tiempo real (ej. +15.95% para *4216 Nottingham Way*).

### 3. CONTROL DE CALIDAD DEL SOFTWARE Y DevOps (ISO 25000)
* **Contenerización y Mantenibilidad:** Implementación de arquitectura reproducible mediante Docker Compose compitiendo 3 servicios aislados:
  1. `backend-api-1`: Servidor FastAPI / Uvicorn Python 3.12-slim.
  2. `backend-redis`: Broker de mensajería en memoria Redis 7 (alpine).
  3. `backend-worker`: Procesador de tareas asíncronas Celery v5.6.3 (8 procesos prefork).
* **Aseguramiento de Calidad (QA):** Ejecución obligatoria de la suite automatizada con **Pytest** en el pipeline previo al despliegue, exigiendo la verificación de aserciones de estado HTTP (200, 201, 401) en controladores de autenticación y datos.

---

## DOCUMENTO 3: DECLARACIÓN DE ACCESIBILIDAD Y CUMPLIMIENTO DE ESTÁNDARES WEB

**Código Documental:** DEC-ACC-001  
**Normativa de Referencia:** WCAG 2.1 (Web Content Accessibility Guidelines - Nivel AA) / W3C Standards  
**Versión:** 1.0  
**Clasificación:** Público  

### 1. COMPROMISO INSTITUCIONAL
ClearBid NJ está diseñado y construido bajo los principios universales de la Web Accessibility Initiative (WAI) del W3C, garantizando que los operadores judiciales, personal de la oficina del Sheriff y usuarios generales puedan consultar la plataforma sin barreras tecnológicas.

### 2. EVALUACIÓN DE PRINCIPIOS WCAG 2.1 (NIVEL AA)

#### 2.1. Perceptible
* **Contraste de Color:** La interfaz desarrollada en React 18 / Tailwind CSS cumple con la proporción de contraste de color superior a **4.5:1** para textos normales y componentes de estado del semáforo (Verde `#22c55e`, Amarillo `#eab308`, Rojo `#ef4444`).
* **Diseño Adaptable:** Interfaz 100% responsiva escalable a diferentes resoluciones sin pérdida de información ni requerimiento de desplazamiento bidimensional.

#### 2.2. Operable
* **Navegación por Teclado:** Toda la funcionalidad del dashboard, filtros de propiedades, tablas interactiva y modales de verificación 2FA es completamente operable mediante la tecla `Tab`, `Enter` y flechas de dirección.
* **Sin Trampas de Foco:** Se garantiza que los elementos interactivos no bloqueen el foco del teclado durante la navegación por los registros de subastas.

#### 2.3. Comprensible
* **Formularios y Retroalimentación:** Los campos de autenticación e ingreso de códigos OTP cuentan con etiquetas descriptivas claras, mensajes de error explícitos y guía paso a paso.
* **Consistencia:** La simbología, terminología de subastas de New Jersey (Sheriff Sale, Tax Lien, Tax Deed) y menús de navegación se mantienen uniformes en toda la SPA.

#### 2.4. Robusto
* **Marcado Semántico:** El código JSX/HTML5 cumple con el marcado semántico oficial auditado mediante linters automatizados, garantizando compatibilidad total con lectores de pantalla (NVDA, JAWS) y diversos navegadores web.

---

## REGISTRO DE APROBACIÓN Y REVISIÓN

| Rol | Nombre | Firma / Estado | Fecha |
| :--- | :--- | :--- | :--- |
| **Líder de Proyecto / Backend** | Alfredo Castro | Aprobado | Octubre 2026 |
| **Desarrollador Frontend / Seguridad** | Cristopher Hernández | Aprobado | Octubre 2026 |
| **Ingeniero DevOps / QA** | Matías Tirado | Aprobado | Octubre 2026 |
| **Especialista BD / Modelado** | Felipe Calderón | Aprobado | Octubre 2026 |