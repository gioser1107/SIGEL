from datetime import datetime

from fastapi import HTTPException, Request
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, JSON, String, func, or_
from sqlalchemy.orm import Session

from database import Base
from modelos.permiso_modelo import PERMISO_LEER_BITACORA
from modelos.usuario_modelo import Usuario
from utilidades.paginacion import paginar_consulta, respuesta_paginada

MODULOS_BITACORA = (
    "seguridad",
    "catalogo",
    "viajes",
    "reservas",
    "pagos",
    "conciliacion",
    "cotizaciones",
    "abordaje",
    "sistema",
)
ACCIONES_BITACORA = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "VALIDAR",
    "RECHAZAR",
    "ANULAR",
    "ERROR",
    "OTRO",
)
ALIAS_MODULO = {
    "flota": "viajes",
    "transporte": "viajes",
    "clientes": "catalogo",
    "destinos": "catalogo",
}


class Bitacora(Base):
    __tablename__ = "bitacora"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    modulo = Column(
        Enum(*MODULOS_BITACORA),
        nullable=False,
        default="sistema",
        index=True,
    )
    accion = Column(
        Enum(*ACCIONES_BITACORA),
        nullable=False,
        default="OTRO",
        index=True,
    )
    tabla_afectada = Column(String(80), nullable=True)
    registro_id = Column(String(40), nullable=True)
    resumen = Column(String(500), nullable=False)
    detalle = Column(JSON, nullable=True)
    ip_origen = Column(String(45), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)


def obtener_ip_origen(request: Request | None) -> str | None:
    if request is None:
        return None
    if request.client is not None:
        return request.client.host
    return None


def registrar_evento(
    db: Session,
    modulo: str,
    accion: str,
    resumen: str,
    usuario_id: int | None = None,
    tabla_afectada: str | None = None,
    registro_id: str | int | None = None,
    detalle: dict | None = None,
    ip_origen: str | None = None,
) -> None:
    try:
        modulo_valido = ALIAS_MODULO.get(modulo, modulo)
        if modulo_valido not in MODULOS_BITACORA:
            modulo_valido = "sistema"
        accion_valida = accion if accion in ACCIONES_BITACORA else "OTRO"
        registro_texto = str(registro_id) if registro_id is not None else None
        entrada = Bitacora(
            usuario_id=usuario_id,
            modulo=modulo_valido,
            accion=accion_valida,
            tabla_afectada=tabla_afectada,
            registro_id=registro_texto,
            resumen=resumen[:500],
            detalle=detalle,
            ip_origen=ip_origen,
            creado_en=datetime.now(),
        )
        db.add(entrada)
        db.commit()
    except Exception:
        db.rollback()


def verificar_permiso_bitacora(usuario_actual: dict) -> None:
    permisos = usuario_actual.get("permisos", [])
    if PERMISO_LEER_BITACORA not in permisos:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para consultar la bitácora",
        )


def _entrada_listado_a_dict(entrada: Bitacora, usuario: Usuario | None) -> dict:
    return {
        "id": entrada.id,
        "creado_en": entrada.creado_en,
        "modulo": entrada.modulo,
        "accion": entrada.accion,
        "tabla_afectada": entrada.tabla_afectada,
        "registro_id": entrada.registro_id,
        "resumen": entrada.resumen,
        "ip_origen": entrada.ip_origen,
        "usuario_id": entrada.usuario_id,
        "usuario_nombre": _nombre_completo_de(usuario.nombre, usuario.apellido) if usuario is not None else None,
        "usuario_correo": usuario.correo if usuario is not None else None,
    }


def listar_bitacora(
    db: Session,
    modulo: str | None = None,
    accion: str | None = None,
    usuario_id: int | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    q: str | None = None,
    limite: int = 10,
    pagina: int = 1,
) -> dict:
    nombre_usuario = func.trim(
        func.concat(
            func.coalesce(Usuario.nombre, ""),
            " ",
            func.coalesce(Usuario.apellido, ""),
        )
    )
    consulta = (
        db.query(Bitacora, Usuario)
        .outerjoin(Usuario, Bitacora.usuario_id == Usuario.id)
    )

    if modulo is not None:
        consulta = consulta.filter(Bitacora.modulo == modulo)
    if accion is not None:
        consulta = consulta.filter(Bitacora.accion == accion)
    if usuario_id is not None:
        consulta = consulta.filter(Bitacora.usuario_id == usuario_id)
    if fecha_desde is not None:
        consulta = consulta.filter(Bitacora.creado_en >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.filter(Bitacora.creado_en <= fecha_hasta)
    if q is not None and q.strip():
        termino = f"%{q.strip()}%"
        consulta = consulta.filter(
            or_(
                Bitacora.resumen.like(termino),
                nombre_usuario.like(termino),
                Usuario.correo.like(termino),
            )
        )

    filas, total = paginar_consulta(
        consulta.order_by(Bitacora.creado_en.desc()),
        pagina,
        limite,
    )
    items = [_entrada_listado_a_dict(entrada, usuario) for entrada, usuario in filas]
    return respuesta_paginada(items, total, pagina, limite)


def _nombre_completo_de(nombre: str | None, apellido: str | None) -> str:
    return f"{nombre or ''} {apellido or ''}".strip()


def obtener_detalle_bitacora(db: Session, entrada_id: int) -> dict:
    entrada = db.query(Bitacora).filter(Bitacora.id == entrada_id).first()
    if entrada is None:
        raise HTTPException(status_code=404, detail="Registro de bitácora no encontrado")

    usuario = None
    if entrada.usuario_id is not None:
        usuario = db.query(Usuario).filter(Usuario.id == entrada.usuario_id).first()

    return {
        "id": entrada.id,
        "creado_en": entrada.creado_en,
        "modulo": entrada.modulo,
        "accion": entrada.accion,
        "tabla_afectada": entrada.tabla_afectada,
        "registro_id": entrada.registro_id,
        "resumen": entrada.resumen,
        "detalle": entrada.detalle,
        "ip_origen": entrada.ip_origen,
        "usuario_id": entrada.usuario_id,
        "usuario_nombre": _nombre_completo_de(usuario.nombre, usuario.apellido) if usuario is not None else None,
        "usuario_correo": usuario.correo if usuario is not None else None,
    }
