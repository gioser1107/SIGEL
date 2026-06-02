import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Carga backend/.env siempre desde esta carpeta (no depende de dónde ejecutes uvicorn)
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

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Abre y cierra la conexión a la base de datos en cada petición."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
