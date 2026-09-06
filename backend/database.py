import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

directorio_backend = Path(__file__).resolve().parent
load_dotenv(directorio_backend / ".env")

usuario_bd = os.getenv("DB_USUARIO", "root")
contrasena_bd = quote_plus(os.getenv("DB_CONTRASENA", ""))
host_bd = os.getenv("DB_HOST", "localhost")
puerto_bd = os.getenv("DB_PUERTO", "3306")
nombre_bd = os.getenv("DB_NOMBRE", "travel_bqto")

SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{usuario_bd}:{contrasena_bd}@{host_bd}:{puerto_bd}/{nombre_bd}"
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
        db.close()
