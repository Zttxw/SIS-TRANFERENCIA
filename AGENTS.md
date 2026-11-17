# Guías del proyecto

- Las guías de Laravel Boost para el backend están en [backend/AGENTS.md](backend/AGENTS.md) y las skills en `backend/.agents/skills/`.
- PHP y Composer no están en el host: el backend corre en Docker (`docker exec sis_transferencia_backend php artisan ...`). Los comandos de Boost necesitan `-e APP_ENV=local` (ver [CLAUDE.md](CLAUDE.md)).
- Plan de trabajo vigente: [docs/nueva-directiva/plan-adecuacion-directiva.md](docs/nueva-directiva/plan-adecuacion-directiva.md).
