from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Session

from database import Base
from modelos.asiento_modelo import Asiento
from modelos.asiento_reservado_modelo import AsientoReservado
from modelos.cliente_modelo import (
    Cliente,
    buscar_ciudad,
    buscar_estado,
    registrar_cliente_para_reserva,
)
from modelos.destino_modelo import Destino, imagenes_destino
from modelos.punto_recogida_modelo import (
    PuntoRecogida,
    asignar_puntos_a_cliente,
    obtener_punto_predeterminado_cliente,
    punto_pertenece_a_cliente,
    punto_recogida_a_dict,
    validar_punto_recogida_del_cliente,
)
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.viaje_modelo import (
    Viaje,
    calcular_disponibilidad_viaje,
    viaje_disponible_para_reserva,
    viaje_reserva_a_dict,
)
from utilidades.paginacion import offset_pagina, respuesta_paginada
from utilidades.persistencia import (
    _confirmar_transaccion,
    _marcar_eliminado_logico,
    _persistir,
    _revertir_transaccion,
)


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    viaje_id = Column(BigInteger, ForeignKey("viajes.id"), nullable=False, index=True)
    fecha_reserva = Column(DateTime, nullable=False)
    estado = Column(
        Enum("pendiente", "confirmada", "abonada", "cancelada"),
        nullable=False,
        default="pendiente",
    )
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def obtener_reserva_activa(db: Session, reserva_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.eliminado_en.is_(None),
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva


def obtener_pasajero_activo(db: Session, reserva_id: int, pasajero_id: int) -> ReservaCliente:
    pasajero = db.query(ReservaCliente).filter(
        ReservaCliente.id == pasajero_id,
        ReservaCliente.reserva_id == reserva_id,
    ).first()
    if not pasajero:
        raise HTTPException(status_code=404, detail="Pasajero no encontrado en esta reserva")
    return pasajero


def obtener_reserva_activa_cliente_en_viaje(
    db: Session,
    cliente_id: int,
    viaje_id: int,
) -> Reserva | None:
    return (
        db.query(Reserva)
        .filter(
            Reserva.cliente_id == cliente_id,
            Reserva.viaje_id == viaje_id,
            Reserva.eliminado_en.is_(None),
            Reserva.estado != "cancelada",
        )
        .order_by(Reserva.id.desc())
        .first()
    )


def _bloquear_viaje_para_reserva(db: Session, viaje_id: int) -> Viaje:
    viaje = (
        db.query(Viaje)
        .filter(Viaje.id == viaje_id, Viaje.eliminado_en.is_(None))
        .with_for_update()
        .first()
    )
    if not viaje:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return viaje


def _exigir_cupo_disponible(db: Session, viaje: Viaje, asientos_nuevos: int) -> None:
    if asientos_nuevos <= 0:
        return
    info = calcular_disponibilidad_viaje(db, viaje)
    disponibles = int(info.get("asientos_disponibles") or 0)
    if asientos_nuevos > disponibles:
        raise HTTPException(
            status_code=409,
            detail=(
                "No hay cupos suficientes para este viaje. "
                "Otro cliente acaba de tomar los asientos restantes."
            ),
        )


def validar_viaje_para_reserva(db: Session, viaje_id: int, *, bloquear: bool = False) -> Viaje:
    if bloquear:
        viaje = _bloquear_viaje_para_reserva(db, viaje_id)
    else:
        viaje = db.query(Viaje).filter(
            Viaje.id == viaje_id,
            Viaje.eliminado_en.is_(None),
        ).first()
        if not viaje:
            raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if not viaje_disponible_para_reserva(db, viaje):
        raise HTTPException(
            status_code=400,
            detail="El viaje no está disponible para reservar (sin unidad, sin asientos o cupo completo)",
        )
    return viaje


def pasajero_a_dict(
    db: Session,
    p: ReservaCliente,
    cliente: Cliente,
    punto: PuntoRecogida | None,
) -> dict:
    estado = buscar_estado(db, cliente.estado_id)
    ciudad = buscar_ciudad(db, cliente.ciudad_id)
    punto_dict = punto_recogida_a_dict(punto) if punto else None
    return {
        "id": p.id,
        "reserva_id": p.reserva_id,
        "cliente_id": p.cliente_id,
        "es_titular": p.es_titular,
        "tipo_cliente": cliente.tipo_cliente,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "razon_social": cliente.razon_social,
        "telefono": cliente.telefono,
        "telefono_secundario": cliente.telefono_secundario,
        "direccion": cliente.direccion,
        "estado_id": cliente.estado_id,
        "estado": estado.nombre if estado else None,
        "ciudad_id": cliente.ciudad_id,
        "ciudad": ciudad.nombre if ciudad else None,
        "es_menor": p.es_menor,
        "ocupa_asiento": p.ocupa_asiento,
        "precio_pasajero_eur": float(p.precio_pasajero_eur),
        "recargo_eur": float(p.recargo_eur),
        "notas_tarifa": p.notas_tarifa,
        "punto_recogida_id": p.punto_recogida_id,
        "punto_recogida_nombre": punto.nombre if punto else None,
        "punto_recogida": punto_dict,
    }


def reserva_a_dict(reserva: Reserva) -> dict:
    resultado = {
        "id": reserva.id,
        "cliente_id": reserva.cliente_id,
        "viaje_id": reserva.viaje_id,
        "fecha_reserva": reserva.fecha_reserva,
        "estado": reserva.estado,
        "creado_en": reserva.creado_en,
        "actualizado_en": reserva.actualizado_en,
    }
    if reserva.eliminado_en is not None:
        resultado["eliminado_en"] = reserva.eliminado_en
    return resultado


def listar_viajes_disponibles(db: Session) -> list[dict]:
    viajes = (
        db.query(Viaje)
        .filter(
            Viaje.eliminado_en.is_(None),
            Viaje.estado.notin_(("finalizado", "cancelado")),
        )
        .order_by(Viaje.fecha_salida.asc())
        .all()
    )
    return [viaje_reserva_a_dict(db, v) for v in viajes]


def validar_punto_recogida(db: Session, cliente_id: int, punto_id: int) -> None:
    validar_punto_recogida_del_cliente(db, cliente_id, punto_id)


def _pasajeros_con_asiento_reserva(db: Session, reserva_id: int) -> list:
    return (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None),
            ReservaCliente.ocupa_asiento.is_(True),
        )
        .order_by(ReservaCliente.es_titular.desc(), ReservaCliente.creado_en)
        .all()
    )


