# 🚀 Plan de Despliegue y Entrega (Release)
**Versión:** v1.0.0 (MVP)
**Fecha Objetivo:** [Fecha]

## 1. Pre-Despliegue
- [ ] Variables de entorno configuradas en el entorno de Producción (Vercel, Supabase).
- [ ] Migraciones de Base de Datos ejecutadas en Producción.
- [ ] Semgrep / Linter ejecutado en local (0 errores críticos).
- [ ] Pruebas E2E / Integración básicas pasando en verde.

## 2. Procedimiento de Rollout
1. Merge de rama `develop` a `main`.
2. Verificar que el CI/CD pipeline pasa con éxito.
3. Monitorear logs de despliegue en Vercel / Host de Backend.
4. Ejecutar validación de salud (Healthcheck en `/api/health`).

## 3. Monitoreo (Post-Despliegue)
- [ ] Sentry / Datadog inicializado y sin errores en la primera hora.
- [ ] Confirmar que los correos transaccionales (Ej. Resend) llegan correctamente.

## 4. Plan de Rollback (En caso de fallo crítico)
1. Revertir el último commit en Git: `git revert HEAD`.
2. Si hubo cambios destructivos en DB: Restaurar backup diario desde [Proveedor].
