# SIGEL — Guía de instalación en una computadora vacía

Documento para instalar Travel BQTO en la laptop de la comunidad. Esa máquina **no tiene nada**: ni Python, ni base de datos, ni el sistema. Al terminar, abren SIGEL con un icono en el escritorio.

**Leé esto en orden. No saltes pasos.**

---

## 0. Git no alcanza (léelo antes de ir)

El código está en git, pero **clonar el repo en esa laptop no deja el sistema listo**.


| Qué hay en git                       | Qué falta en git                           |
| ------------------------------------ | ------------------------------------------ |
| Código Python y React                | `frontend/dist` (la pantalla ya compilada) |
| `instalacion/travel_bqto_limpia.sql` | `backend/.env` (clave de MySQL de ellos)   |
| Scripts de Windows                   | Programas: Python, MySQL/MariaDB           |


`frontend/dist` está en `.gitignore` a propósito. En la laptop de ellos **no se instala Node.js**. Por eso **tú compilas en tu Mac** y llevas esa carpeta en el USB.

En la laptop virgen **no uses git**. Copias desde el USB a `C:\SIGEL`.

Internet en esa laptop **sí hace falta el día de la instalación** (bajar Python, MySQL y las librerías de Python). Después puede funcionar sin internet.

---



## 1. En TU Mac, antes de salir

Haz esto en **tu** computadora, no en la de ellos.

### 1.1 Compilar la interfaz

Abre Terminal:

```bash
cd /Users/sergiojimenez/Desktop/TODO/PROYECTOS/SIGEL/frontend
npm install
npm run build
```

Comprueba que exista el archivo:

`frontend/dist/index.html`

Si ese archivo no está, en la laptop de ellos la web no abre.

### 1.2 Confirmar la base limpia

Debe existir:

`instalacion/travel_bqto_limpia.sql`

Esa es la base de **ellos**: usuarios y catálogos, **sin** tus reservas ni destinos de prueba. No exportes tu MySQL de trabajo.

### 1.3 Armar el USB

Copia la carpeta del proyecto. **No copies** estas carpetas (pesan y no sirven en Windows):

- `frontend/node_modules`
- `backend/.venv`
- `.git` (opcional; no hace falta)

Sí tiene que ir:

- `frontend/dist/` (entera)
- `backend/` (código, `requirements.txt`, `.env.example`)
- `instalacion/` (esta guía, el `.sql`, las carpetas `windows`)

En Terminal, si quieres copiar limpio a un USB montado en `/Volumes/USB`:

```bash
rsync -a --exclude node_modules --exclude .venv --exclude .git \
  /Users/sergiojimenez/Desktop/TODO/PROYECTOS/SIGEL/ \
  /Volumes/USB/SIGEL/
```

Lleva también **esta guía impresa o en el USB**, abierta en el Bloc de notas de ellos.

### 1.4 Lo que NO hace falta llevar

- Node.js
- tu base `travel_bqto` de desarrollo
- contraseñas de tu Mac

---



## 2. Cuentas que ya vienen en la base

Después de importar el SQL, estas tres cuentas existen. Contraseña inicial de las tres: `TravelBqto2026`


| Quién         | Correo                   | Para qué                                                    |
| ------------- | ------------------------ | ----------------------------------------------------------- |
| Administrador | `admin@travelbqto.com`   | Panel completo: destinos, viajes, reservas, pagos, usuarios |
| Guía          | `guia@travelbqto.com`    | Ver viajes, reservas, clientes y registrar abordaje         |
| Cliente       | `cliente@travelbqto.com` | Portal del pasajero (catálogo y sus reservas)               |


El público también puede **registrarse** solo desde la web (crea un cliente nuevo). No hace falta crear cada pasajero a mano.

Cuando entren, conviene que el admin **cambie esas tres contraseñas** en Seguridad → Usuarios.

---



## 3. En la laptop de ellos (Windows, desde cero)

