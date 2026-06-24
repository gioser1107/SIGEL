from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import base64
import re

from fastapi import HTTPException
from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Session

from database import Base
from modelos.banco_modelo import Banco
from modelos.destino_modelo import Destino
from modelos.destino_imagen_modelo import PREFIJO_ARCHIVOS, procesar_y_guardar_bytes_comprobante
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.punto_venta_modelo import PuntoVenta
from modelos.reserva_cliente_modelo import ReservaCliente
from modelos.reservas_modelo import Reserva
from modelos.tasa_modelo import Tasa
from modelos.viaje_modelo import Viaje
from utilidades.paginacion import offset_pagina, paginar_consulta, respuesta_paginada

METODOS_PAGO_REQUIEREN_VALIDACION = ("pago_movil", "transferencia", "zelle")
MAX_COMPROBANTE_URL = 500
ETIQUETAS_ESTADO_PAGO = {
    "en_validacion": "Pendiente de validacion",
    "aprobado": "Aprobado",
    "rechazado": "Rechazado",
}


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(BigInteger, primary_key=True, index=True)
    reserva_id = Column(BigInteger, ForeignKey("reservas.id"), nullable=False, index=True)
    metodo_pago_id = Column(BigInteger, ForeignKey("metodos_pago.id"), nullable=False, index=True)
    tasa_id = Column(BigInteger, ForeignKey("tasas.id"), nullable=False, index=True)
    monto = Column(Numeric(14, 2), nullable=False)
    tipo = Column(String(20), nullable=False, default="cuota")
    estado = Column(String(20), nullable=False, default="en_validacion")
    fecha_pago = Column(Date, nullable=True)
    referencia = Column(String(120), nullable=True)
    banco_origen_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=True)
    banco_destino_id = Column(BigInteger, ForeignKey("bancos.id"), nullable=True)
    punto_venta_id = Column(BigInteger, ForeignKey("puntos_venta.id"), nullable=True)
    telefono_origen = Column(String(30), nullable=True)
    correo_origen = Column(String(160), nullable=True)
    comprobante_url = Column(String(500), nullable=True)
    validado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    validado_en = Column(DateTime, nullable=True)
    notas = Column(String(255), nullable=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def normalizar_comprobante_url(comprobante_url: Optional[str]) -> Optional[str]:
    if comprobante_url is None:
        return None

    limpio = comprobante_url.strip()
    if not limpio:
        return None

    if limpio.startswith("data:image"):
        coincidencia = re.match(r"^data:image/[\w+.-]+;base64,(.+)$", limpio, re.DOTALL)
        if not coincidencia:
            raise HTTPException(status_code=400, detail="Formato de comprobante base64 invalido")
        try:
            contenido = base64.b64decode(coincidencia.group(1), validate=True)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Comprobante base64 invalido") from exc
        return procesar_y_guardar_bytes_comprobante(contenido)

    if len(limpio) > MAX_COMPROBANTE_URL:
        raise HTTPException(
            status_code=400,
            detail=(
                "comprobante_url demasiado largo. Sube la imagen con "
                "POST /api/pagos/portal/comprobante/upload y envia la URL corta"
            ),
        )

    if limpio.startswith(PREFIJO_ARCHIVOS) or limpio.startswith("http://") or limpio.startswith("https://"):
        return limpio

    raise HTTPException(
        status_code=400,
        detail="comprobante_url debe ser una URL http(s) o ruta /api/archivos/...",
    )


def obtener_pago_activo(db: Session, reserva_id: int, pago_id: int) -> Pago:
    pago = db.query(Pago).filter(
        Pago.id == pago_id,
        Pago.reserva_id == reserva_id,
        Pago.eliminado_en.is_(None),
    ).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado en esta reserva")
    return pago


def obtener_reserva_del_cliente(db: Session, reserva_id: int, cliente_id: int) -> Reserva:
    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.eliminado_en.is_(None),
    ).first()
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.cliente_id != cliente_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta reserva")
    return reserva


