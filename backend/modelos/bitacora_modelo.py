from datetime import datetime

from fastapi import HTTPException, Request
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, JSON, String, text
from sqlalchemy.orm import Session

from database import Base
from modelos.permiso_modelo import PERMISO_LEER_BITACORA
from modelos.usuario_modelo import Usuario


class Bitacora(Base):
    __tablename__ = "bitacora"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    modulo = Column(
        Enum(
            "seguridad",
            "catalogo",
            "viajes",
            "reservas",
            "pagos",
            "conciliacion",
            "cotizaciones",
            "abordaje",
            "sistema",
        ),
        nullable=False,
        default="sistema",
        index=True,
    )
    accion = Column(
        Enum(
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
        ),
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
        registro_texto = str(registro_id) if registro_id is not None else None
        entrada = Bitacora(
            usuario_id=usuario_id,
            modulo=modulo,
            accion=accion,
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


def _entrada_listado_a_dict(fila: dict) -> dict:
    return {
        "id": fila["id"],
        "creado_en": fila["creado_en"],
        "modulo": fila["modulo"],
        "accion": fila["accion"],
        "tabla_afectada": fila["tabla_afectada"],
        "registro_id": fila["registro_id"],
        "resumen": fila["resumen"],
        "ip_origen": fila["ip_origen"],
        "usuario_id": fila["usuario_id"],
        "usuario_nombre": fila["usuario_nombre"],
        "usuario_correo": fila["usuario_correo"],
    }


def listar_bitacora(
    db: Session,
    modulo: str | None = None,
    accion: str | None = None,
    usuario_id: int | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    q: str | None = None,
    limite: int = 50,
    pagina: int = 1,
) -> dict:
    condiciones = ["1 = 1"]
    parametros: dict = {}

    if modulo is not None:
        condiciones.append("modulo = :modulo")
        parametros["modulo"] = modulo
    if accion is not None:
        condiciones.append("accion = :accion")
        parametros["accion"] = accion
    if usuario_id is not None:
        condiciones.append("usuario_id = :usuario_id")
        parametros["usuario_id"] = usuario_id
    if fecha_desde is not None:
        condiciones.append("creado_en >= :fecha_desde")
        parametros["fecha_desde"] = fecha_desde
    if fecha_hasta is not None:
        condiciones.append("creado_en <= :fecha_hasta")
        parametros["fecha_hasta"] = fecha_hasta
    if q is not None and q.strip():
        condiciones.append(
            "(resumen LIKE :busqueda OR usuario_nombre LIKE :busqueda OR usuario_correo LIKE :busqueda)"
        )
        parametros["busqueda"] = f"%{q.strip()}%"

    where_sql = " AND ".join(condiciones)
    offset = (pagina - 1) * limite
    parametros["limite"] = limite
    parametros["offset"] = offset

    consulta_total = text(
        f"SELECT COUNT(*) AS total FROM v_bitacora_listado WHERE {where_sql}"
    )
    total = db.execute(consulta_total, parametros).scalar() or 0

    consulta_listado = text(
        f"""
        SELECT id, creado_en, modulo, accion, tabla_afectada, registro_id,
               resumen, ip_origen, usuario_id, usuario_nombre, usuario_correo
        FROM v_bitacora_listado
        WHERE {where_sql}
        ORDER BY creado_en DESC
        LIMIT :limite OFFSET :offset
        """
    )
    filas = db.execute(consulta_listado, parametros).mappings().all()
    items = [_entrada_listado_a_dict(dict(fila)) for fila in filas]

    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "limite": limite,
    }


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
