import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import ForeignKey, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

directorio_backend = Path(__file__).resolve().parent
load_dotenv(directorio_backend / ".env")

usuario_bd = os.getenv("DB_USUARIO", "root")
contrasena_bd = quote_plus(os.getenv("DB_CONTRASENA", ""))
host_bd = os.getenv("DB_HOST", "localhost")
puerto_bd = os.getenv("DB_PUERTO", "3306")
nombre_bd = os.getenv("DB_NOMBRE", "travel_bqto")
nombre_bd_seguridad = os.getenv("DB_NOMBRE_SEGURIDAD", "travel_bqto_seguridad")

TABLAS_SEGURIDAD = (
    "roles",
    "permisos",
    "roles_permisos",
    "usuarios",
    "bitacora",
)


def _entero_entorno(nombre: str, predeterminado: int) -> int:
    bruto = os.getenv(nombre, "").strip()
    if not bruto:
        return predeterminado
    try:
        valor = int(bruto)
    except ValueError:
        return predeterminado
    return valor if valor >= 0 else predeterminado


def url_mysql(nombre: str | None = None) -> str:
    base = f"mysql+pymysql://{usuario_bd}:{contrasena_bd}@{host_bd}:{puerto_bd}"
    if nombre:
        return f"{base}/{nombre}"
    return f"{base}/"


def tabla_seguridad() -> dict:
    return {"schema": nombre_bd_seguridad}


def fk_usuario() -> ForeignKey:
    return ForeignKey(f"{nombre_bd_seguridad}.usuarios.id")


def fk_rol() -> ForeignKey:
    return ForeignKey(f"{nombre_bd_seguridad}.roles.id")


def fk_permiso() -> ForeignKey:
    return ForeignKey(f"{nombre_bd_seguridad}.permisos.id")


SQLALCHEMY_DATABASE_URL = url_mysql(nombre_bd)

# Pool pequeño: hosting compartido corta conexiones inactivas (~300 s).
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=_entero_entorno("DB_POOL_RECICLO", 280),
    pool_size=_entero_entorno("DB_POOL_TAMANO", 2),
    max_overflow=_entero_entorno("DB_POOL_EXTRA", 3),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        try:
            db.execute(text("SET @sigel_usuario_id = NULL, @sigel_ip = NULL"))
        except Exception:
            pass
        db.close()


def fijar_contexto_auditoria(db, usuario_id: int | None, ip: str | None) -> None:
    """Variables de sesión que leen los triggers de bitácora."""
    db.execute(
        text("SET @sigel_usuario_id := :uid, @sigel_ip := :ip"),
        {"uid": usuario_id, "ip": (ip or "")[:45]},
    )


def asegurar_bases() -> None:
    """Crea las dos bases si no existen. No toca tablas ni datos."""
    motor_raiz = create_engine(url_mysql(), pool_pre_ping=True)
    with motor_raiz.connect() as conexion:
        conexion = conexion.execution_options(isolation_level="AUTOCOMMIT")
        for nombre in (nombre_bd_seguridad, nombre_bd):
            conexion.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{nombre}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
    motor_raiz.dispose()


def _base_responde(nombre: str) -> dict:
    motor = create_engine(url_mysql(nombre), pool_pre_ping=True, pool_size=1, max_overflow=0)
    try:
        with motor.connect() as conexion:
            conexion.execute(text("SELECT 1"))
        return {"nombre": nombre, "disponible": True}
    except Exception as error:
        return {"nombre": nombre, "disponible": False, "detalle": str(error.__class__.__name__)}
    finally:
        motor.dispose()


def estado_bases() -> dict:
    return {
        "seguridad": _base_responde(nombre_bd_seguridad),
        "negocio": _base_responde(nombre_bd),
    }