def calcular_monto_en_moneda_desde_eur(
    db: Session,
    monto_eur: float,
    metodo_pago_id: int,
    tasa_id: int,
) -> dict:
    if monto_eur <= 0:
        raise HTTPException(status_code=400, detail="El monto en EUR debe ser mayor a cero")

    metodo = validar_metodo_pago(db, metodo_pago_id)
    tasa = validar_tasa(db, tasa_id)
    moneda = buscar_moneda_por_id(db, metodo.moneda_id)
    moneda_tasa = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda or not moneda_tasa:
        raise HTTPException(status_code=400, detail="Moneda del metodo o tasa no encontrada")

    valor_tasa = float(tasa.valor)
    if valor_tasa <= 0:
        raise HTTPException(status_code=400, detail="La tasa indicada no es valida")

    if moneda.codigo == "EUR":
        monto_moneda = monto_eur
    elif moneda.codigo == "VES" and moneda_tasa.codigo == "EUR":
        monto_moneda = round(monto_eur * valor_tasa, 2)
    elif moneda.codigo == "USD":
        tasa_eur_info = obtener_tasa_eur_reciente(db)
        if not tasa_eur_info:
            raise HTTPException(status_code=400, detail="No hay tasa EUR disponible para conversion")
        valor_eur = float(tasa_eur_info[0].valor)
        monto_moneda = round((monto_eur * valor_eur) / valor_tasa, 2) if valor_tasa > 0 else 0
    else:
        monto_moneda = round(monto_eur * valor_tasa, 2)

    return {
        "monto_eur": _redondear_eur(monto_eur),
        "monto": monto_moneda,
        "moneda": moneda_a_dict(moneda),
        "tasa": tasa_a_dict(tasa, moneda_tasa),
        "metodo_pago": metodo_pago_a_dict(metodo, moneda),
    }


def obtener_resumen_pago_portal(db: Session, reserva: Reserva) -> dict:
    resumen = calcular_resumen_pagos_reserva(db, reserva)
    tasa_dia = obtener_tasa_eur_del_dia(db)
    catalogo = obtener_catalogo_pagos(db)

    cotizaciones = []
    saldo_eur = resumen["saldo_pendiente_eur"]
    if tasa_dia and saldo_eur > 0:
        for metodo in catalogo["metodos_pago"]:
            if metodo["moneda"]["codigo"] == "VES":
                try:
                    cotizaciones.append(
                        calcular_monto_en_moneda_desde_eur(
                            db,
                            saldo_eur,
                            metodo["id"],
                            tasa_dia["tasa"]["id"],
                        )
                    )
                except HTTPException:
                    continue

    return {
        "resumen": resumen,
        "tasa_eur": tasa_dia,
        "metodos_pago": catalogo["metodos_pago"],
        "bancos": catalogo["bancos"],
        "puntos_venta": catalogo["puntos_venta"],
        "cotizacion_saldo_pendiente": cotizaciones,
    }


def determinar_estado_inicial_pago(codigo_metodo: str, registro_desde_admin: bool) -> str:
    if registro_desde_admin:
        return "aprobado"
    if codigo_metodo in METODOS_PAGO_REQUIEREN_VALIDACION:
        return "en_validacion"
    return "aprobado"


def moneda_a_dict(moneda: Moneda) -> dict:
    return {
        "id": moneda.id,
        "codigo": moneda.codigo,
        "nombre": moneda.nombre,
        "simbolo": moneda.simbolo,
    }


def metodo_pago_a_dict(metodo: MetodoPago, moneda: Moneda) -> dict:
    return {
        "id": metodo.id,
        "codigo": metodo.codigo,
        "nombre": metodo.nombre,
        "moneda": moneda_a_dict(moneda),
    }


def banco_a_dict(banco: Banco) -> dict:
    return {
        "id": banco.id,
        "codigo": banco.codigo,
        "nombre": banco.nombre,
    }


