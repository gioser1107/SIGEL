from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Session

from database import Base
from modelos.asiento_modelo import Asiento, asiento_a_dict
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.cliente_modelo import Cliente, buscar_ciudad, buscar_estado
from modelos.punto_recogida_modelo import PuntoRecogida, punto_recogida_a_dict
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.usuario_modelo import Usuario, nombre_completo_de
from modelos.viaje_modelo import Viaje, obtener_viaje_activo, viaje_a_dict

ESTADO_ABORDADO = "abordado"
ESTADO_NO_PRESENTADO = "no_presentado"
ESTADO_PENDIENTE = "pendiente"
ESTADOS_ABORDAJE = (ESTADO_ABORDADO, ESTADO_NO_PRESENTADO)
ESTADOS_RESERVA_MANIFIESTO = ("confirmada", "abonada")


class AbordajeViaje(Base):
    __tablename__ = "abordajes_viaje"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_cliente_id = Column(BigInteger, ForeignKey("reserva_clientes.id"), nullable=False, index=True)
    abordado_en = Column(DateTime, nullable=False)
    registrado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    estado = Column(
        Enum(*ESTADOS_ABORDAJE),
        nullable=False,
        default=ESTADO_ABORDADO,
    )
    notas = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def _validar_estado_abordaje(estado: str) -> str:
    if estado not in ESTADOS_ABORDAJE:
        raise HTTPException(
            status_code=422,
            detail=f"Estado invalido. Use: {', '.join(ESTADOS_ABORDAJE)}",
        )
    return estado


def _cliente_resumen(db: Session, cliente: Cliente) -> dict:
    estado = buscar_estado(db, cliente.estado_id)
    ciudad = buscar_ciudad(db, cliente.ciudad_id)
    return {
        "id": cliente.id,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "telefono": cliente.telefono,
        "telefono_secundario": cliente.telefono_secundario,
        "estado": estado.nombre if estado else None,
        "ciudad": ciudad.nombre if ciudad else None,
    }


def _domicilio_dict(db: Session, punto_id: int | None) -> dict | None:
    if punto_id is None:
        return None
    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.eliminado_en.is_(None),
    ).first()
    if punto is None:
        return None
    return punto_recogida_a_dict(punto)


def _asiento_pasajero(db: Session, viaje_id: int, reserva_cliente_id: int) -> dict | None:
    fila = (
        db.query(AsientoReservado, Asiento)
        .join(Asiento, Asiento.id == AsientoReservado.asiento_id)
        .filter(
            AsientoReservado.viaje_id == viaje_id,
            AsientoReservado.reserva_cliente_id == reserva_cliente_id,
            AsientoReservado.eliminado_en.is_(None),
            Asiento.eliminado_en.is_(None),
        )
        .first()
    )
    if fila is None:
        return None
    reserva_asiento, asiento = fila
    data = asiento_a_dict(asiento)
    data["asiento_reservado_id"] = reserva_asiento.id
    return data


def _orden_ruta_por_viajero(db: Session, viaje_id: int) -> dict[int, dict]:
    try:
        from modelos.viaje_ruta_recogida_modelo import ViajeRutaRecogida
    except ImportError:
        return {}

    filas = (
        db.query(ViajeRutaRecogida)
        .filter(
            ViajeRutaRecogida.viaje_id == viaje_id,
            ViajeRutaRecogida.eliminado_en.is_(None),
        )
        .all()
    )
    return {
        r.reserva_cliente_id: {
            "orden": r.orden,
            "hora_programada": r.hora_programada,
            "notas": r.notas,
        }
        for r in filas
    }


def _abordaje_activo(db: Session, reserva_cliente_id: int) -> AbordajeViaje | None:
    return db.query(AbordajeViaje).filter(
        AbordajeViaje.reserva_cliente_id == reserva_cliente_id,
        AbordajeViaje.eliminado_en.is_(None),
    ).first()


