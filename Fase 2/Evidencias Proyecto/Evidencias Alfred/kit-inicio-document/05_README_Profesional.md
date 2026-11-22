# [Nombre del Proyecto] - Repositorio Principal

## 📖 Sobre el Proyecto
[Breve descripción orientada a ingenieros sobre qué hace la aplicación].

## 🛠️ Stack Tecnológico
* **Frontend:** React, TypeScript, Tailwind, Zustand, TanStack Query.
* **Backend:** Node.js, Prisma, PostgreSQL.
* **Infra:** Docker, GitHub Actions, Vercel, Supabase.

## 🚀 Cómo iniciar el proyecto en local

### 1. Prerrequisitos
* Node.js v18+
* Docker & Docker Compose
* pnpm (recomendado) o npm

### 2. Instalación y Ejecución
```bash
# 1. Clonar e instalar dependencias
git clone [url-del-repo]
cd [nombre-proyecto]
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# (Llenar las credenciales en .env)

# 3. Levantar Base de Datos (Docker)
docker-compose up -d

# 4. Sincronizar Prisma y levantar servidor
npx prisma db push
pnpm run dev
```

## 📂 Estructura de Carpetas (Arquitectura por Dominio)
```text
src/
 ├── modules/         # Lógica de negocio (Users, Orders, etc.)
 ├── components/      # Componentes UI reutilizables (Botones, Modales)
 ├── lib/             # Clientes externos (Axios, Prisma, Sentry)
 └── tests/           # Pruebas unitarias y de integración
```
