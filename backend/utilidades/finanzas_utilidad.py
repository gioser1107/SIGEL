from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modelos.banco_modelo import Banco
from modelos.metodo_pago_modelo import MetodoPago
from modelos.moneda_modelo import Moneda
from modelos.pago_modelo import Pago
from modelos.punto_venta_modelo import PuntoVenta
from modelos.tasa_modelo import Tasa
from utilidades.pago_utilidad import (
    banco_a_dict,
    metodo_pago_a_dict,
    moneda_a_dict,
    obtener_tasa_eur_del_dia,
    punto_venta_a_dict,
    tasa_a_dict,
)


def obtener_moneda(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    return moneda


def listar_monedas(db: Session) -> list[dict]:
    monedas = db.query(Moneda).order_by(Moneda.nombre).all()
    return [moneda_a_dict(m) for m in monedas]


def crear_moneda(db: Session, codigo: str, nombre: str, simbolo: str) -> Moneda:
    codigo_limpio = codigo.strip().upper()
    existe = db.query(Moneda).filter(Moneda.codigo == codigo_limpio).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una moneda con ese codigo")

    nueva = Moneda(codigo=codigo_limpio, nombre=nombre.strip(), simbolo=simbolo.strip())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def actualizar_moneda(
    db: Session,
    moneda_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    simbolo: Optional[str],
) -> Moneda:
    moneda = obtener_moneda(db, moneda_id)

    if codigo is not None:
        codigo_limpio = codigo.strip().upper()
        repetido = db.query(Moneda).filter(Moneda.codigo == codigo_limpio, Moneda.id != moneda_id).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otra moneda con ese codigo")
        moneda.codigo = codigo_limpio

    if nombre is not None:
        moneda.nombre = nombre.strip()

    if simbolo is not None:
        moneda.simbolo = simbolo.strip()

    db.commit()
    db.refresh(moneda)
    return moneda


def eliminar_moneda(db: Session, moneda_id: int) -> None:
    obtener_moneda(db, moneda_id)

    en_metodo = db.query(MetodoPago).filter(MetodoPago.moneda_id == moneda_id).first()
    if en_metodo:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por un metodo de pago")

    en_tasa = db.query(Tasa).filter(Tasa.moneda_id == moneda_id).first()
    if en_tasa:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la moneda esta en uso por una tasa")

    moneda = obtener_moneda(db, moneda_id)
    db.delete(moneda)
    db.commit()


def validar_moneda_existente(db: Session, moneda_id: int) -> Moneda:
    moneda = db.query(Moneda).filter(Moneda.id == moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=400, detail="Moneda invalida")
    return moneda


def obtener_metodo_pago(db: Session, metodo_id: int) -> MetodoPago:
    metodo = db.query(MetodoPago).filter(MetodoPago.id == metodo_id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Metodo de pago no encontrado")
    return metodo


def metodo_pago_a_respuesta(db: Session, metodo: MetodoPago) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == metodo.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda del metodo no encontrada")
    return metodo_pago_a_dict(metodo, moneda)


def listar_metodos_pago(db: Session) -> list[dict]:
    metodos = db.query(MetodoPago).order_by(MetodoPago.nombre).all()
    return [metodo_pago_a_respuesta(db, m) for m in metodos]


def crear_metodo_pago(db: Session, codigo: str, nombre: str, moneda_id: int) -> MetodoPago:
    validar_moneda_existente(db, moneda_id)
    codigo_limpio = codigo.strip().lower()
    existe = db.query(MetodoPago).filter(MetodoPago.codigo == codigo_limpio).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un metodo de pago con ese codigo")

    nuevo = MetodoPago(codigo=codigo_limpio, nombre=nombre.strip(), moneda_id=moneda_id)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_metodo_pago(
    db: Session,
    metodo_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    moneda_id: Optional[int],
) -> MetodoPago:
    metodo = obtener_metodo_pago(db, metodo_id)

    if moneda_id is not None:
        validar_moneda_existente(db, moneda_id)
        metodo.moneda_id = moneda_id

    if codigo is not None:
        codigo_limpio = codigo.strip().lower()
        repetido = db.query(MetodoPago).filter(
            MetodoPago.codigo == codigo_limpio,
            MetodoPago.id != metodo_id,
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro metodo con ese codigo")
        metodo.codigo = codigo_limpio

    if nombre is not None:
        metodo.nombre = nombre.strip()

    db.commit()
    db.refresh(metodo)
    return metodo


def eliminar_metodo_pago(db: Session, metodo_id: int) -> None:
    metodo = obtener_metodo_pago(db, metodo_id)
    en_pago = db.query(Pago).filter(Pago.metodo_pago_id == metodo_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el metodo tiene pagos registrados")

    db.delete(metodo)
    db.commit()


def obtener_tasa(db: Session, tasa_id: int) -> Tasa:
    tasa = db.query(Tasa).filter(Tasa.id == tasa_id).first()
    if not tasa:
        raise HTTPException(status_code=404, detail="Tasa no encontrada")
    return tasa


def tasa_a_respuesta(db: Session, tasa: Tasa) -> dict:
    moneda = db.query(Moneda).filter(Moneda.id == tasa.moneda_id).first()
    if not moneda:
        raise HTTPException(status_code=500, detail="Moneda de la tasa no encontrada")
    return tasa_a_dict(tasa, moneda)


def listar_tasas(
    db: Session,
    moneda_id: Optional[int] = None,
    fecha: Optional[date] = None,
) -> list[dict]:
    consulta = db.query(Tasa)
    if moneda_id is not None:
        consulta = consulta.filter(Tasa.moneda_id == moneda_id)
    if fecha is not None:
        consulta = consulta.filter(Tasa.fecha == fecha)

    tasas = consulta.order_by(Tasa.fecha.desc(), Tasa.id.desc()).all()
    return [tasa_a_respuesta(db, t) for t in tasas]


def obtener_tasa_eur_del_dia_o_error(db: Session) -> dict:
    resultado = obtener_tasa_eur_del_dia(db)
    if resultado is None:
        raise HTTPException(status_code=404, detail="No hay tasa EUR registrada en el sistema")
    return resultado


def listar_tasas_hoy(db: Session) -> list[dict]:
    hoy = date.today()
    tasas = db.query(Tasa).filter(Tasa.fecha == hoy).order_by(Tasa.id.desc()).all()
    return [tasa_a_respuesta(db, t) for t in tasas]


def crear_tasa(db: Session, fecha: date, valor: Decimal, moneda_id: int) -> Tasa:
    validar_moneda_existente(db, moneda_id)
    nueva = Tasa(fecha=fecha, valor=valor, moneda_id=moneda_id)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def actualizar_tasa(
    db: Session,
    tasa_id: int,
    fecha: Optional[date],
    valor: Optional[Decimal],
    moneda_id: Optional[int],
) -> Tasa:
    tasa = obtener_tasa(db, tasa_id)

    if moneda_id is not None:
        validar_moneda_existente(db, moneda_id)
        tasa.moneda_id = moneda_id

    if fecha is not None:
        tasa.fecha = fecha

    if valor is not None:
        tasa.valor = valor

    db.commit()
    db.refresh(tasa)
    return tasa


def eliminar_tasa(db: Session, tasa_id: int) -> None:
    tasa = obtener_tasa(db, tasa_id)
    en_pago = db.query(Pago).filter(Pago.tasa_id == tasa_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: la tasa esta en uso por un pago")

    db.delete(tasa)
    db.commit()


def obtener_banco_activo(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(Banco.id == banco_id, Banco.eliminado_en.is_(None)).first()
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    return banco


def listar_bancos(db: Session) -> list[dict]:
    bancos = (
        db.query(Banco)
        .filter(Banco.eliminado_en.is_(None))
        .order_by(Banco.nombre)
        .all()
    )
    return [banco_a_dict(b) for b in bancos]


def crear_banco(db: Session, codigo: str, nombre: str, activo: bool) -> Banco:
    codigo_limpio = codigo.strip()
    existe = db.query(Banco).filter(Banco.codigo == codigo_limpio, Banco.eliminado_en.is_(None)).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un banco con ese codigo")

    ahora = datetime.now()
    nuevo = Banco(
        codigo=codigo_limpio,
        nombre=nombre.strip(),
        activo=activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_banco(
    db: Session,
    banco_id: int,
    codigo: Optional[str],
    nombre: Optional[str],
    activo: Optional[bool],
) -> Banco:
    banco = obtener_banco_activo(db, banco_id)

    if codigo is not None:
        codigo_limpio = codigo.strip()
        repetido = db.query(Banco).filter(
            Banco.codigo == codigo_limpio,
            Banco.id != banco_id,
            Banco.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro banco con ese codigo")
        banco.codigo = codigo_limpio

    if nombre is not None:
        banco.nombre = nombre.strip()

    if activo is not None:
        banco.activo = activo

    banco.actualizado_en = datetime.now()
    db.commit()
    db.refresh(banco)
    return banco


def eliminar_banco(db: Session, banco_id: int) -> None:
    banco = obtener_banco_activo(db, banco_id)

    en_punto = db.query(PuntoVenta).filter(
        PuntoVenta.banco_id == banco_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if en_punto:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco tiene puntos de venta")

    en_pago = db.query(Pago).filter(
        (Pago.banco_origen_id == banco_id) | (Pago.banco_destino_id == banco_id),
        Pago.eliminado_en.is_(None),
    ).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el banco esta en pagos registrados")

    ahora = datetime.now()
    banco.eliminado_en = ahora
    banco.actualizado_en = ahora
    db.commit()


def validar_banco_activo(db: Session, banco_id: int) -> Banco:
    banco = db.query(Banco).filter(
        Banco.id == banco_id,
        Banco.eliminado_en.is_(None),
        Banco.activo.is_(True),
    ).first()
    if not banco:
        raise HTTPException(status_code=400, detail="Banco invalido")
    return banco


def obtener_punto_venta_activo(db: Session, punto_id: int) -> PuntoVenta:
    punto = db.query(PuntoVenta).filter(
        PuntoVenta.id == punto_id,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto de venta no encontrado")
    return punto


def punto_venta_a_respuesta(db: Session, punto: PuntoVenta) -> dict:
    resultado = punto_venta_a_dict(punto)
    banco = db.query(Banco).filter(Banco.id == punto.banco_id).first()
    if banco:
        resultado["banco"] = banco_a_dict(banco)
    return resultado


def listar_puntos_venta(db: Session, banco_id: Optional[int] = None) -> list[dict]:
    consulta = db.query(PuntoVenta).filter(PuntoVenta.eliminado_en.is_(None))
    if banco_id is not None:
        consulta = consulta.filter(PuntoVenta.banco_id == banco_id)

    puntos = consulta.order_by(PuntoVenta.nombre).all()
    return [punto_venta_a_respuesta(db, p) for p in puntos]


def crear_punto_venta(
    db: Session,
    banco_id: int,
    codigo: str,
    nombre: str,
    numero_terminal: Optional[str],
    activo: bool,
) -> PuntoVenta:
    validar_banco_activo(db, banco_id)
    codigo_limpio = codigo.strip()
    existe = db.query(PuntoVenta).filter(
        PuntoVenta.codigo == codigo_limpio,
        PuntoVenta.eliminado_en.is_(None),
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un punto de venta con ese codigo")

    ahora = datetime.now()
    nuevo = PuntoVenta(
        banco_id=banco_id,
        codigo=codigo_limpio,
        nombre=nombre.strip(),
        numero_terminal=numero_terminal,
        activo=activo,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def actualizar_punto_venta(
    db: Session,
    punto_id: int,
    banco_id: Optional[int],
    codigo: Optional[str],
    nombre: Optional[str],
    numero_terminal: Optional[str],
    activo: Optional[bool],
) -> PuntoVenta:
    punto = obtener_punto_venta_activo(db, punto_id)

    if banco_id is not None:
        validar_banco_activo(db, banco_id)
        punto.banco_id = banco_id

    if codigo is not None:
        codigo_limpio = codigo.strip()
        repetido = db.query(PuntoVenta).filter(
            PuntoVenta.codigo == codigo_limpio,
            PuntoVenta.id != punto_id,
            PuntoVenta.eliminado_en.is_(None),
        ).first()
        if repetido:
            raise HTTPException(status_code=400, detail="Ya existe otro punto de venta con ese codigo")
        punto.codigo = codigo_limpio

    if nombre is not None:
        punto.nombre = nombre.strip()

    if numero_terminal is not None:
        punto.numero_terminal = numero_terminal

    if activo is not None:
        punto.activo = activo

    punto.actualizado_en = datetime.now()
    db.commit()
    db.refresh(punto)
    return punto


def eliminar_punto_venta(db: Session, punto_id: int) -> None:
    punto = obtener_punto_venta_activo(db, punto_id)
    en_pago = db.query(Pago).filter(Pago.punto_venta_id == punto_id, Pago.eliminado_en.is_(None)).first()
    if en_pago:
        raise HTTPException(status_code=400, detail="No se puede eliminar: el punto de venta tiene pagos registrados")

    ahora = datetime.now()
    punto.eliminado_en = ahora
    punto.actualizado_en = ahora
    db.commit()