Supuesto: Windows 10 u 11, usuario con permiso de instalar programas, hay internet.

### 3.1 Copiar el proyecto

1. Enchufa el USB.
2. Abre el Explorador de archivos.
3. Crea la carpeta `C:\SIGEL` (en el disco C, nombre corto, sin tildes ni espacios).
4. Copia **todo** el contenido de `SIGEL` del USB **dentro** de `C:\SIGEL`.

Al terminar debe existir, entre otras cosas:

- `C:\SIGEL\frontend\dist\index.html`
- `C:\SIGEL\backend\main.py`
- `C:\SIGEL\backend\requirements.txt`
- `C:\SIGEL\backend\.env.example`
- `C:\SIGEL\instalacion\travel_bqto_limpia.sql`
- `C:\SIGEL\instalacion\windows\iniciar.bat`

Si `dist\index.html` no está, volviste a copiar el repo sin compilar. Para y vuelve al paso 1.1.

### 3.2 Instalar Python

1. En el navegador entra a: [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Baja **Python 3.12** (Windows installer 64-bit).
3. Ejecuta el instalador.
4. **Marca la casilla** «Add python.exe to PATH» (abajo del todo). Si no la marcas, el resto falla.
5. Pulsa «Install Now».
6. Al final, si aparece «Disable path length limit», acéptalo.
7. Cierra el instalador.

Comprobar: clic derecho en Inicio → **Terminal** o **Símbolo del sistema**, escribe:

```bat
python --version
```

Tiene que salir algo como `Python 3.12.x`. Si dice que no se reconoce, desinstala Python, vuelve a instalar y **no olvides Add to PATH**. Cierra y abre otra vez la terminal después de instalar.

### 3.3 Instalar la base de datos

Elige **una** opción. No instales las dos.

#### Opción A — XAMPP (si ellos ya lo conocen)

1. Baja XAMPP de [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Instala con lo predeterminado (suele quedar en `C:\xampp`).
3. Abre el **Panel de control de XAMPP**.
4. Arranca **solo MySQL**. Apache **no** hace falta.
5. Deja MySQL en verde.

La clave de `root` en XAMPP nuevo suele estar **vacía**.

Para usar `mysql` en la terminal, o bien agregas `C:\xampp\mysql\bin` al PATH, o usas la ruta completa en el paso 3.4.

#### Opción B — MariaDB (mejor si la laptop es floja)

1. Baja MariaDB 10.11 o 11: [https://mariadb.org/download/](https://mariadb.org/download/)
2. Instalador Windows 64-bit.
3. Durante la instalación:
  - Anota la **contraseña de root** que pongas. La vas a necesitar.
  - Deja el puerto **3306**.
  - Marca que instale como servicio de Windows.
4. Termina e instala.

Si la laptop tiene poca RAM, después de instalar abre `C:\Program Files\MariaDB *\data\my.ini` (o el `my.ini` que indique el instalador) y en la sección `[mysqld]` agrega:

```ini
innodb_buffer_pool_size=64M
performance_schema=OFF
```

Guarda y reinicia el servicio MariaDB (Servicios de Windows → MariaDB → Reiniciar).

### 3.4 Importar la base limpia

Abre **Símbolo del sistema** (cmd).

**Con XAMPP:**

```bat
C:\xampp\mysql\bin\mysql.exe -u root -p < C:\SIGEL\instalacion\travel_bqto_limpia.sql
```

Si no tiene contraseña, pulsa Enter cuando pida `password`.

**Con MariaDB / MySQL en PATH:**

```bat
mysql -u root -p < C:\SIGEL\instalacion\travel_bqto_limpia.sql
```

Escribe la contraseña de root y Enter.

Ese archivo **borra y recrea** la base `travel_bqto`. En una PC virgen eso está bien. No lo ejecutes contra una base que ya tenga datos reales.

Si sale `mysql no se reconoce`, no está en el PATH: usa la ruta de XAMPP de arriba, o busca `mysql.exe` en `C:\Program Files\MariaDB *\bin\`.

Si sale error de archivo no encontrado, el SQL no está en `C:\SIGEL\instalacion\`. Revisa la copia del USB.

Cuando termine sin error, la base ya tiene roles, usuarios, estados, monedas y métodos de pago.

### 3.5 Entorno Python del sistema

Sigue en el símbolo del sistema:

```bat
cd C:\SIGEL\backend
python -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt
```

La línea de `pip install -r requirements.txt` necesita internet. Tarda unos minutos. Si falla por red, reintenta. No sigas hasta que termine en `Successfully installed`.

### 3.6 Crear `backend\.env`

En Windows los archivos que empiezan con punto (`.env`, `.env.example`) están ocultos. **No dependen de copiar `.env.example`.** Créalo así:

```bat
notepad C:\SIGEL\backend\.env
```

Si pregunta si quiere crear el archivo, di que sí. Si el Bloc de notas guarda `env.txt` en vez de `.env`, cierra y usa esto en el símbolo del sistema:

```bat
copy C:\SIGEL\instalacion\env.ejemplo.txt C:\SIGEL\backend\.env
notepad C:\SIGEL\backend\.env
```

O, si esa copia del USB ya trae el script:

```bat
C:\SIGEL\instalacion\windows\crear-env.bat
```

Déjalo así, cambiando solo la contraseña si MariaDB/XAMPP tiene clave:

```
DB_USUARIO=root
DB_CONTRASENA=
DB_HOST=localhost
DB_PUERTO=3306
DB_NOMBRE=travel_bqto
JWT_SECRETO=una-frase-larga-solo-de-esta-laptop
JWT_EXPIRACION_MINUTOS=480
```

- Si XAMPP y root **sin** clave: deja `DB_CONTRASENA=` vacío (nada después del `=`).
- Si MariaDB y pusiste clave: escríbela **justo después** del `=`, sin espacios ni comillas.
- `JWT_SECRETO`: cualquier frase larga inventada. No dejes el texto de ejemplo.

Guarda (Ctrl+S) y cierra el Bloc de notas.

No hace falta un `.env` en `frontend` en esa máquina: la interfaz ya se compiló en tu Mac.

### 3.7 Icono en el escritorio

```bat
C:\SIGEL\instalacion\windows\crear-acceso-directo.bat
```

Debe aparecer **SIGEL Travel BQTO** en el escritorio.

### 3.8 Primera arrancada

1. Confirma que MySQL/MariaDB esté encendido (XAMPP: MySQL en verde; o el servicio de Windows).
2. Doble clic en **SIGEL Travel BQTO**.
3. Se abre una **ventana negra**. **No la cierren** mientras usen el sistema.
4. El navegador debe abrir `http://127.0.0.1:8000`.

Si la ventana se cierra al instante, léela otra vez: casi siempre falta `frontend\dist`, Python o el `.env`.

---



## 4. Probar los tres usuarios

En `http://127.0.0.1:8000` → Iniciar sesión.

1. `admin@travelbqto.com` / `TravelBqto2026`
  Debe entrar al **panel admin** (menú completo).
2. Cierra sesión.
  `guia@travelbqto.com` / `TravelBqto2026`  
   Debe entrar al panel, con menos menús (viajes / abordaje).
3. Cierra sesión.
  `cliente@travelbqto.com` / `TravelBqto2026`  
   Debe entrar al **portal del cliente**, no al admin.

Si el admin no entra: SQL no se importó o `.env` tiene mal la clave de MySQL (error 503).

Si entra pero “no hay destinos”: es normal. La base está limpia.

---



## 5. Primer día de uso (datos reales)

Lo hace el **administrador**. Aún no hay viajes porque no se copiaron datos de prueba.

1. **Pagos → Tasas:** crea o corrige la tasa euro **de hoy**. Sin tasa del día, los cobros en bolívares fallan o avisan.
2. **Seguridad → Usuarios:** cambia las tres contraseñas iniciales.
3. **Destinos:** da de alta los destinos reales (nombre, precio en euros, fotos si tienen).
4. **Flota / unidades:** da de alta el bus (placa, capacidad) y **los asientos**.
5. **Puntos de recogida:** ya existe «Obelisco». Agregan las paradas que usen.
6. **Planificación:** crean un viaje (fecha de salida **sí puede ser futura**). Asignan guía y unidad.
7. A partir de ahí: clientes (alta en admin o registro en la web), reservas, pagos.

Los reportes, bitácora y pagos **no** aceptan fechas futuras. Solo las fechas de viaje (y la vigencia de una cotización).

---



## 6. Uso diario (cuando ya está instalado)

1. Encender la laptop.
2. Que MySQL esté corriendo (en XAMPP, abrir el panel y Start en MySQL si no arrancó solo).
3. Doble clic en **SIGEL Travel BQTO**.
4. Trabajar en el navegador. **No cerrar la ventana negra.**
5. Al terminar: cierran la ventana negra o ejecutan `C:\SIGEL\instalacion\windows\detener.bat`.

No hace falta internet para usar el sistema en esa laptop (solo para el día que instalaron Python y `pip`).

---



## 7. Si algo falla


| Qué ves                                    | Qué hacer                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `python` no se reconoce                    | Reinstalar Python marcando **Add to PATH**. Cerrar y abrir cmd.                       |
| Ventana negra se cierra al toque           | Falta `C:\SIGEL\frontend\dist\index.html`, o no hay `.venv`, o no hay `backend\.env`. |
| Navegador abre pero error 503 / no conecta | MySQL apagado, o `DB_CONTRASENA` mal en `.env`.                                       |
| `mysql` no se reconoce                     | Usar `C:\xampp\mysql\bin\mysql.exe` o la carpeta `bin` de MariaDB.                    |
| Puerto 8000 ocupado                        | Ejecutar `detener.bat` y volver a iniciar.                                            |
| `pip install` falla                        | Internet, o reintentar. En proxy de universidad a veces hay que usar otra red.        |
| Pantalla en blanco                         | No copiaste `frontend/dist`. Compila en tu Mac y vuelve a copiar esa carpeta.         |
| Admin entra como cliente                   | Estás usando `cliente@...`. Entra con `admin@travelbqto.com`.                         |


Para volver a importar la base **vacía** (borra todo lo que hayan cargado):

```bat
mysql -u root -p < C:\SIGEL\instalacion\travel_bqto_limpia.sql
```

Solo si están seguros. Eso elimina destinos, viajes y reservas que hayan creado.

---



## 8. Lista rápida (impresión)

**En tu Mac**

- [ ] `npm run build` y existe `frontend/dist/index.html`
- [ ] USB con el proyecto **incluyendo** `dist` y `instalacion/travel_bqto_limpia.sql`
- [ ] Sin `node_modules` ni `.venv`

**En la laptop de ellos**

- [ ] Copiar a `C:\SIGEL`
- [ ] Python 3.12 con PATH
- [ ] XAMPP (solo MySQL) o MariaDB
- [ ] Importar `travel_bqto_limpia.sql`
- [ ] `python -m venv .venv` y `pip install -r requirements.txt`
- [ ] Crear `backend\.env` (Bloc de notas o `instalacion\env.ejemplo.txt`) y poner clave de MySQL
- [ ] Acceso directo en el escritorio
- [ ] Probar admin, guía y cliente
- [ ] Cambiar contraseñas y cargar tasa / destinos / bus / viaje

**Usuarios**

- [admin@travelbqto.com](mailto:admin@travelbqto.com) / TravelBqto2026
- [guia@travelbqto.com](mailto:guia@travelbqto.com) / TravelBqto2026
- [cliente@travelbqto.com](mailto:cliente@travelbqto.com) / TravelBqto2026