def _preparar_asiento_reserva(
    db: Session,
    reserva: Reserva,
    pasajero_id: int,
    asiento_id: int,
) -> AsientoReservado:
    obtener_pasajero_activo(db, reserva.id, pasajero_id)

    asiento = (
        db.query(Asiento)
        .filter(Asiento.id == asiento_id, Asiento.eliminado_en.is_(None))
        .with_for_update()
        .first()
    )
    if not asiento:
        raise HTTPException(status_code=404, detail="El asiento seleccionado no existe o está eliminado")

    ocupado = (
        db.query(AsientoReservado)
        .filter(
            AsientoReservado.asiento_id == asiento_id,
            AsientoReservado.viaje_id == reserva.viaje_id,
            AsientoReservado.eliminado_en.is_(None),
        )
        .with_for_update()
        .first()
    )
    if ocupado:
        raise HTTPException(
            status_code=409,
            detail="Este asiento ya está reservado para este viaje",
        )

    ahora = datetime.now()
    nuevo_asiento = AsientoReservado(
        reserva_cliente_id=pasajero_id,
        viaje_id=reserva.viaje_id,
        asiento_id=asiento_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_asiento)
    return nuevo_asiento


def _asignar_asientos_a_reserva(
    db: Session,
    reserva: Reserva,
    asientos_ids: list[int],
) -> None:
    pasajeros = _pasajeros_con_asiento_reserva(db, reserva.id)
    if not pasajeros:
        raise HTTPException(status_code=400, detail="No hay pasajeros con asiento en esta reserva")
    if len(asientos_ids) != len(pasajeros):
        raise HTTPException(
            status_code=400,
            detail=f"Debe seleccionar {len(pasajeros)} asiento(s)",
        )

    for pasajero, asiento_id in zip(pasajeros, asientos_ids):
        existente = db.query(AsientoReservado).filter(
            AsientoReservado.reserva_cliente_id == pasajero.id,
            AsientoReservado.eliminado_en.is_(None),
        ).first()
        if existente:
            if existente.asiento_id == asiento_id:
                continue
            raise HTTPException(
                status_code=400,
                detail="Los asientos ya fueron asignados para esta reserva",
            )
        _preparar_asiento_reserva(db, reserva, pasajero.id, asiento_id)


