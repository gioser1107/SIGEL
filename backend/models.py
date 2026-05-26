from sqlalchemy import Column, Integer, String
from database import Base

# Como no hay migraciones, esta tabla "usuarios" DEBE existir físicamente en tu BD de MySQL
class Usuario(Base):
    __tablename__ = "usuarios"

    # Definimos las columnas exactamente como están en la BD
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100))
    rol = Column(String(50)) # Ej: Administrador, Guia, ATC
    correo = Column(String(100), unique=True, index=True)