def abordaje_a_dict(db: Session, abordaje: AbordajeViaje | None) -> dict | None:
    if abordaje is None:
        return None

    registrador = None
    if abordaje.registrado_por is not None:
        usuario = db.query(Usuario).filter(Usuario.id == abordaje.registrado_por).first()
        if usuario is not None:
            registrador = {
                "id": usuario.id,
                "nombre": nombre_completo_de(usuario.nombre, usuario.apellido),
            }

    return {
        "id": abordaje.id,
        "reserva_cliente_id": abordaje.reserva_cliente_id,
        "estado": abordaje.estado,
        "abordado_en": abordaje.abordado_en,
        "registrado_por": abordaje.registrado_por,
        "registrado_por_nombre": registrador["nombre"] if registrador else None,
        "notas": abordaje.notas,
        "creado_en": abordaje.creado_en,
        "actualizado_en": abordaje.actualizado_en,
    }


def _pasajeros_manifiesto(db: Session, viaje_id: int) -> list[tuple[ReservaCliente, Reserva, Cliente]]:
    return (
        db.query(ReservaCliente, Reserva, Cliente)
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .join(Cliente, Cliente.id == ReservaCliente.cliente_id)
        .filter(
            Reserva.viaje_id == viaje_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado.in_(ESTADOS_RESERVA_MANIFIESTO),
            ReservaCliente.eliminado_en.is_(None),
            Cliente.eliminado_en.is_(None),
        )
        .all()
    )


def _validar_pasajero_del_viaje(
    db: Session,
    viaje_id: int,
    reserva_cliente_id: int,
) -> tuple[ReservaCliente, Reserva, Cliente]:
    fila = (
        db.query(ReservaCliente, Reserva, Cliente)
        .join(Reserva, Reserva.id == ReservaCliente.reserva_id)
        .join(Cliente, Cliente.id == ReservaCliente.cliente_id)
        .filter(
            ReservaCliente.id == reserva_cliente_id,
            ReservaCliente.eliminado_en.is_(None),
            Reserva.viaje_id == viaje_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado.in_(ESTADOS_RESERVA_MANIFIESTO),
            Cliente.eliminado_en.is_(None),
        )
        .first()
    )
    if fila is None:
        raise HTTPException(
            status_code=400,
            detail="El pasajero no pertenece a una reserva confirmada o abonada de este viaje",
        )
    return fila


def _item_manifiesto(
    db: Session,
    viaje_id: int,
    pasajero: ReservaCliente,
    reserva: Reserva,
    cliente: Cliente,
    orden_ruta: dict[int, dict],
) -> dict:
    abordaje = _abordaje_activo(db, pasajero.id)
    ruta = orden_ruta.get(pasajero.id)
    asiento = _asiento_pasajero(db, viaje_id, pasajero.id)

    return {
        "reserva_cliente_id": pasajero.id,
        "reserva_id": reserva.id,
        "reserva_estado": reserva.estado,
        "es_titular": pasajero.es_titular,
        "es_menor": pasajero.es_menor,
        "ocupa_asiento": pasajero.ocupa_asiento,
        "cliente": _cliente_resumen(db, cliente),
        "domicilio": _domicilio_dict(db, pasajero.punto_recogida_id),
        "asiento": asiento,
        "orden_ruta": ruta["orden"] if ruta else None,
        "hora_recogida_programada": ruta["hora_programada"] if ruta else None,
        "estado_abordaje": abordaje.estado if abordaje else ESTADO_PENDIENTE,
        "abordaje": abordaje_a_dict(db, abordaje),
    }


def _ordenar_manifiesto(items: list[dict]) -> list[dict]:
    def clave(item: dict):
        orden = item.get("orden_ruta")
        asiento_num = (item.get("asiento") or {}).get("numero")
        apellido = (item.get("cliente") or {}).get("apellido") or ""
        nombre = (item.get("cliente") or {}).get("nombre") or ""
        asiento_orden = int(asiento_num) if asiento_num and str(asiento_num).isdigit() else 9999
        return (
            0 if orden is not None else 1,
            orden if orden is not None else 9999,
            asiento_orden,
            apellido.lower(),
            nombre.lower(),
            item["reserva_cliente_id"],
        )

    return sorted(items, key=clave)


