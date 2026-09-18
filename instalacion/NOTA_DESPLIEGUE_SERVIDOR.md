# Despliegue en travelbqto.kontrolaonline.com

La data de producción **no se regenera**. No corras `sembrar_base_limpia.py` ni importes `travel_bqto_limpia.sql` en este servidor.

## Qué subir

- Backend (Python) con CAPTCHA, hash dual y restauración.
- Frontend compilado (`frontend/dist`).
- Opcional: `backend/migraciones/20260917_funcion_procedimiento_reportes.sql`

## Al reiniciar la app

`aplicar_objetos_mysql()` crea vistas/triggers (ya existían) y, si el hosting lo permite, la función y el procedimiento. Si Fastcomet bloquea `CREATE FUNCTION`, abre phpMyAdmin y pega el SQL de la migración. **Ese script no borra filas.**

## Contraseñas

Los usuarios que ya existen siguen entrando: el login acepta el hash viejo (SHA-256) y el nuevo (MD5+SHA-256). No hay que resetear claves.

## Respaldos

En la defensa: **Generar** y **Descargar**. **Restaurar** solo si el docente lo pide y el archivo es el que acabas de generar. Restaurar un respaldo viejo sí pisa data.

## Comprobación rápida

1. Login admin con CAPTCHA.
2. Reportes con un rango que ya tenga data.
3. En MySQL: `SHOW FUNCTION STATUS WHERE Db = 'travel_bqto';` y `SHOW PROCEDURE STATUS WHERE Db = 'travel_bqto';`
