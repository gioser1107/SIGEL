from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
import models
from database import get_db

app = FastAPI(title="API Travel BQTO")

# Ruta de prueba básica
@app.get("/")
def ruta_raiz():
    return {"mensaje": "¡Backend de Travel BQTO inicializado con éxito!"}

# Ejemplo de una ruta que consulta a la base de datos (Tu Controlador)
@app.get("/usuarios")
def obtener_usuarios(db: Session = Depends(get_db)):
    # Esto es equivalente a un "SELECT * FROM usuarios"
    usuarios = db.query(models.Usuario).all()
    return usuarios