def _resumen_desde_items(pasajeros: list[dict]) -> dict:
    abordados = sum(1 for p in pasajeros if p["estado_abordaje"] == ESTADO_ABORDADO)
    no_presentados = sum(1 for p in pasajeros if p["estado_abordaje"] == ESTADO_NO_PRESENTADO)
    pendientes = sum(1 for p in pasajeros if p["estado_abordaje"] == ESTADO_PENDIENTE)
    return {
        "total_pasajeros": len(pasajeros),
        "abordados": abordados,
        "no_presentados": no_presentados,
        "pendientes": pendientes,
    }


def listar_viajes_para_abordaje(
    db: Session,
    estado: str | None = None,
    solo_hoy: bool = False,
) -> list[dict]:
    consulta = db.query(Viaje).filter(
        Viaje.eliminado_en.is_(None),
        Viaje.estado.in_(("planificado", "en_curso", "finalizado")),
    )
    if estado is not None:
        consulta = consulta.filter(Viaje.estado == estado)
    if solo_hoy:
        hoy = datetime.now().date()
        inicio = datetime.combine(hoy, datetime.min.time())
        fin = inicio + timedelta(days=1)
        consulta = consulta.filter(
            Viaje.fecha_salida >= inicio,
            Viaje.fecha_salida < fin,
        )

    viajes = consulta.order_by(Viaje.fecha_salida.asc()).all()
    resultado = []
    for viaje in viajes:
        filas = _pasajeros_manifiesto(db, viaje.id)
        orden_ruta = _orden_ruta_por_viajero(db, viaje.id)
        pasajeros = [
            _item_manifiesto(db, viaje.id, pasajero, reserva, cliente, orden_ruta)
            for pasajero, reserva, cliente in filas
        ]
        resumen = _resumen_desde_items(pasajeros)
        resultado.append({
            **viaje_a_dict(db, viaje),
            "resumen_abordaje": resumen,
        })
    return resultado


def obtener_manifiesto_viaje(db: Session, viaje_id: int) -> dict:
    viaje = obtener_viaje_activo(db, viaje_id)
    orden_ruta = _orden_ruta_por_viajero(db, viaje_id)
    filas = _pasajeros_manifiesto(db, viaje_id)
    pasajeros = [
        _item_manifiesto(db, viaje_id, pasajero, reserva, cliente, orden_ruta)
        for pasajero, reserva, cliente in filas
    ]
    pasajeros = _ordenar_manifiesto(pasajeros)
    resumen = _resumen_desde_items(pasajeros)

    return {
        "viaje": viaje_a_dict(db, viaje),
        "resumen": resumen,
        "pasajeros": pasajeros,
    }


def resumen_abordaje_viaje(db: Session, viaje_id: int) -> dict:
    manifiesto = obtener_manifiesto_viaje(db, viaje_id)
    return {
        "viaje_id": viaje_id,
        **manifiesto["resumen"],
    }