def punto_venta_a_dict(punto: PuntoVenta) -> dict:
    return {
        "id": punto.id,
        "banco_id": punto.banco_id,
        "codigo": punto.codigo,
        "nombre": punto.nombre,
        "numero_terminal": punto.numero_terminal,
    }


def tasa_a_dict(tasa: Tasa, moneda: Moneda) -> dict:
    return {
        "id": tasa.id,
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "moneda": moneda_a_dict(moneda),
    }


def pago_a_dict(
    pago: Pago,
    metodo: MetodoPago,
    moneda: Moneda,
    tasa: Tasa,
    moneda_tasa: Moneda,
    banco_origen: Banco | None = None,
    banco_destino: Banco | None = None,
    punto_venta: PuntoVenta | None = None,
) -> dict:
    return {
        "id": pago.id,
        "reserva_id": pago.reserva_id,
        "metodo_pago": metodo_pago_a_dict(metodo, moneda),
        "tasa": tasa_a_dict(tasa, moneda_tasa),
        "monto": float(pago.monto),
        "tipo": pago.tipo,
        "estado": pago.estado,
        "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
        "referencia": pago.referencia,
        "banco_origen": banco_a_dict(banco_origen) if banco_origen else None,
        "banco_destino": banco_a_dict(banco_destino) if banco_destino else None,
        "punto_venta": punto_venta_a_dict(punto_venta) if punto_venta else None,
        "telefono_origen": pago.telefono_origen,
        "correo_origen": pago.correo_origen,
        "comprobante_url": pago.comprobante_url,
        "tiene_comprobante": bool(pago.comprobante_url),
        "validado_por": pago.validado_por,
        "validado_en": pago.validado_en.isoformat() if pago.validado_en else None,
        "notas": pago.notas,
        "creado_por": pago.creado_por,
        "creado_en": pago.creado_en.isoformat() if pago.creado_en else None,
        "actualizado_en": pago.actualizado_en.isoformat() if pago.actualizado_en else None,
    }


def cargar_datos_pago_portal(db: Session, pago: Pago) -> dict:
    detalle = cargar_datos_pago(db, pago)
    monto_eur, conversion_aproximada = convertir_monto_pago_a_eur(db, pago)
    detalle["monto_eur"] = monto_eur
    detalle["conversion_aproximada"] = conversion_aproximada
    detalle["estado_etiqueta"] = ETIQUETAS_ESTADO_PAGO.get(pago.estado, pago.estado)
    return detalle


def buscar_moneda_por_id(db: Session, moneda_id: int) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.id == moneda_id).first()


def buscar_moneda_por_codigo(db: Session, codigo: str) -> Moneda | None:
    return db.query(Moneda).filter(Moneda.codigo == codigo).first()


def obtener_tasa_eur_reciente(db: Session) -> tuple[Tasa, Moneda] | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    tasa = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id)
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .first()
    )
    if not tasa:
        return None

    return tasa, moneda_eur


def obtener_tasa_eur_del_dia(db: Session) -> dict | None:
    moneda_eur = buscar_moneda_por_codigo(db, "EUR")
    if not moneda_eur:
        return None

    hoy = date.today()
    tasa_hoy = (
        db.query(Tasa)
        .filter(Tasa.moneda_id == moneda_eur.id, Tasa.fecha == hoy)
        .order_by(Tasa.id.desc())
        .first()
    )

    if tasa_hoy:
        return {
            "tasa": tasa_a_dict(tasa_hoy, moneda_eur),
            "fecha": hoy.isoformat(),
            "valor": float(tasa_hoy.valor),
            "es_del_dia": True,
        }

    tasa_reciente = obtener_tasa_eur_reciente(db)
    if not tasa_reciente:
        return None

    tasa, moneda = tasa_reciente
    return {
        "tasa": tasa_a_dict(tasa, moneda),
        "fecha": tasa.fecha.isoformat() if tasa.fecha else None,
        "valor": float(tasa.valor),
        "es_del_dia": False,
    }


