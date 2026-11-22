# 🏗️ RFC: Arquitectura Técnica y System Design
**Proyecto:** [Nombre del Proyecto]
**Estado:** [Borrador / En Revisión / Aprobado]

## 1. Contexto
[Resumen técnico de lo que se va a construir y los desafíos principales de ingeniería].

## 2. Decisiones de Stack Tecnológico (Costo $0 inicial)
* **Frontend:** React + Vite + TypeScript + TailwindCSS + Shadcn/ui. (Host: Vercel).
* **Backend / API:** [Ej: Cloudflare Workers / Node.js con Fastify].
* **Base de Datos:** [Ej: Supabase (PostgreSQL) / Neon].
* **Autenticación:** [Ej: Supabase Auth / Clerk].

## 3. Esquema de Base de Datos (Core)
```sql
-- Ejemplo de tablas principales
CREATE TABLE Users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. Contratos de API (Endpoints Críticos)
| Método | Endpoint | Body (Request) | Response (Éxito) | Response (Error) |
|---|---|---|---|---|
| POST | `/api/v1/orders` | `{ productId, qty }` | `201 { id, status }` | `400 / 403` |

## 5. Riesgos y Mitigaciones
* **Riesgo:** [Ej: Limitaciones del Free Tier de la Base de Datos].
* **Mitigación:** [Ej: Implementar caché con Redis o en el Edge].