def registrar_abordaje_pasajero(
    db: Session,
    viaje_id: int,
    reserva_cliente_id: int,
    estado: str,
    registrado_por_usuario_id: int,
    notas: str | None = None,
    abordado_en: datetime | None = None,
) -> dict:
    _validar_estado_abordaje(estado)
    _validar_pasajero_del_viaje(db, viaje_id, reserva_cliente_id)

    ahora = datetime.now()
    momento = abordado_en or ahora
    existente = _abordaje_activo(db, reserva_cliente_id)

    if existente is None:
        abordaje = AbordajeViaje(
            reserva_cliente_id=reserva_cliente_id,
            abordado_en=momento,
            registrado_por=registrado_por_usuario_id,
            estado=estado,
            notas=notas,
            creado_en=ahora,
            actualizado_en=ahora,
        )
        db.add(abordaje)
    else:
        abordaje = existente
        abordaje.estado = estado
        abordaje.abordado_en = momento
        abordaje.registrado_por = registrado_por_usuario_id
        abordaje.notas = notas
        abordaje.actualizado_en = ahora

    db.commit()
    db.refresh(abordaje)

    pasajero, reserva, cliente = _validar_pasajero_del_viaje(db, viaje_id, reserva_cliente_id)
    orden_ruta = _orden_ruta_por_viajero(db, viaje_id)
    item = _item_manifiesto(db, viaje_id, pasajero, reserva, cliente, orden_ruta)

    return {
        "mensaje": "Abordaje registrado",
        "abordaje": abordaje_a_dict(db, abordaje),
        "pasajero": item,
    }


def registrar_abordajes_lote(
    db: Session,
    viaje_id: int,
    registros: list,
    registrado_por_usuario_id: int,
) -> dict:
    obtener_viaje_activo(db, viaje_id)
    resultados = []
    for registro in registros:
        resultado = registrar_abordaje_pasajero(
            db,
            viaje_id,
            registro.reserva_cliente_id,
            estado=registro.estado,
            notas=registro.notas,
            registrado_por_usuario_id=registrado_por_usuario_id,
            abordado_en=getattr(registro, "abordado_en", None),
        )
        resultados.append(resultado)

    return {
        "mensaje": f"Se procesaron {len(resultados)} registros de abordaje",
        "procesados": len(resultados),
        "resultados": resultados,
        "resumen": resumen_abordaje_viaje(db, viaje_id),
    }


def actualizar_abordaje(
    db: Session,
    abordaje_id: int,
    estado: str | None = None,
    notas: str | None = None,
    registrado_por_usuario_id: int | None = None,
    abordado_en: datetime | None = None,
) -> dict:
    abordaje = db.query(AbordajeViaje).filter(
        AbordajeViaje.id == abordaje_id,
        AbordajeViaje.eliminado_en.is_(None),
    ).first()
    if abordaje is None:
        raise HTTPException(status_code=404, detail="Registro de abordaje no encontrado")

    ahora = datetime.now()
    if estado is not None:
        abordaje.estado = _validar_estado_abordaje(estado)
    if notas is not None:
        abordaje.notas = notas
    if abordado_en is not None:
        abordaje.abordado_en = abordado_en
    if registrado_por_usuario_id is not None:
        abordaje.registrado_por = registrado_por_usuario_id
    abordaje.actualizado_en = ahora

    db.commit()
    db.refresh(abordaje)
    return {
        "mensaje": "Abordaje actualizado",
        "abordaje": abordaje_a_dict(db, abordaje),
    }


def eliminar_abordaje(db: Session, abordaje_id: int) -> dict:
    abordaje = db.query(AbordajeViaje).filter(
        AbordajeViaje.id == abordaje_id,
        AbordajeViaje.eliminado_en.is_(None),
    ).first()
    if abordaje is None:
        raise HTTPException(status_code=404, detail="Registro de abordaje no encontrado")

    ahora = datetime.now()
    abordaje.eliminado_en = ahora
    abordaje.actualizado_en = ahora
    db.commit()

    return {
        "mensaje": "Abordaje anulado; el pasajero queda pendiente",
        "abordaje_id": abordaje_id,
        "reserva_cliente_id": abordaje.reserva_cliente_id,
    }


def obtener_abordaje(db: Session, abordaje_id: int) -> dict:
    abordaje = db.query(AbordajeViaje).filter(
        AbordajeViaje.id == abordaje_id,
        AbordajeViaje.eliminado_en.is_(None),
    ).first()
    if abordaje is None:
        raise HTTPException(status_code=404, detail="Registro de abordaje no encontrado")
    return {"abordaje": abordaje_a_dict(db, abordaje)}