def cargar_datos_pago(
    db: Session,
    pago: Pago,
) -> dict:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == pago.metodo_pago_id).first()
    if not metodo:
        raise ValueError("Metodo de pago no encontrado")

    moneda = buscar_moneda_por_id(db, metodo.moneda_id)
    if not moneda:
        raise ValueError("Moneda del metodo de pago no encontrada")

    tasa = db.query(Tasa).filter(Tasa.id == pago.tasa_id).first()
    if not tasa:
        raise ValueError("Tasa no encontrada")

    moneda_tasa = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda_tasa:
        raise ValueError("Moneda de la tasa no encontrada")

    banco_origen = None
    if pago.banco_origen_id:
        banco_origen = db.query(Banco).filter(Banco.id == pago.banco_origen_id).first()

    banco_destino = None
    if pago.banco_destino_id:
        banco_destino = db.query(Banco).filter(Banco.id == pago.banco_destino_id).first()

    punto_venta = None
    if pago.punto_venta_id:
        punto_venta = db.query(PuntoVenta).filter(PuntoVenta.id == pago.punto_venta_id).first()

    return pago_a_dict(
        pago,
        metodo,
        moneda,
        tasa,
        moneda_tasa,
        banco_origen,
        banco_destino,
        punto_venta,
    )


def _redondear_eur(valor: float) -> float:
    return round(valor, 2)


def calcular_total_reserva_eur(db: Session, reserva: Reserva) -> dict:
    viaje = (
        db.query(Viaje)
        .filter(Viaje.id == reserva.viaje_id, Viaje.eliminado_en.is_(None))
        .first()
    )
    if not viaje:
        raise ValueError("Viaje de la reserva no encontrado")

    destino = (
        db.query(Destino)
        .filter(Destino.id == viaje.destino_id, Destino.eliminado_en.is_(None))
        .first()
    )
    if not destino:
        raise ValueError("Destino del viaje no encontrado")

    pasajeros = (
        db.query(ReservaCliente)
        .filter(
            ReservaCliente.reserva_id == reserva.id,
            ReservaCliente.eliminado_en.is_(None),
        )
        .all()
    )

    cantidad_pasajeros = len(pasajeros)
    precio_unitario_eur = float(destino.precio_base_eur or 0)
    recargos_eur = sum(float(p.recargo_eur or 0) for p in pasajeros)

    total_reserva_eur = 0.0
    pasajeros_con_tarifa_custom = 0

    for pasajero in pasajeros:
        precio_linea = float(pasajero.precio_pasajero_eur or 0)
        if precio_linea > 0:
            pasajeros_con_tarifa_custom += 1
        else:
            precio_linea = precio_unitario_eur
        total_reserva_eur += precio_linea + float(pasajero.recargo_eur or 0)

    if cantidad_pasajeros == 0:
        origen_total = "destino"
    elif pasajeros_con_tarifa_custom == cantidad_pasajeros:
        origen_total = "pasajeros"
    elif pasajeros_con_tarifa_custom > 0:
        origen_total = "mixto"
    else:
        origen_total = "destino"

    return {
        "viaje_id": viaje.id,
        "destino_id": destino.id,
        "destino_nombre": destino.nombre,
        "precio_unitario_eur": _redondear_eur(precio_unitario_eur),
        "cantidad_pasajeros": cantidad_pasajeros,
        "recargos_eur": _redondear_eur(recargos_eur),
        "total_reserva_eur": _redondear_eur(total_reserva_eur),
        "origen_total": origen_total,
    }


