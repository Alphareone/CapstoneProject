# 🔒 Checklist de Auditoría de Seguridad Express
**Proyecto:** [Nombre del Proyecto]
**Fecha de Revisión:** [Fecha]

Antes de enviar a producción (o pasarle el link al PO), verificar los siguientes puntos:

## 1. Autenticación y Autorización (Evitar IDOR)
- [ ] Todas las rutas privadas están protegidas por middleware/guards.
- [ ] El backend verifica que `req.user.id` tiene permisos explícitos sobre el recurso solicitado.
- [ ] Los tokens JWT (si se usan) tienen tiempo de expiración (TTL) corto.

## 2. Manejo de Datos (Evitar Fugas)
- [ ] Ningún endpoint devuelve objetos completos de la base de datos (Selectores o DTOs aplicados).
- [ ] Las contraseñas NO se devuelven nunca, y están hasheadas (bcrypt/argon2).
- [ ] Los mensajes de error del backend en producción no exponen el `stack trace` ni detalles de SQL.

## 3. Infraestructura y Entorno
- [ ] CORS está configurado para aceptar únicamente los dominios de producción y staging.
- [ ] No hay secretos (`.env`) subidos al repositorio.
- [ ] Rate limiting implementado en rutas sensibles (ej. `/login`, `/register`).
- [ ] Inputs sanitizados / validados estáticamente usando Zod/Joi para evitar XSS e Inyecciones SQL.
