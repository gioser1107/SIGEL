"""Respaldo y rotación de las dos bases MySQL (seguridad + negocio)."""

from __future__ import annotations

import gzip
import os
import re
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine, text

from database import (
    host_bd,
    nombre_bd,
    nombre_bd_seguridad,
    puerto_bd,
    url_mysql,
    usuario_bd,
)

DIAS_RETENCION = 7
DIRECTORIO_RESPALDOS = Path(__file__).resolve().parent.parent / "respaldos"
PATRON_ARCHIVO = re.compile(
    r"^respaldo_(seguridad|negocio)_(\d{8}_\d{6})\.sql(?:\.gz)?$"
)


def _ahora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _marca(ahora: datetime | None = None) -> str:
    return (ahora or _ahora()).strftime("%Y%m%d_%H%M%S")


def _contrasena_plana() -> str:
    from urllib.parse import unquote_plus

    from database import contrasena_bd

    return unquote_plus(contrasena_bd)


def _buscar_mysqldump() -> str | None:
    encontrado = shutil.which("mysqldump")
    if encontrado:
        return encontrado
    candidatos = [
        "/opt/homebrew/bin/mysqldump",
        "/usr/local/bin/mysqldump",
        "/usr/bin/mysqldump",
        r"C:\xampp\mysql\bin\mysqldump.exe",
        r"C:\Program Files\MariaDB 10.11\bin\mysqldump.exe",
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
    ]
    for ruta in candidatos:
        if Path(ruta).is_file():
            return ruta
    return None


def _volcar_con_mysqldump(mysqldump: str, base: str, destino: Path) -> None:
    comando = [
        mysqldump,
        f"--host={host_bd}",
        f"--port={puerto_bd}",
        f"--user={usuario_bd}",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--set-gtid-purged=OFF",
        "--default-character-set=utf8mb4",
        "--databases",
        base,
    ]
    env = os.environ.copy()
    clave = _contrasena_plana()
    if clave:
        env["MYSQL_PWD"] = clave
    with destino.open("w", encoding="utf-8") as archivo:
        proceso = subprocess.run(
            comando,
            stdout=archivo,
            stderr=subprocess.PIPE,
            env=env,
            check=False,
            text=True,
        )
    if proceso.returncode != 0:
        if destino.exists():
            destino.unlink()
        detalle = (proceso.stderr or "").strip() or f"código {proceso.returncode}"
        raise RuntimeError(f"mysqldump falló para {base}: {detalle}")


def _sql_literal(valor) -> str:
    if valor is None:
        return "NULL"
    if isinstance(valor, (bytes, bytearray)):
        return "0x" + valor.hex()
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return str(valor)
    texto = str(valor).replace("\\", "\\\\").replace("'", "''")
    return f"'{texto}'"


def _volcar_con_sqlalchemy(base: str, destino: Path) -> None:
    motor = create_engine(url_mysql(base), pool_pre_ping=True, pool_size=1, max_overflow=0)
    with motor.connect() as conexion, destino.open("w", encoding="utf-8") as archivo:
        archivo.write(f"-- Respaldo SIGEL de `{base}`\n")
        archivo.write("SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n")
        archivo.write(
            f"CREATE DATABASE IF NOT EXISTS `{base}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n"
        )
        archivo.write(f"USE `{base}`;\n\n")
        tablas = conexion.execute(text(f"SHOW TABLES FROM `{base}`")).fetchall()
        for (tabla,) in tablas:
            create = conexion.execute(text(f"SHOW CREATE TABLE `{base}`.`{tabla}`")).first()
            ddl = create[1] if create else ""
            archivo.write(f"DROP TABLE IF EXISTS `{tabla}`;\n")
            archivo.write(ddl.rstrip(";") + ";\n\n")
            filas = conexion.execute(text(f"SELECT * FROM `{base}`.`{tabla}`")).mappings().all()
            if not filas:
                continue
            columnas = list(filas[0].keys())
            lista_cols = ", ".join(f"`{c}`" for c in columnas)
            for fila in filas:
                valores = ", ".join(_sql_literal(fila[c]) for c in columnas)
                archivo.write(
                    f"INSERT INTO `{tabla}` ({lista_cols}) VALUES ({valores});\n"
                )
            archivo.write("\n")
        archivo.write("SET FOREIGN_KEY_CHECKS = 1;\n")
    motor.dispose()