def convertir_monto_pago_a_eur(db: Session, pago: Pago) -> tuple[float, bool]:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == pago.metodo_pago_id).first()
    if not metodo:
        return 0.0, False

    moneda = buscar_moneda_por_id(db, metodo.moneda_id)
    if not moneda:
        return 0.0, False

    tasa = db.query(Tasa).filter(Tasa.id == pago.tasa_id).first()
    if not tasa:
        return 0.0, False

    moneda_tasa = buscar_moneda_por_id(db, tasa.moneda_id)
    if not moneda_tasa:
        return 0.0, False

    monto = float(pago.monto)

    if moneda.codigo == "EUR":
        return _redondear_eur(monto), False

    if moneda.codigo == "VES" and moneda_tasa.codigo == "EUR":
        valor_eur = float(tasa.valor)
        if valor_eur <= 0:
            return 0.0, False
        return _redondear_eur(monto / valor_eur), False

    if moneda.codigo == "USD":
        moneda_usd = buscar_moneda_por_codigo(db, "USD")
        tasa_usd = None
        if moneda_usd:
            tasa_usd = (
                db.query(Tasa)
                .filter(Tasa.moneda_id == moneda_usd.id)
                .order_by(Tasa.fecha.desc(), Tasa.id.desc())
                .first()
            )

        tasa_eur = tasa if moneda_tasa.codigo == "EUR" else None
        if not tasa_eur:
            tasa_eur_resultado = obtener_tasa_eur_reciente(db)
            tasa_eur = tasa_eur_resultado[0] if tasa_eur_resultado else None

        if tasa_usd and tasa_eur:
            valor_usd = float(tasa_usd.valor)
            valor_eur = float(tasa_eur.valor)
            if valor_usd > 0 and valor_eur > 0:
                return _redondear_eur((monto * valor_usd) / valor_eur), False

        return _redondear_eur(monto), True

    return _redondear_eur(monto), True


def calcular_resumen_pagos_reserva(db: Session, reserva: Reserva) -> dict:
    info_reserva = calcular_total_reserva_eur(db, reserva)

    pagos = (
        db.query(Pago)
        .filter(Pago.reserva_id == reserva.id, Pago.eliminado_en.is_(None))
        .order_by(Pago.creado_en.asc())
        .all()
    )

    total_aprobado_eur = 0.0
    total_en_validacion_eur = 0.0
    total_rechazado_eur = 0.0
    cantidad_aprobados = 0
    cantidad_en_validacion = 0
    cantidad_rechazados = 0

    for pago in pagos:
        monto_eur, _ = convertir_monto_pago_a_eur(db, pago)
        if pago.estado == "aprobado":
            total_aprobado_eur += monto_eur
            cantidad_aprobados += 1
        elif pago.estado == "en_validacion":
            total_en_validacion_eur += monto_eur
            cantidad_en_validacion += 1
        elif pago.estado == "rechazado":
            total_rechazado_eur += monto_eur
            cantidad_rechazados += 1

    total_reserva_eur = info_reserva["total_reserva_eur"]
    saldo_pendiente_eur = _redondear_eur(max(total_reserva_eur - total_aprobado_eur, 0))
    pagado_completo = saldo_pendiente_eur <= 0 and total_reserva_eur > 0

    return {
        "reserva_id": reserva.id,
        "estado_reserva": reserva.estado,
        "destino": {
            "id": info_reserva["destino_id"],
            "nombre": info_reserva["destino_nombre"],
            "precio_unitario_eur": info_reserva["precio_unitario_eur"],
        },
        "cantidad_pasajeros": info_reserva["cantidad_pasajeros"],
        "recargos_eur": info_reserva["recargos_eur"],
        "total_reserva_eur": total_reserva_eur,
        "origen_total": info_reserva["origen_total"],
        "total_pagado_aprobado_eur": _redondear_eur(total_aprobado_eur),
        "total_pendiente_validacion_eur": _redondear_eur(total_en_validacion_eur),
        "total_rechazado_eur": _redondear_eur(total_rechazado_eur),
        "saldo_pendiente_eur": saldo_pendiente_eur,
        "pagado_completo": pagado_completo,
        "cantidad_pagos": len(pagos),
        "cantidad_aprobados": cantidad_aprobados,
        "cantidad_en_validacion": cantidad_en_validacion,
        "cantidad_rechazados": cantidad_rechazados,
    }


