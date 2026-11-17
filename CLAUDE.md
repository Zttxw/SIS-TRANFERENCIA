@backend/AGENTS.md

# Entorno de desarrollo

- PHP y Composer **no** están en el host: el backend corre en Docker (`docker compose`, servicio `backend`, contenedor `sis_transferencia_backend`, código montado en `/var/www/html`).
- Ejecutar artisan/composer con: `docker exec sis_transferencia_backend php artisan ...`.
- El contenedor tiene `APP_ENV=production`, así que los comandos de Laravel Boost necesitan `-e APP_ENV=local`. Para que escriban en el repo, hay que ejecutarlos con el UID del host y una caché de vistas temporal:
  `docker exec -u "$(id -u):$(id -g)" -e HOME=/tmp -e APP_ENV=local -e VIEW_COMPILED_PATH=/tmp/boost-views sis_transferencia_backend sh -c 'mkdir -p /tmp/boost-views && php artisan boost:update'`
- Frontend (React + Vite) en el contenedor `sis_transferencia_frontend` (`frontend/`).
- Plan de trabajo vigente: [docs/nueva-directiva/plan-adecuacion-directiva.md](docs/nueva-directiva/plan-adecuacion-directiva.md).
