# Mensaje para iniciar Gemini en Antigravity

Copia el siguiente mensaje en Gemini, después de abrir en Antigravity la carpeta
`C:/Users/Jeanpier/Documents/OTI/Transferencia/.worktrees/firma-peru-frontend`:

---

Trabajarás en paralelo con Codex en la integración Firma Perú v2. Tu tarea es el
frontend. Codex implementa el backend y realiza la integración final. El usuario
ha autorizado esta colaboración y el desarrollo del conector de firma; el flujo
institucional se ajustará después.

Antes de editar:

1. Comprueba que estás en la carpeta `.worktrees/firma-peru-frontend` y en la rama
   `feature/firma-peru-v2-frontend`. No cambies de rama en la carpeta principal.
2. Lee `AGENTS.md`, `docs/coordinacion-firma-peru-v2.md`,
   `docs/contrato-api-firma-peru-v2.md` y `docs/patron-anexo-y-errores.md`.
3. Lee el buzón físico compartido:
   `C:/Users/Jeanpier/Documents/OTI/Transferencia/.coordination/firma-peru-v2/codex.md`.
4. Escribe tu ACK y plan en el archivo hermano `gemini.md`. Es tu único buzón de
   escritura. Consulta el buzón Codex al empezar cada turno y antes de decidir
   cambios. No hace falta instalar un servidor MCP para este intercambio.

Implementa únicamente `frontend/**`; documenta el resultado en
`docs/firma-peru-v2-frontend.md`. El contrato v1 permite avanzar aunque las rutas
del backend estén pendientes. Recupera selectivamente el conector de
`feature/firma-peru`; no copies páginas antiguas enteras. Reutiliza los componentes
y descargas autenticadas de main. No mostrar «firmado» únicamente por recibir
`signatureOk`; consultar el estado de la sesión del backend. Una firma activa por
pestaña; manejar cancelación, error de carga y timeout; limpiar callbacks y timers.

No modificar backend, contrato, composer, reglas de remisión ni credenciales. No
fusionar ni publicar ramas. Si necesitas un cambio API, propón un mensaje G-xxx
en tu buzón y espera ACK antes de depender de ese cambio.

Tu worktree no incluye `node_modules` ni archivos `.env` ignorados. Usa sus propias
dependencias y, si levantas otro Vite, usa otro puerto, por ejemplo 5174. No pares
los servicios del otro agente. El backend existente sigue en el puerto 8000.
No ejecutar migraciones ni pruebas contra la base compartida. El requisito de
Boost está siendo atendido por Codex en el backend principal; no instales Boost
en tu worktree para una tarea exclusivamente frontend.

Entrega commits locales, resultados de build/lint y pendientes en tu buzón.

---

Este archivo es un traspaso de instrucciones, no activa Gemini automáticamente.
