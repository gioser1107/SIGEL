# Registro de cambios del backend

Bitácora técnica de SIGEL (`backend/`). Cada modificación de código del API, modelos, migraciones o dependencias Python debe documentarse **aquí**, la entrada más nueva arriba.

No sustituye el SRS ni los RF. Sirve para defensa: qué cambió, por qué, y qué se dejó intacto.

---

## 2026-09-07 — Galería de destinos en el listado

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/destino_modelo.py`, `backend/migraciones/20260906_destino_dificultad.sql` (aplicada en local)
- **Qué se hizo:** `destino_a_dict` incluye `imagenes` por defecto (ya se consultaban para la portada). En la base local se añadió `destinos.dificultad` (la migración ya existía y no estaba aplicada).
- **Por qué:** sin `dificultad` cualquier consulta a destinos devolvía 503, así que la galería no cargaba y no se podía subir fotos.
- **Qué no se tocó:** rutas `/api/destinos/{id}/imagenes*`, permisos, conversión a WebP, soft-delete de fotos, catálogo público.
- **Cómo probarlo:** Destinos → Editar → debe verse la galería; elegir un JPG/PNG la agrega.

## 2026-09-07 — Registro portal vincula ficha admin sin pisar datos

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/usuario_modelo.py`
- **Qué se hizo:** `POST /api/auth/registro` sigue reclamando la ficha admin (`usuario_id` nulo) por el mismo tipo + número de documento. Si el cliente deja teléfono, dirección o ubicación vacíos, no se borran los datos de la agencia. La respuesta incluye `ficha_vinculada` y un mensaje distinto cuando se vincula.
- **Por qué:** el alta desde admin no crea usuario; el cliente debe registrarse en el portal. Al omitir el paso de ubicación se vaciaban estado, ciudad y teléfono de la ficha.
- **Qué no se tocó:** login, creación admin de clientes, roles, reservas ni el empareje por nombre de `asegurar_perfil_cliente_usuario`.
- **Cómo probarlo:** crear un cliente en admin (sin cuenta). En `/registro` usar el mismo documento y omitir ciudad. La ficha debe quedar con `usuario_id` y conservar la ubicación original.

## 2026-09-07 — Subida de imágenes de destino sin MIME

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/destino_imagen_modelo.py`
- **Qué se hizo:** `procesar_y_guardar_imagen_destino` ya no rechaza el archivo solo porque el `Content-Type` venga vacío o como `application/octet-stream` (típico en iPhone). Pillow valida que sea una imagen real. El tope de destino queda en 5 MB, alineado con el formulario.
- **Por qué:** al editar la galería de un destino, «Agregar imagen» no cargaba nada: el teléfono envía la foto sin tipo MIME y el API respondía 400. El error casi no se veía en el panel.
- **Qué no se tocó:** rutas `/api/destinos/{id}/imagenes*`, permisos, almacenamiento en `uploads/destinos/{id}/`, conversión a WebP.
- **Cómo probarlo:** en Destinos → Editar, tocar la zona de foto, elegir un JPG/PNG y pulsar «Agregar imagen»; debe aparecer en la galería.

## 2026-09-07 — Tasa BCV automática todos los días a la 1:00

- **Autor:** agente (Cursor)
- **Archivos:** `backend/utilidades/tasa_bcv_programada.py`, `backend/main.py`, `backend/.env.example`, `instalacion/env.ejemplo.txt`
- **Qué se hizo:** además de la sincronización al arrancar (`TASA_BCV_AUTO`), el API deja un bucle en segundo plano que consulta dolarapi y hace upsert de EUR/USD a la 1:00 de America/Caracas (`TASA_BCV_DIARIA` + `TASA_BCV_HORA`). Son interruptores distintos: el arranque puede quedar en 0 y la tarea de la 1:00 seguir activa.
- **Por qué:** la tasa del día es obligatoria para pagos en VES/EUR; si el servidor queda encendido de un día para otro no había recarga hasta el siguiente reinicio o hasta pulsar «Sincronizar BCV».
- **Qué no se tocó:** endpoint manual `/api/tasas/sincronizar-bcv`, origen `bcv`/`manual`, validación de tasa del día en pagos, frontend.
- **Cómo probarlo:** con `TASA_BCV_AUTO=1` y `TASA_BCV_HORA` unos minutos en el futuro, reiniciar uvicorn y revisar el log «Tasa oficial BCV cargada para hoy» a esa hora.

## 2026-09-06 — Bitácora: listado sin vista inexistente

- **Autor:** agente (Cursor)
- **Archivos:** `backend/modelos/bitacora_modelo.py`, `backend/controladores/asiento_controlador.py`
- **Qué se hizo:** `listar_bitacora` deja de consultar `v_bitacora_listado` (nunca existió en el dump ni en migraciones) y hace JOIN de `bitacora` + `usuarios`. `registrar_evento` normaliza módulo/acción fuera del ENUM. Los asientos registran módulo `viajes` en vez de `flota`.
- **Por qué:** abrir Bitácora devolvía 500; los eventos de asientos se perdían en silencio porque `flota` no está en el ENUM de la tabla.
- **Qué no se tocó:** filtros, paginación, permiso `leer_bitacora`, detalle JSON ni el resto de controladores que ya usaban módulos válidos.
- **Cómo probarlo:** entrar a Administración → Configuración → Bitácora; debe listar logins y operaciones recientes sin error de servidor.

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