def crear_reserva_desde_landing(
    db: Session,
    viaje_id: int,
    cliente_id: int,
    usuario_id: int,
    titular_punto_recogida_id: Optional[int],
    pasajeros_extra: list,
    asientos_ids: Optional[list[int]] = None,
    titular_puntos_recogida: Optional[list] = None,
) -> Reserva:
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")

    viaje = validar_viaje_para_reserva(db, viaje_id, bloquear=True)

    reserva_existente = obtener_reserva_activa_cliente_en_viaje(db, cliente_id, viaje_id)
    if reserva_existente is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ya tienes una reserva activa para este viaje (RES-{reserva_existente.id}). "
                "Agrega acompañantes en esa reserva o contacta a la agencia."
            ),
        )

    asientos_necesarios = 1
    for extra in pasajeros_extra:
        es_menor_extra = getattr(extra, "es_menor", False)
        ocupa_extra = getattr(extra, "ocupa_asiento", None)
        if ocupa_extra is None:
            ocupa_extra = not es_menor_extra
        if ocupa_extra:
            asientos_necesarios += 1
    _exigir_cupo_disponible(db, viaje, asientos_necesarios)

    destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
    recargo_menor = float(destino.recargo_menor_eur) if destino and destino.recargo_menor_eur else 0.0

    if titular_puntos_recogida:
        asignar_puntos_a_cliente(
            db,
            cliente_id,
            puntos_nuevos=titular_puntos_recogida,
            creado_por_usuario_id=usuario_id,
        )

    if titular_punto_recogida_id is None:
        titular_punto_recogida_id = obtener_punto_predeterminado_cliente(db, cliente_id)

    if titular_punto_recogida_id is None:
        raise HTTPException(
            status_code=400,
            detail="Indica la dirección de recogida para crear la reserva",
        )

    validar_punto_recogida(db, cliente_id, titular_punto_recogida_id)

    ahora = datetime.now()
    nueva_reserva = Reserva(
        cliente_id=cliente_id,
        viaje_id=viaje_id,
        fecha_reserva=ahora,
        estado="pendiente",
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nueva_reserva)
    db.flush()

    db.add(ReservaCliente(
        reserva_id=nueva_reserva.id,
        cliente_id=cliente_id,
        es_titular=True,
        es_menor=False,
        ocupa_asiento=True,
        precio_pasajero_eur=0,
        recargo_eur=0,
        punto_recogida_id=titular_punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora,
    ))

    for p in pasajeros_extra:
        acomp = registrar_cliente_para_reserva(db, p, creado_por_usuario_id=usuario_id)

        if acomp.id == cliente_id:
            raise HTTPException(
                status_code=400,
                detail="El titular de la reserva no puede agregarse como acompañante",
            )

        ya_existe = db.query(ReservaCliente).filter(
            ReservaCliente.reserva_id == nueva_reserva.id,
            ReservaCliente.cliente_id == acomp.id,
            ReservaCliente.eliminado_en.is_(None),
        ).first()
        if ya_existe:
            continue

        es_menor = getattr(p, "es_menor", False)
        ocupa_asiento = getattr(p, "ocupa_asiento", None)
        if ocupa_asiento is None:
            ocupa_asiento = not es_menor

        punto_id = getattr(p, "punto_recogida_id", None)
        if punto_id is None:
            punto_id = obtener_punto_predeterminado_cliente(db, acomp.id)
        if punto_id is None:
            raise HTTPException(
                status_code=400,
                detail=f"El viajero {acomp.nombre} debe tener un domicilio de recogida registrado",
            )
        if (
            punto_id == titular_punto_recogida_id
            or punto_pertenece_a_cliente(db, cliente_id, punto_id)
        ):
            validar_punto_recogida(db, cliente_id, punto_id)
        else:
            validar_punto_recogida(db, acomp.id, punto_id)

        db.add(ReservaCliente(
            reserva_id=nueva_reserva.id,
            cliente_id=acomp.id,
            es_titular=False,
            es_menor=es_menor,
            ocupa_asiento=ocupa_asiento,
            precio_pasajero_eur=0,
            recargo_eur=recargo_menor if es_menor else 0,
            punto_recogida_id=punto_id,
            creado_en=ahora,
            actualizado_en=ahora,
        ))

    if asientos_ids:
        db.flush()
        _asignar_asientos_a_reserva(db, nueva_reserva, asientos_ids)

    _confirmar_transaccion(db)
    db.refresh(nueva_reserva)
    return nueva_reserva