def actualizar_estado_reserva_por_pagos(db: Session, reserva: Reserva) -> None:
    if reserva.estado == "cancelada":
        return

    resumen = calcular_resumen_pagos_reserva(db, reserva)

    if resumen["pagado_completo"] and resumen["total_reserva_eur"] > 0:
        reserva.estado = "abonada"
    elif resumen["total_pagado_aprobado_eur"] > 0:
        reserva.estado = "confirmada"
    elif reserva.estado in ("abonada", "confirmada"):
        reserva.estado = "pendiente"


def validar_metodo_pago(db: Session, metodo_pago_id: int) -> MetodoPago:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == metodo_pago_id).first()
    if not metodo:
        raise HTTPException(status_code=400, detail="Metodo de pago invalido")
    return metodo


def validar_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(Tasa.id == tasa_id).first()
    if not tasa:
        raise HTTPException(status_code=400, detail="Tasa invalida")
    return tasa


def validar_banco(db: Session, banco_id: int | None, campo: str) -> None:
    if banco_id is None:
        return
    banco = db.query(Banco).filter(
        Banco.id == banco_id,
        Banco.eliminado_en.is_(None),
        Banco.activo.is_(True),
    ).first()
    if not banco:
        raise HTTPException(status_code=400, detail=f"{campo} invalido")


def validar_punto_venta(db: Session, punto_venta_id: int | None) -> None:
    if punto_venta_id is None:
        return
    punto = db.query(PuntoVenta).filter(
        PuntoVenta.id == punto_venta_id,
        PuntoVenta.eliminado_en.is_(None),
        PuntoVenta.activo.is_(True),
    ).first()
    if not punto:
        raise HTTPException(status_code=400, detail="Punto de venta invalido")


def validar_tipo_pago(tipo: str) -> None:
    if tipo not in ("total", "cuota"):
        raise HTTPException(status_code=400, detail="tipo debe ser total o cuota")


