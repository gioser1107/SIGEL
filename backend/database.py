from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# URL de conexión a tu MySQL local
# Formato: mysql+pymysql://usuario:contraseña@servidor:puerto/nombre_base_de_datos
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:@localhost:3306/travelbqto_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Esta función la usaremos en las rutas para abrir y cerrar la conexión en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()