def listar_reservas(
    db: Session,
    viaje_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    estado: Optional[str] = None,
    filtro: Optional[str] = None,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    filtro_efectivo = filtro or estado or "todos"

    if filtro_efectivo == "anulado":
        consulta = db.query(Reserva).filter(Reserva.eliminado_en.isnot(None))
    else:
        consulta = db.query(Reserva).filter(Reserva.eliminado_en.is_(None))
        if filtro_efectivo not in ("todos", None):
            consulta = consulta.filter(Reserva.estado == filtro_efectivo)
    if viaje_id:
        consulta = consulta.filter(Reserva.viaje_id == viaje_id)
    if cliente_id:
        consulta = consulta.filter(Reserva.cliente_id == cliente_id)
    if estado and filtro_efectivo == "todos":
        consulta = consulta.filter(Reserva.estado == estado)

    total = consulta.count()
    orden = (
        Reserva.eliminado_en.desc()
        if filtro_efectivo == "anulado"
        else Reserva.creado_en.desc()
    )
    reservas = (
        consulta.order_by(orden)
        .offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )
    items = [reserva_a_dict(r) for r in reservas]
    return respuesta_paginada(items, total, pagina, limite)


def _numeros_asientos_reserva(db: Session, reserva_id: int) -> list:
    filas = (
        db.query(Asiento.numero)
        .join(AsientoReservado, AsientoReservado.asiento_id == Asiento.id)
        .join(ReservaCliente, ReservaCliente.id == AsientoReservado.reserva_cliente_id)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None),
            AsientoReservado.eliminado_en.is_(None),
            Asiento.eliminado_en.is_(None),
        )
        .all()
    )

    def clave_orden(numero: str) -> tuple:
        try:
            return (0, int(numero))
        except (TypeError, ValueError):
            return (1, str(numero))

    numeros = [str(numero) for (numero,) in filas if numero is not None and str(numero).strip()]
    return sorted(set(numeros), key=clave_orden)