def validar_estado_pago(estado: str) -> None:
    if estado not in ("en_validacion", "aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="estado invalido")


def listar_todos_los_pagos(
    db: Session,
    reserva_id: Optional[int] = None,
    estado: Optional[str] = None,
    metodo_pago_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = db.query(Pago).filter(Pago.eliminado_en.is_(None))

    if reserva_id is not None:
        consulta = consulta.filter(Pago.reserva_id == reserva_id)
    if estado is not None:
        consulta = consulta.filter(Pago.estado == estado)
    if metodo_pago_id is not None:
        consulta = consulta.filter(Pago.metodo_pago_id == metodo_pago_id)
    if fecha_desde is not None:
        consulta = consulta.filter(Pago.fecha_pago >= fecha_desde)
    if fecha_hasta is not None:
        consulta = consulta.filter(Pago.fecha_pago <= fecha_hasta)

    total = consulta.count()
    pagos = (
        consulta.order_by(Pago.creado_en.desc())
        .offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )

    items = []
    for pago in pagos:
        detalle = cargar_datos_pago(db, pago)
        monto_eur, aproximado = convertir_monto_pago_a_eur(db, pago)
        detalle["monto_eur"] = monto_eur
        detalle["conversion_aproximada"] = aproximado
        items.append(detalle)

    return respuesta_paginada(items, total, pagina, limite)


def obtener_catalogo_pagos(db: Session) -> dict:
    metodos = db.query(MetodoPago).order_by(MetodoPago.nombre).all()
    monedas = db.query(Moneda).all()
    monedas_por_id = {m.id: m for m in monedas}

    lista_metodos = []
    for metodo in metodos:
        moneda = monedas_por_id.get(metodo.moneda_id)
        if not moneda:
            continue
        lista_metodos.append(metodo_pago_a_dict(metodo, moneda))

    bancos = (
        db.query(Banco)
        .filter(Banco.eliminado_en.is_(None), Banco.activo.is_(True))
        .order_by(Banco.nombre)
        .all()
    )

    puntos = (
        db.query(PuntoVenta)
        .filter(PuntoVenta.eliminado_en.is_(None), PuntoVenta.activo.is_(True))
        .order_by(PuntoVenta.nombre)
        .all()
    )

    tasas = (
        db.query(Tasa)
        .order_by(Tasa.fecha.desc(), Tasa.id.desc())
        .limit(30)
        .all()
    )

    tasa_eur = obtener_tasa_eur_reciente(db)
    tasa_eur_dict = None
    if tasa_eur:
        tasa_eur_dict = tasa_a_dict(tasa_eur[0], tasa_eur[1])

    lista_tasas = []
    for tasa in tasas:
        moneda = monedas_por_id.get(tasa.moneda_id)
        if not moneda:
            continue
        lista_tasas.append(tasa_a_dict(tasa, moneda))

    return {
        "metodos_pago": lista_metodos,
        "bancos": [banco_a_dict(b) for b in bancos],
        "puntos_venta": [punto_venta_a_dict(p) for p in puntos],
        "tasa_eur_reciente": tasa_eur_dict,
        "tasas": lista_tasas,
    }


def listar_pagos_reserva(
    db: Session,
    reserva_id: int,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = (
        db.query(Pago)
        .filter(Pago.reserva_id == reserva_id, Pago.eliminado_en.is_(None))
        .order_by(Pago.creado_en.desc())
    )
    pagos, total = paginar_consulta(consulta, pagina, limite)
    items = [cargar_datos_pago(db, pago) for pago in pagos]
    return respuesta_paginada(items, total, pagina, limite)


def listar_pagos_reserva_portal(
    db: Session,
    reserva_id: int,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = (
        db.query(Pago)
        .filter(Pago.reserva_id == reserva_id, Pago.eliminado_en.is_(None))
        .order_by(Pago.creado_en.desc())
    )
    pagos, total = paginar_consulta(consulta, pagina, limite)
    items = [cargar_datos_pago_portal(db, pago) for pago in pagos]
    return respuesta_paginada(items, total, pagina, limite)


def obtener_pago_portal_cliente(
    db: Session,
    reserva_id: int,
    pago_id: int,
    cliente_id: int,
) -> dict:
    obtener_reserva_del_cliente(db, reserva_id, cliente_id)
    pago = obtener_pago_activo(db, reserva_id, pago_id)
    return cargar_datos_pago_portal(db, pago)


def listar_pagos_cliente_portal(
    db: Session,
    cliente_id: int,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    consulta = (
        db.query(Pago, Reserva)
        .join(Reserva, Reserva.id == Pago.reserva_id)
        .filter(
            Reserva.cliente_id == cliente_id,
            Reserva.eliminado_en.is_(None),
            Pago.eliminado_en.is_(None),
        )
        .order_by(Pago.creado_en.desc())
    )
    total = consulta.count()
    filas = (
        consulta.offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )

    items = []
    for pago, reserva in filas:
        detalle = cargar_datos_pago_portal(db, pago)
        detalle["reserva"] = {
            "id": reserva.id,
            "estado": reserva.estado,
            "viaje_id": reserva.viaje_id,
        }
        items.append(detalle)
    return respuesta_paginada(items, total, pagina, limite)


def registrar_pago_reserva(
    db: Session,
    reserva: Reserva,
    metodo_pago_id: int,
    tasa_id: int,
    monto: Decimal,
    tipo: str,
    fecha_pago: Optional[date],
    referencia: Optional[str],
    banco_origen_id: Optional[int],
    banco_destino_id: Optional[int],
    punto_venta_id: Optional[int],
    telefono_origen: Optional[str],
    correo_origen: Optional[str],
    comprobante_url: Optional[str],
    notas: Optional[str],
    usuario_id: int,
    registro_desde_admin: bool = True,
) -> Pago:
    metodo = validar_metodo_pago(db, metodo_pago_id)
    validar_tasa(db, tasa_id)
    validar_banco(db, banco_origen_id, "banco_origen_id")
    validar_banco(db, banco_destino_id, "banco_destino_id")
    validar_punto_venta(db, punto_venta_id)
    validar_tipo_pago(tipo)
    comprobante_url = normalizar_comprobante_url(comprobante_url)

    ahora = datetime.now()
    estado_inicial = determinar_estado_inicial_pago(metodo.codigo, registro_desde_admin)
    nuevo_pago = Pago(
        reserva_id=reserva.id,
        metodo_pago_id=metodo_pago_id,
        tasa_id=tasa_id,
        monto=monto,
        tipo=tipo,
        estado=estado_inicial,
        fecha_pago=fecha_pago or date.today(),
        referencia=referencia,
        banco_origen_id=banco_origen_id,
        banco_destino_id=banco_destino_id,
        punto_venta_id=punto_venta_id,
        telefono_origen=telefono_origen,
        correo_origen=correo_origen,
        comprobante_url=comprobante_url,
        notas=notas,
        creado_por=usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    if estado_inicial == "aprobado":
        nuevo_pago.validado_por = usuario_id
        nuevo_pago.validado_en = ahora

    db.add(nuevo_pago)
    db.flush()
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = ahora
    db.commit()
    db.refresh(nuevo_pago)
    return nuevo_pago


def actualizar_pago_reserva(
    db: Session,
    reserva: Reserva,
    pago: Pago,
    metodo_pago_id: Optional[int],
    tasa_id: Optional[int],
    monto: Optional[Decimal],
    tipo: Optional[str],
    estado: Optional[str],
    fecha_pago: Optional[date],
    referencia: Optional[str],
    banco_origen_id: Optional[int],
    banco_destino_id: Optional[int],
    punto_venta_id: Optional[int],
    telefono_origen: Optional[str],
    correo_origen: Optional[str],
    comprobante_url: Optional[str],
    notas: Optional[str],
    usuario_id: int,
) -> Pago:
    if metodo_pago_id is not None:
        validar_metodo_pago(db, metodo_pago_id)
        pago.metodo_pago_id = metodo_pago_id

    if tasa_id is not None:
        validar_tasa(db, tasa_id)
        pago.tasa_id = tasa_id

    if monto is not None:
        pago.monto = monto

    if tipo is not None:
        validar_tipo_pago(tipo)
        pago.tipo = tipo

    if estado is not None:
        validar_estado_pago(estado)
        pago.estado = estado
        if estado in ("aprobado", "rechazado"):
            pago.validado_por = usuario_id
            pago.validado_en = datetime.now()

    if fecha_pago is not None:
        pago.fecha_pago = fecha_pago

    if referencia is not None:
        pago.referencia = referencia

    if banco_origen_id is not None:
        validar_banco(db, banco_origen_id, "banco_origen_id")
        pago.banco_origen_id = banco_origen_id

    if banco_destino_id is not None:
        validar_banco(db, banco_destino_id, "banco_destino_id")
        pago.banco_destino_id = banco_destino_id

    if punto_venta_id is not None:
        validar_punto_venta(db, punto_venta_id)
        pago.punto_venta_id = punto_venta_id

    if telefono_origen is not None:
        pago.telefono_origen = telefono_origen

    if correo_origen is not None:
        pago.correo_origen = correo_origen

    if comprobante_url is not None:
        pago.comprobante_url = normalizar_comprobante_url(comprobante_url)

    if notas is not None:
        pago.notas = notas

    pago.actualizado_en = datetime.now()
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = datetime.now()
    db.commit()
    db.refresh(pago)
    return pago


def eliminar_pago_reserva(db: Session, reserva: Reserva, pago: Pago) -> None:
    ahora = datetime.now()
    pago.eliminado_en = ahora
    pago.actualizado_en = ahora
    actualizar_estado_reserva_por_pagos(db, reserva)
    reserva.actualizado_en = ahora
    db.commit()
