# Instalación permanente en la laptop de la comunidad

**Guía completa (PC vacía, cada paso, usuarios):** abre `GUIA_PC_VIRGEN.md` en esta misma carpeta.

Este archivo es el resumen. SIGEL queda en **esa** máquina, en `localhost`. Ellos lo abren cuando quieran con un acceso directo. En su laptop **no se instala Node.js**. Git **no basta**: hay que llevar `frontend/dist` compilado en el USB.

La base que se instala es **limpia**: pueden entrar, pero destinos y viajes los crean ellos.

| Rol | Correo | Contraseña inicial |
|---|---|---|
| Administrador | admin@travelbqto.com | TravelBqto2026 |
| Guía | guia@travelbqto.com | TravelBqto2026 |
| Cliente | cliente@travelbqto.com | TravelBqto2026 |

## Qué sí hay que instalar (una sola vez)

| Programa | Para qué | Notas para máquina floja |
|---|---|---|
| Python 3.10 o 3.12 | Corre la API y sirve la interfaz | Marca *Add python.exe to PATH* |
| MariaDB 10.11 / MySQL 8 | Base de datos `travel_bqto` | No instales XAMPP completo si puedes evitarlo |
| Navegador | Chrome o Edge | Ya suele estar |

No instales Docker ni Node.

Si solo conocen XAMPP: instálalo, pero en el panel **arranca únicamente MySQL**. Apache y phpMyAdmin no hacen falta para usar SIGEL.

## Parte A — En tu PC (antes de ir)

1. Compila la interfaz (esto es lo que evita Node en la comunidad):

```bash
cd frontend
npm install
npm run build
```

Debe existir `frontend/dist/index.html`.

2. **No copies tu base de trabajo.** Ellos reciben la base limpia ya armada:

`instalacion/travel_bqto_limpia.sql`

Tiene esquema, roles, 3 usuarios, estados/ciudades, monedas, métodos de pago, bancos y una parada. **No** trae destinos, viajes, reservas ni pagos de prueba.

Si la regeneras:

```bash
cd backend
.venv\Scripts\python sembrar_base_limpia.py --sql-solo
```

En Mac:

```bash
cd backend
.venv/bin/python sembrar_base_limpia.py --sql-solo
```

3. Copia a un USB (sin `frontend/node_modules` ni `backend/.venv` de tu Mac):

- carpeta del proyecto (con `frontend/dist` ya compilado)
- `instalacion/travel_bqto_limpia.sql`
- este archivo de instrucciones

## Parte B — En la laptop de ellos

1. Copia el proyecto a `C:\SIGEL` (ruta corta, sin espacios raros).
2. Instala Python y MariaDB/MySQL.
3. En MariaDB, si la laptop tiene poca RAM, en `my.ini` (o `my.cnf`):

```ini
[mysqld]
innodb_buffer_pool_size=64M
performance_schema=OFF
```

Reinicia el servicio de MariaDB.

4. Importa la base limpia (el archivo ya crea `travel_bqto`):

```bat
mysql -u root -p < C:\SIGEL\instalacion\travel_bqto_limpia.sql
```

Cuentas iniciales (cambiar la clave en Seguridad > Usuarios cuando entren):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@travelbqto.com` | `TravelBqto2026` |
| Guía | `guia@travelbqto.com` | `TravelBqto2026` |
| Cliente (portal) | `cliente@travelbqto.com` | `TravelBqto2026` |

El primer día, en **Pagos > Tasas**, confirmen o actualicen la tasa euro del día. Luego crean destinos, buses y viajes reales.

5. Python del sistema:

```bat
cd C:\SIGEL\backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy C:\SIGEL\instalacion\env.ejemplo.txt C:\SIGEL\backend\.env
notepad C:\SIGEL\backend\.env
```

En Windows `.env.example` suele estar oculto o no copiarse del USB. El archivo visible es `instalacion\env.ejemplo.txt`. Edita `backend\.env` con la clave real de MySQL (vacío si XAMPP no tiene clave).

6. Acceso directo en el escritorio:

```bat
C:\SIGEL\instalacion\windows\crear-acceso-directo.bat
```

## Uso diario

1. Que MySQL/MariaDB esté corriendo (servicio de Windows; suele arrancar solo).
2. Doble clic en **SIGEL Travel BQTO**.
3. Se abre el navegador en `http://127.0.0.1:8000`.
4. **No cierren la ventana negra** mientras usen el sistema.
5. Para apagar: cierran esa ventana o ejecutan `instalacion\windows\detener.bat`.

## Si algo falla

- Ventana negra se cierra al instante: falta Python, el `.venv` o `frontend\dist`.
- Navegador carga pero no hay datos / error 503: MySQL apagado o `backend\.env` con clave incorrecta.
- Puerto ocupado: ejecuta `detener.bat` y vuelve a iniciar.

Cuando la universidad habilite un servidor, se copia la misma carpeta y el dump; en `.env` se cambia `DB_HOST`. La laptop de ellos no tiene que repetir Node ni Vite.