def _ubicacion_titular_reserva(db: Session, reserva_id: int) -> str | None:
    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None),
        )
        .order_by(ReservaCliente.es_titular.desc(), ReservaCliente.creado_en)
        .all()
    )
    if not pasajeros:
        return None

    titular = next((p for p in pasajeros if p.es_titular), pasajeros[0])
    if titular.punto_recogida_id:
        punto = db.query(PuntoRecogida).filter(PuntoRecogida.id == titular.punto_recogida_id).first()
        if punto and punto.nombre:
            return punto.nombre

    cliente = db.query(Cliente).filter(Cliente.id == titular.cliente_id).first()
    if cliente is None:
        return None

    ciudad = buscar_ciudad(db, cliente.ciudad_id)
    estado = buscar_estado(db, cliente.estado_id)
    partes = [p for p in (ciudad.nombre if ciudad else None, estado.nombre if estado else None) if p]
    return ", ".join(partes) if partes else None


def _reserva_a_item_portal(db: Session, reserva: Reserva) -> dict:
    from modelos.pago_modelo import calcular_resumen_pagos_reserva, listar_pagos_reserva_portal
    from modelos.viaje_modelo import Viaje

    item = reserva_a_dict(reserva)
    item["fecha_reserva"] = (
        reserva.fecha_reserva.isoformat() if reserva.fecha_reserva else None
    )
    item["creado_en"] = reserva.creado_en.isoformat() if reserva.creado_en else None

    viaje = db.query(Viaje).filter(Viaje.id == reserva.viaje_id).first()
    destino_nombre = None
    destino_imagen = None
    fecha_salida = None
    hora_salida = None

    if viaje:
        destino = db.query(Destino).filter(Destino.id == viaje.destino_id).first()
        if destino:
            destino_nombre = destino.nombre
            portada, _ = imagenes_destino(db, destino.id)
            destino_imagen = portada or None

        if viaje.fecha_salida:
            fecha_salida = viaje.fecha_salida.isoformat()
            hora_salida = viaje.fecha_salida.strftime("%H:%M")

        item["viaje"] = {
            "id": viaje.id,
            "fecha_salida": fecha_salida,
            "destino_nombre": destino_nombre,
        }

    item["viaje_id"] = reserva.viaje_id
    item["destino_nombre"] = destino_nombre
    item["destino_imagen"] = destino_imagen
    item["ubicacion"] = _ubicacion_titular_reserva(db, reserva.id)
    item["fecha_salida"] = fecha_salida
    item["hora_salida"] = hora_salida
    item["asientos"] = _numeros_asientos_reserva(db, reserva.id)

    try:
        item["resumen_pagos"] = calcular_resumen_pagos_reserva(db, reserva)
    except ValueError:
        item["resumen_pagos"] = None

    item["pagos"] = listar_pagos_reserva_portal(db, reserva.id, pagina=1, limite=100)["items"]
    return item


def obtener_mi_reserva_portal(db: Session, cliente_id: int, reserva_id: int) -> dict:
    from modelos.pago_modelo import obtener_reserva_del_cliente

    reserva = obtener_reserva_del_cliente(db, reserva_id, cliente_id)
    return _reserva_a_item_portal(db, reserva)


