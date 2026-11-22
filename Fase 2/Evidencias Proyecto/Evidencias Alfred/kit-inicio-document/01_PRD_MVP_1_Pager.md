# 📄 Documento de Definición Mínima (1-Pager / PRD)
**Proyecto:** [Nombre del Proyecto]
**Fecha:** [Fecha]
**Propietario (PO):** [Nombre]
**Tech Lead / Senior Dev:** [Tu Nombre]

## 1. Objetivo del Proyecto (El "Por qué")
[Describe en 2-3 líneas el problema de negocio que resuelve este MVP].

## 2. Alcance Estricto (Scope)
### ✅ IN SCOPE (Qué SÍ hará el MVP)
1. [Ej: Autenticación de usuarios vía Google y Email].
2. [Ej: Dashboard CRUD para gestión de inventario básico].
3. [Ej: Pasarela de pagos con Stripe (Solo tarjetas de crédito)].

### ❌ OUT OF SCOPE (Qué NO hará el MVP - Para Fase 2)
1. [Ej: Notificaciones Push].
2. [Ej: Soporte offline].
3. [Ej: Pagos con PayPal o Criptomonedas].

## 3. Criterios de Aceptación Clave (Given-When-Then)
* **Historia 1:** Como usuario, quiero... para...
  * *Given* (Dado que) un usuario no está logueado...
  * *When* (Cuando) intenta acceder a /dashboard...
  * *Then* (Entonces) es redirigido a /login.

## 4. Cronograma y Entregables
* **Día X:** Modelado de Datos y Walking Skeleton (Backend conectado).
* **Día Y:** MVP Funcional en Vercel/Staging.
* **Día Z:** Auditoría de seguridad y Pase a Producción.

---
*Nota: Si no hay observaciones a este documento antes de [Fecha/Hora], el equipo técnico asumirá estas reglas como aprobadas para construir el MVP.*