def _comprimir(ruta: Path) -> Path:
    destino = ruta.with_suffix(ruta.suffix + ".gz")
    with ruta.open("rb") as origen, gzip.open(destino, "wb") as salida:
        shutil.copyfileobj(origen, salida)
    ruta.unlink()
    return destino


def _info_archivo(ruta: Path) -> dict:
    coincidencia = PATRON_ARCHIVO.match(ruta.name)
    tipo = coincidencia.group(1) if coincidencia else "otro"
    marca = coincidencia.group(2) if coincidencia else ""
    stat = ruta.stat()
    return {
        "archivo": ruta.name,
        "tipo": tipo,
        "marca": marca,
        "bytes": stat.st_size,
        "creado_en": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
    }


def rotar_respaldos(dias: int = DIAS_RETENCION) -> list[str]:
    DIRECTORIO_RESPALDOS.mkdir(parents=True, exist_ok=True)
    limite = _ahora() - timedelta(days=dias)
    borrados = []
    for ruta in DIRECTORIO_RESPALDOS.iterdir():
        if not ruta.is_file() or not PATRON_ARCHIVO.match(ruta.name):
            continue
        creado = datetime.fromtimestamp(ruta.stat().st_mtime)
        if creado < limite:
            ruta.unlink()
            borrados.append(ruta.name)
    return borrados


def generar_respaldo() -> dict:
    DIRECTORIO_RESPALDOS.mkdir(parents=True, exist_ok=True)
    marca = _marca()
    mysqldump = _buscar_mysqldump()
    metodo = "mysqldump" if mysqldump else "python"
    archivos = []
    for tipo, base in (("seguridad", nombre_bd_seguridad), ("negocio", nombre_bd)):
        destino = DIRECTORIO_RESPALDOS / f"respaldo_{tipo}_{marca}.sql"
        if mysqldump:
            try:
                _volcar_con_mysqldump(mysqldump, base, destino)
            except RuntimeError:
                if destino.exists():
                    destino.unlink()
                _volcar_con_sqlalchemy(base, destino)
                metodo = "python"
        else:
            _volcar_con_sqlalchemy(base, destino)
        comprimido = _comprimir(destino)
        archivos.append(_info_archivo(comprimido))
    rotados = rotar_respaldos()
    return {
        "marca": marca,
        "metodo": metodo,
        "retencion_dias": DIAS_RETENCION,
        "archivos": archivos,
        "eliminados_por_retencion": rotados,
    }


def listar_respaldos() -> dict:
    DIRECTORIO_RESPALDOS.mkdir(parents=True, exist_ok=True)
    items = [
        _info_archivo(ruta)
        for ruta in sorted(DIRECTORIO_RESPALDOS.iterdir(), reverse=True)
        if ruta.is_file() and PATRON_ARCHIVO.match(ruta.name)
    ]
    grupos: dict[str, list[dict]] = {}
    for item in items:
        grupos.setdefault(item["marca"], []).append(item)
    return {
        "bases": {
            "seguridad": nombre_bd_seguridad,
            "negocio": nombre_bd,
        },
        "retencion_dias": DIAS_RETENCION,
        "total": len(items),
        "respaldos": [
            {"marca": marca, "archivos": archivos}
            for marca, archivos in grupos.items()
        ],
    }


def ruta_respaldo_seguro(nombre_archivo: str) -> Path:
    if not PATRON_ARCHIVO.match(nombre_archivo or ""):
        raise FileNotFoundError("Nombre de respaldo no válido")
    candidato = (DIRECTORIO_RESPALDOS / nombre_archivo).resolve()
    if DIRECTORIO_RESPALDOS.resolve() not in candidato.parents:
        raise FileNotFoundError("Nombre de respaldo no válido")
    if not candidato.is_file():
        raise FileNotFoundError("Respaldo no encontrado")
    return candidato
