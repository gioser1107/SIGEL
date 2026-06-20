from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencias.auth_dependencia import obtener_usuario_actual
from utilidades.auth_utilidad import iniciar_sesion, registrar_cliente_portal
from utilidades.bitacora_utilidad import obtener_ip_origen, registrar_evento

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class DatosLogin(BaseModel):
    correo: str
    contrasena: str


class DatosRegistroCliente(BaseModel):
    nombre: str
    apellido: str
    correo: str
    contrasena: str
    tipo_cliente: str = "natural"
    tipo_documento: str
    numero_documento: str
    razon_social: str | None = None
    telefono: str | None = None
    telefono_secundario: str | None = None
    direccion: str | None = None
    estado_id: int | None = None
    ciudad_id: int | None = None


@router.post("/login")
def iniciar_sesion_endpoint(datos: DatosLogin, request: Request, db: Session = Depends(get_db)):
    resultado = iniciar_sesion(db, datos.correo, datos.contrasena)
    usuario = resultado["usuario"]

    registrar_evento(
        db,
        modulo="seguridad",
        accion="LOGIN",
        resumen="Inicio de sesión",
        usuario_id=usuario["id"],
        tabla_afectada="usuarios",
        registro_id=usuario["id"],
        detalle={"correo": usuario["correo"], "rol": usuario["rol"]},
        ip_origen=obtener_ip_origen(request),
    )

    return resultado


@router.post("/registro")
def registrar_cliente_portal_endpoint(
    datos: DatosRegistroCliente,
    db: Session = Depends(get_db),
):
    return registrar_cliente_portal(db, datos)


@router.get("/perfil")
def obtener_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    return {
        "mensaje": "Sesión activa",
        "usuario": usuario_actual,
    }