def listar_mis_reservas_portal(
    db: Session,
    cliente_id: int,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    from utilidades.paginacion import normalizar_paginacion, paginar_consulta, respuesta_paginada

    pagina, limite = normalizar_paginacion(pagina, limite, limite_max=50)

    consulta = (
        db.query(Reserva)
        .filter(
            Reserva.cliente_id == cliente_id,
            Reserva.eliminado_en.is_(None),
        )
        .order_by(Reserva.creado_en.desc(), Reserva.id.desc())
    )

    reservas, total = paginar_consulta(consulta, pagina, limite)

    resultado = [_reserva_a_item_portal(db, reserva) for reserva in reservas]

    return respuesta_paginada(resultado, total, pagina, limite)


def crear_reserva(
    db: Session,
    cliente_id: int,
    viaje_id: int,
    estado: str,
    usuario_id: int,
) -> Reserva:
    viaje = validar_viaje_para_reserva(db, viaje_id, bloquear=True)

    reserva_existente = obtener_reserva_activa_cliente_en_viaje(db, cliente_id, viaje_id)
    if reserva_existente is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El cliente ya tiene una reserva activa para este viaje "
                f"(RES-{reserva_existente.id}). Agregue acompañantes en esa reserva."
            ),
        )

    _exigir_cupo_disponible(db, viaje, 1)

    ahora = datetime.now()
    nueva_reserva = Reserva(
        cliente_id=cliente_id,
        viaje_id=viaje_id,
        fecha_reserva=ahora,
        estado=estado,
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    return _persistir(db, nueva_reserva)


def actualizar_reserva(db: Session, reserva_id: int, estado: Optional[str]) -> Reserva:
    reserva = obtener_reserva_activa(db, reserva_id)
    if estado:
        reserva.estado = estado
    reserva.actualizado_en = datetime.now()
    _confirmar_transaccion(db)
    db.refresh(reserva)
    return reserva


def eliminar_reserva(db: Session, reserva_id: int) -> None:
    reserva = obtener_reserva_activa(db, reserva_id)
    ahora = datetime.now()
    reserva.eliminado_en = ahora
    reserva.actualizado_en = ahora
    _confirmar_transaccion(db)


def listar_pasajeros_reserva(db: Session, reserva_id: int) -> list[dict]:
    obtener_reserva_activa(db, reserva_id)

    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva_id,
            ReservaCliente.eliminado_en.is_(None),
        )
        .order_by(ReservaCliente.es_titular.desc(), ReservaCliente.creado_en)
        .all()
    )

    cliente_ids = [p.cliente_id for p in pasajeros]
    clientes = {
        c.id: c
        for c in db.query(Cliente).filter(Cliente.id.in_(cliente_ids)).all()
    }

    punto_ids = {p.punto_recogida_id for p in pasajeros if p.punto_recogida_id}
    puntos = {}
    if punto_ids:
        for pr in db.query(PuntoRecogida).filter(PuntoRecogida.id.in_(punto_ids)).all():
            puntos[pr.id] = pr

    resultado = []
    for p in pasajeros:
        cliente = clientes.get(p.cliente_id)
        if not cliente:
            continue
        resultado.append(pasajero_a_dict(db, p, cliente, puntos.get(p.punto_recogida_id)))
    return resultado


