# Registro de cambios del backend

Bitácora técnica de SIGEL (`backend/`). Cada modificación de código del API, modelos, migraciones o dependencias Python debe documentarse **aquí**, la entrada más nueva arriba.

No sustituye el SRS ni los RF. Sirve para defensa: qué cambió, por qué, y qué se dejó intacto.

---

## 2026-09-06 — Efectivo $ y Zelle a la par (1 USD = 1 EUR)

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/pago_modelo.py`
- **Qué se hizo:** `convertir_monto_pago_a_eur` y `calcular_monto_en_moneda_desde_eur` tratan efectivo en dólares (`efectivo_usd`, `efectivo`+USD, `otro`) y Zelle como 1 USD = 1 EUR. Ya no cruzan tasa BCV USD/EUR.
- **Por qué:** un viaje de 35 € pagado con 35 $ en efectivo se descontaba ~30 € (cruce Bs/USD ÷ Bs/EUR). La agencia cobra el efectivo dólares a la par; el formulario admin ya lo mostraba así.
- **Qué no se tocó:** pago móvil, transferencia y TPV en bolívares (siguen usando tasa Bs/€). Reservas, cupos y conciliación.
- **Cómo probarlo:** registrar 35 USD en efectivo sobre una reserva de 35 €; el saldo debe quedar en 0,00 €.

## 2026-09-06 — Dificultad del destino (Fácil / Moderado / Difícil)

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/destino_modelo.py`, `backend/controladores/destino_controlador.py`, `backend/modelos/viaje_modelo.py`, `backend/migraciones/20260906_destino_dificultad.sql`, `instalacion/travel_bqto_limpia.sql`
- **Qué se hizo:** columna `destinos.dificultad` (Fácil, Moderado, Difícil); create/update/listado la persisten y el catálogo de viajes la usa. Ya no se infiere por duración del viaje.
- **Por qué:** el nivel de esfuerzo lo decide la agencia según el destino (terreno, caminata, público), no un cálculo automático. Un viaje de 3 días a la playa no es «Difícil» solo por durar más.
- **Qué no se tocó:** reservas, cupos, asientos, precios, estados de viaje.
- **Cómo probarlo:** crear o editar un destino con dificultad «Difícil»; en Agenda el viaje de ese destino debe mostrar esa etiqueta.

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
