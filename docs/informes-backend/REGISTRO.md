# Registro de cambios del backend

Bitácora técnica de SIGEL (`backend/`). Cada modificación de código del API, modelos, migraciones o dependencias Python debe documentarse **aquí**, la entrada más nueva arriba.

No sustituye el SRS ni los RF. Sirve para defensa: qué cambió, por qué, y qué se dejó intacto.

---

## 2026-09-06 — Pool MySQL, mensajes de error y migraciones en shared

- **Autor:** agente (Cursor)
- **Archivos:** `backend/database.py`, `backend/main.py`, `backend/env.example`, `backend/migraciones/20260903_tasa_origen_bcv.sql`, `backend/migraciones/20260705_soft_delete_catalogo_pagos.sql`
- **Qué se hizo:** pool SQLAlchemy más pequeño y con `pool_recycle`; respuestas de error con `detalle` y `detail`; CORS extra por `CORS_ORIGENES`; migraciones SQL idempotentes sin `USE travel_bqto` / `CREATE DATABASE`.
- **Por qué:** en producción (cPanel) los 500/503 intermitentes y los toasts genéricos; en shared no hay permiso para crear/borrar bases desde el dump.
- **Qué no se tocó:** RF de reservas, cupos, asientos, roles ni estructura de módulos.
- **Cómo probarlo:** login y una reserva; conflicto de asiento debe mostrar el texto de concurrencia, no solo “Error del servidor (409)”.

## 2026-09-06 — Informes de backend y regla de Cursor

- **Autor:** agente (Cursor)
- **Archivos:** `.cursor/rules/informe-backend.mdc`, `docs/informes-backend/REGISTRO.md`
- **Qué se hizo:** se creó la regla de Cursor y este registro. No se alteró lógica de FastAPI, modelos ni migraciones en este paso.
- **Por qué:** dejar trazabilidad de cada cambio de backend para la universidad y para quien retome el código.
- **Qué no se tocó:** controladores, reglas de reservas, autenticación, frontend.
- **Cómo probarlo:** abrir este archivo y la regla en `.cursor/rules/informe-backend.mdc`.