def agregar_pasajero(
    db: Session,
    reserva_id: int,
    cliente_id: int,
    es_menor: bool,
    ocupa_asiento: bool,
    precio_pasajero_eur: Decimal,
    recargo_eur: Decimal,
    notas_tarifa: Optional[str],
    punto_recogida_id: Optional[int],
) -> ReservaCliente:
    reserva = obtener_reserva_activa(db, reserva_id)
    viaje = _bloquear_viaje_para_reserva(db, reserva.viaje_id)

    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.eliminado_en.is_(None),
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado. Debe estar registrado en el sistema.")

    duplicado = db.query(ReservaCliente).filter(
        ReservaCliente.reserva_id == reserva_id,
        ReservaCliente.cliente_id == cliente_id,
        ReservaCliente.eliminado_en.is_(None),
    ).first()
    if duplicado:
        raise HTTPException(status_code=400, detail="Este cliente ya está registrado en esta reserva")

    if ocupa_asiento:
        _exigir_cupo_disponible(db, viaje, 1)

    if punto_recogida_id is None:
        punto_recogida_id = obtener_punto_predeterminado_cliente(db, cliente_id)
    if punto_recogida_id is None:
        raise HTTPException(
            status_code=400,
            detail="El viajero debe tener un domicilio de recogida registrado",
        )
    validar_punto_recogida(db, cliente_id, punto_recogida_id)

    es_el_titular = cliente_id == reserva.cliente_id
    ahora = datetime.now()
    nuevo_pasajero = ReservaCliente(
        reserva_id=reserva_id,
        cliente_id=cliente_id,
        es_titular=es_el_titular,
        es_menor=es_menor,
        ocupa_asiento=ocupa_asiento,
        precio_pasajero_eur=precio_pasajero_eur,
        recargo_eur=recargo_eur,
        notas_tarifa=notas_tarifa,
        punto_recogida_id=punto_recogida_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    return _persistir(db, nuevo_pasajero)


def actualizar_pasajero(
    db: Session,
    reserva_id: int,
    pasajero_id: int,
    es_menor: Optional[bool],
    ocupa_asiento: Optional[bool],
    precio_pasajero_eur: Optional[Decimal],
    recargo_eur: Optional[Decimal],
    notas_tarifa: Optional[str],
    punto_recogida_id: Optional[int],
    actualizar_punto: bool,
) -> ReservaCliente:
    pasajero = obtener_pasajero_activo(db, reserva_id, pasajero_id)
    reserva = obtener_reserva_activa(db, reserva_id)

    if es_menor is not None:
        pasajero.es_menor = es_menor
    if ocupa_asiento is not None:
        pasajero.ocupa_asiento = ocupa_asiento
    if precio_pasajero_eur is not None:
        pasajero.precio_pasajero_eur = precio_pasajero_eur
    if recargo_eur is not None:
        pasajero.recargo_eur = recargo_eur
    if notas_tarifa is not None:
        pasajero.notas_tarifa = notas_tarifa
    if actualizar_punto:
        if punto_recogida_id is not None:
            validar_punto_recogida(db, pasajero.cliente_id, punto_recogida_id)
        pasajero.punto_recogida_id = punto_recogida_id

    pasajero.actualizado_en = datetime.now()
    _confirmar_transaccion(db)
    return pasajero


def eliminar_pasajero(db: Session, reserva_id: int, pasajero_id: int) -> None:
    pasajero = obtener_pasajero_activo(db, reserva_id, pasajero_id)
    ahora = datetime.now()
    db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).update({"eliminado_en": ahora, "actualizado_en": ahora}, synchronize_session=False)
    pasajero.eliminado_en = ahora
    pasajero.actualizado_en = ahora
    _confirmar_transaccion(db)


def listar_asientos_pasajero(db: Session, reserva_id: int, pasajero_id: int) -> list[dict]:
    obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asientos = db.query(AsientoReservado).filter(
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).all()
    return [{"id": a.id, "asiento_id": a.asiento_id, "viaje_id": a.viaje_id} for a in asientos]


def asignar_asientos_reserva_portal(
    db: Session,
    reserva_id: int,
    cliente_id: int,
    asientos_ids: list[int],
) -> dict:
    from modelos.pago_modelo import obtener_reserva_del_cliente

    obtener_reserva_del_cliente(db, reserva_id, cliente_id)

    reserva = obtener_reserva_activa(db, reserva_id)
    _asignar_asientos_a_reserva(db, reserva, asientos_ids)
    _confirmar_transaccion(db)

    return {
        "mensaje": "Asientos asignados",
        "asientos": _numeros_asientos_reserva(db, reserva_id),
    }


def asignar_asiento_pasajero(
    db: Session, reserva_id: int, pasajero_id: int, asiento_id: int,
) -> AsientoReservado:
    reserva = obtener_reserva_activa(db, reserva_id)
    nuevo_asiento = _preparar_asiento_reserva(db, reserva, pasajero_id, asiento_id)
    _confirmar_transaccion(db)
    db.refresh(nuevo_asiento)
    return nuevo_asiento


def quitar_asiento_pasajero(
    db: Session, reserva_id: int, pasajero_id: int, asiento_reservado_id: int,
) -> None:
    obtener_pasajero_activo(db, reserva_id, pasajero_id)
    asignacion = db.query(AsientoReservado).filter(
        AsientoReservado.id == asiento_reservado_id,
        AsientoReservado.reserva_cliente_id == pasajero_id,
        AsientoReservado.eliminado_en.is_(None),
    ).first()
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación de asiento no encontrada")

    ahora = datetime.now()
    asignacion.eliminado_en = ahora
    asignacion.actualizado_en = ahora
    _confirmar_transaccion(db)
