from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Session

from database import Base
from utilidades.paginacion import offset_pagina, respuesta_paginada

TIPO_DOMICILIO = "domicilio"
TIPO_PARADA = "parada"


class PuntoRecogida(Base):
    __tablename__ = "puntos_recogida"

    id = Column(BigInteger, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    direccion = Column(String(255), nullable=True)
    ciudad = Column(String(100), nullable=True)
    estado = Column(String(100), nullable=True)
    notas_referencia = Column(String(255), nullable=True)
    tipo = Column(String(20), nullable=False, default=TIPO_DOMICILIO)
    activo = Column(Boolean, nullable=False, default=True)
    creado_por = Column(BigInteger, ForeignKey("usuarios.id"), nullable=True, index=True)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


class ClientePuntoRecogida(Base):
    __tablename__ = "clientes_puntos_recogida"

    id = Column(BigInteger, primary_key=True, index=True)
    cliente_id = Column(BigInteger, ForeignKey("clientes.id"), nullable=False, index=True)
    punto_recogida_id = Column(BigInteger, ForeignKey("puntos_recogida.id"), nullable=False, index=True)
    es_predeterminado = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime, nullable=False)
    actualizado_en = Column(DateTime, nullable=False)
    eliminado_en = Column(DateTime, nullable=True)


def _texto_normalizado(valor: str | None) -> str | None:
    if valor is None:
        return None
    limpio = valor.strip()
    return limpio or None


def punto_recogida_a_dict(punto: PuntoRecogida, es_predeterminado: bool = False) -> dict:
    return {
        "id": punto.id,
        "nombre": punto.nombre,
        "direccion": punto.direccion,
        "ciudad": punto.ciudad,
        "estado": punto.estado,
        "notas_referencia": punto.notas_referencia,
        "referencia": punto.notas_referencia,
        "tipo": getattr(punto, "tipo", TIPO_DOMICILIO) or TIPO_DOMICILIO,
        "activo": punto.activo,
        "es_predeterminado": es_predeterminado,
    }


def validar_datos_domicilio_cliente(
    nombre: str | None,
    direccion: str | None,
    ciudad: str | None,
    estado: str | None,
    notas_referencia: str | None,
) -> tuple[str, str, str, str, str]:
    nombre_limpio = _texto_normalizado(nombre)
    direccion_limpia = _texto_normalizado(direccion)
    ciudad_limpia = _texto_normalizado(ciudad)
    estado_limpio = _texto_normalizado(estado)
    referencia_limpia = _texto_normalizado(notas_referencia)

    if not nombre_limpio:
        raise HTTPException(status_code=422, detail="El nombre del domicilio es requerido (ej. Mi casa)")
    if not direccion_limpia:
        raise HTTPException(status_code=422, detail="La direccion exacta de recogida es requerida")
    if not ciudad_limpia:
        raise HTTPException(status_code=422, detail="La ciudad del domicilio es requerida")
    if not estado_limpio:
        raise HTTPException(status_code=422, detail="El estado del domicilio es requerido")
    if not referencia_limpia:
        raise HTTPException(
            status_code=422,
            detail="La referencia del domicilio es requerida (ej. casa esquinera, porton azul)",
        )

    return nombre_limpio, direccion_limpia, ciudad_limpia, estado_limpio, referencia_limpia


def buscar_punto_domicilio_cliente(
    db: Session,
    cliente_id: int,
    direccion: str,
    ciudad: str,
    estado: str,
) -> PuntoRecogida | None:
    direccion_limpia = _texto_normalizado(direccion)
    ciudad_limpia = _texto_normalizado(ciudad)
    estado_limpio = _texto_normalizado(estado)

    fila = (
        db.query(PuntoRecogida)
        .join(
            ClientePuntoRecogida,
            ClientePuntoRecogida.punto_recogida_id == PuntoRecogida.id,
        )
        .filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.eliminado_en.is_(None),
            PuntoRecogida.eliminado_en.is_(None),
            PuntoRecogida.tipo == TIPO_DOMICILIO,
            func.lower(func.trim(PuntoRecogida.direccion)) == direccion_limpia.lower(),
            func.lower(func.trim(PuntoRecogida.ciudad)) == ciudad_limpia.lower(),
            func.lower(func.trim(PuntoRecogida.estado)) == estado_limpio.lower(),
        )
        .first()
    )
    return fila


def buscar_punto_recogida_activo(db: Session, punto_id: int) -> PuntoRecogida:
    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.activo.is_(True),
        PuntoRecogida.eliminado_en.is_(None),
    ).first()
    if punto is None:
        raise HTTPException(status_code=404, detail="Punto de recogida no encontrado")
    return punto


def crear_punto_domicilio_cliente(
    db: Session,
    cliente_id: int,
    nombre: str,
    direccion: str,
    ciudad: str,
    estado: str,
    notas_referencia: str,
    creado_por_usuario_id: int | None = None,
) -> PuntoRecogida:
    nombre_limpio, direccion_limpia, ciudad_limpia, estado_limpio, referencia_limpia = (
        validar_datos_domicilio_cliente(nombre, direccion, ciudad, estado, notas_referencia)
    )

    existente = buscar_punto_domicilio_cliente(
        db, cliente_id, direccion_limpia, ciudad_limpia, estado_limpio
    )
    if existente is not None:
        if not existente.activo:
            existente.activo = True
        existente.nombre = nombre_limpio
        existente.notas_referencia = referencia_limpia
        existente.actualizado_en = datetime.now()
        return existente

    ahora = datetime.now()
    nuevo_punto = PuntoRecogida(
        nombre=nombre_limpio,
        direccion=direccion_limpia,
        ciudad=ciudad_limpia,
        estado=estado_limpio,
        notas_referencia=referencia_limpia,
        tipo=TIPO_DOMICILIO,
        activo=True,
        creado_por=creado_por_usuario_id,
        creado_en=ahora,
        actualizado_en=ahora,
    )
    db.add(nuevo_punto)
    db.flush()
    return nuevo_punto


def listar_puntos_por_cliente(db: Session, cliente_id: int) -> list[dict]:
    filas = (
        db.query(ClientePuntoRecogida, PuntoRecogida)
        .join(PuntoRecogida, PuntoRecogida.id == ClientePuntoRecogida.punto_recogida_id)
        .filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.eliminado_en.is_(None),
            PuntoRecogida.eliminado_en.is_(None),
        )
        .order_by(
            ClientePuntoRecogida.es_predeterminado.desc(),
            PuntoRecogida.nombre.asc(),
        )
        .all()
    )
    return [
        punto_recogida_a_dict(punto, es_predeterminado=vinculo.es_predeterminado)
        for vinculo, punto in filas
    ]


def obtener_punto_predeterminado_cliente(db: Session, cliente_id: int) -> int | None:
    vinculo = (
        db.query(ClientePuntoRecogida)
        .filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.es_predeterminado.is_(True),
            ClientePuntoRecogida.eliminado_en.is_(None),
        )
        .first()
    )
    if vinculo is not None:
        return vinculo.punto_recogida_id

    vinculo = (
        db.query(ClientePuntoRecogida)
        .filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.eliminado_en.is_(None),
        )
        .order_by(ClientePuntoRecogida.id.asc())
        .first()
    )
    return vinculo.punto_recogida_id if vinculo is not None else None


def _marcar_predeterminado(db: Session, cliente_id: int, punto_recogida_id: int) -> None:
    vinculos = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).all()

    ahora = datetime.now()
    for vinculo in vinculos:
        vinculo.es_predeterminado = vinculo.punto_recogida_id == punto_recogida_id
        vinculo.actualizado_en = ahora


def _vincular_punto_a_cliente(
    db: Session,
    cliente_id: int,
    punto_recogida_id: int,
    es_predeterminado: bool = False,
) -> ClientePuntoRecogida:
    buscar_punto_recogida_activo(db, punto_recogida_id)

    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
    ).first()

    ahora = datetime.now()
    if vinculo is None:
        vinculo = ClientePuntoRecogida(
            cliente_id=cliente_id,
            punto_recogida_id=punto_recogida_id,
            es_predeterminado=es_predeterminado,
            creado_en=ahora,
            actualizado_en=ahora,
        )
        db.add(vinculo)
    else:
        vinculo.eliminado_en = None
        vinculo.es_predeterminado = es_predeterminado
        vinculo.actualizado_en = ahora

    if es_predeterminado:
        _marcar_predeterminado(db, cliente_id, punto_recogida_id)

    db.flush()
    return vinculo


def asignar_puntos_a_cliente(
    db: Session,
    cliente_id: int,
    punto_recogida_ids: list[int] | None = None,
    puntos_nuevos: list | None = None,
    creado_por_usuario_id: int | None = None,
) -> list[dict]:
    ids_procesados: list[int] = []
    marcar_predeterminado: int | None = None

    if punto_recogida_ids:
        for punto_id in punto_recogida_ids:
            _vincular_punto_a_cliente(db, cliente_id, punto_id, es_predeterminado=False)
            ids_procesados.append(punto_id)

    if puntos_nuevos:
        for punto_datos in puntos_nuevos:
            es_predeterminado = getattr(punto_datos, "es_predeterminado", False)
            punto = crear_punto_domicilio_cliente(
                db,
                cliente_id=cliente_id,
                nombre=punto_datos.nombre,
                direccion=getattr(punto_datos, "direccion", "") or "",
                ciudad=getattr(punto_datos, "ciudad", "") or "",
                estado=getattr(punto_datos, "estado", "") or "",
                notas_referencia=getattr(punto_datos, "notas_referencia", "") or "",
                creado_por_usuario_id=creado_por_usuario_id,
            )
            _vincular_punto_a_cliente(
                db,
                cliente_id,
                punto.id,
                es_predeterminado=es_predeterminado,
            )
            ids_procesados.append(punto.id)
            if es_predeterminado:
                marcar_predeterminado = punto.id

    if ids_procesados and marcar_predeterminado is None:
        tiene_predeterminado = db.query(ClientePuntoRecogida).filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.es_predeterminado.is_(True),
            ClientePuntoRecogida.eliminado_en.is_(None),
        ).first()
        if tiene_predeterminado is None:
            _marcar_predeterminado(db, cliente_id, ids_procesados[0])

    return listar_puntos_por_cliente(db, cliente_id)


def crear_punto_para_cliente(
    db: Session,
    cliente_id: int,
    nombre: str,
    direccion: str | None,
    ciudad: str | None,
    estado: str | None,
    notas_referencia: str | None,
    es_predeterminado: bool,
    creado_por_usuario_id: int | None,
) -> dict:
    punto = crear_punto_domicilio_cliente(
        db,
        cliente_id=cliente_id,
        nombre=nombre,
        direccion=direccion or "",
        ciudad=ciudad or "",
        estado=estado or "",
        notas_referencia=notas_referencia or "",
        creado_por_usuario_id=creado_por_usuario_id,
    )
    _vincular_punto_a_cliente(
        db,
        cliente_id,
        punto.id,
        es_predeterminado=es_predeterminado,
    )

    if not es_predeterminado:
        tiene_predeterminado = db.query(ClientePuntoRecogida).filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.es_predeterminado.is_(True),
            ClientePuntoRecogida.eliminado_en.is_(None),
        ).first()
        if tiene_predeterminado is None:
            _marcar_predeterminado(db, cliente_id, punto.id)

    db.commit()
    db.refresh(punto)
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto.id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    return punto_recogida_a_dict(
        punto,
        es_predeterminado=vinculo.es_predeterminado if vinculo else False,
    )


def vincular_punto_existente_a_cliente(
    db: Session,
    cliente_id: int,
    punto_recogida_id: int,
    es_predeterminado: bool = False,
) -> dict:
    punto = buscar_punto_recogida_activo(db, punto_recogida_id)
    if getattr(punto, "tipo", TIPO_DOMICILIO) != TIPO_DOMICILIO:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden vincular domicilios del cliente, no paradas de ruta",
        )

    _vincular_punto_a_cliente(db, cliente_id, punto_recogida_id, es_predeterminado)

    if not es_predeterminado:
        tiene_predeterminado = db.query(ClientePuntoRecogida).filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.es_predeterminado.is_(True),
            ClientePuntoRecogida.eliminado_en.is_(None),
        ).first()
        if tiene_predeterminado is None:
            _marcar_predeterminado(db, cliente_id, punto_recogida_id)

    db.commit()
    punto = buscar_punto_recogida_activo(db, punto_recogida_id)
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    return punto_recogida_a_dict(
        punto,
        es_predeterminado=vinculo.es_predeterminado if vinculo else False,
    )


def marcar_punto_predeterminado_cliente(
    db: Session,
    cliente_id: int,
    punto_recogida_id: int,
) -> dict:
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    if vinculo is None:
        raise HTTPException(
            status_code=404,
            detail="El punto de recogida no está vinculado a este cliente",
        )

    _marcar_predeterminado(db, cliente_id, punto_recogida_id)
    db.commit()

    punto = buscar_punto_recogida_activo(db, punto_recogida_id)
    return punto_recogida_a_dict(punto, es_predeterminado=True)


def actualizar_punto_domicilio_cliente(
    db: Session,
    cliente_id: int,
    punto_recogida_id: int,
    nombre: str | None = None,
    direccion: str | None = None,
    ciudad: str | None = None,
    estado: str | None = None,
    notas_referencia: str | None = None,
) -> dict:
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    if vinculo is None:
        raise HTTPException(
            status_code=404,
            detail="El domicilio no esta vinculado a este cliente",
        )

    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_recogida_id,
        PuntoRecogida.eliminado_en.is_(None),
        PuntoRecogida.tipo == TIPO_DOMICILIO,
    ).first()
    if punto is None:
        raise HTTPException(status_code=404, detail="Domicilio de recogida no encontrado")

    nombre_final = nombre if nombre is not None else punto.nombre
    direccion_final = direccion if direccion is not None else punto.direccion
    ciudad_final = ciudad if ciudad is not None else punto.ciudad
    estado_final = estado if estado is not None else punto.estado
    referencia_final = notas_referencia if notas_referencia is not None else punto.notas_referencia

    nombre_limpio, direccion_limpia, ciudad_limpia, estado_limpio, referencia_limpia = (
        validar_datos_domicilio_cliente(
            nombre_final, direccion_final, ciudad_final, estado_final, referencia_final
        )
    )

    punto.nombre = nombre_limpio
    punto.direccion = direccion_limpia
    punto.ciudad = ciudad_limpia
    punto.estado = estado_limpio
    punto.notas_referencia = referencia_limpia
    punto.actualizado_en = datetime.now()
    db.commit()
    db.refresh(punto)

    return punto_recogida_a_dict(punto, es_predeterminado=vinculo.es_predeterminado)


def validar_punto_recogida_del_cliente(db: Session, cliente_id: int, punto_id: int) -> None:
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    if vinculo is None:
        raise HTTPException(
            status_code=400,
            detail="El domicilio de recogida no pertenece al cliente",
        )

    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_id,
        PuntoRecogida.eliminado_en.is_(None),
        PuntoRecogida.activo.is_(True),
        PuntoRecogida.tipo == TIPO_DOMICILIO,
    ).first()
    if punto is None:
        raise HTTPException(status_code=400, detail="Domicilio de recogida no valido")

    if not _texto_normalizado(punto.direccion) or not _texto_normalizado(punto.notas_referencia):
        raise HTTPException(
            status_code=400,
            detail="El domicilio debe tener direccion exacta y referencia completas",
        )


def desvincular_punto_de_cliente(db: Session, cliente_id: int, punto_recogida_id: int) -> dict:
    vinculo = db.query(ClientePuntoRecogida).filter(
        ClientePuntoRecogida.cliente_id == cliente_id,
        ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
        ClientePuntoRecogida.eliminado_en.is_(None),
    ).first()
    if vinculo is None:
        raise HTTPException(
            status_code=404,
            detail="El punto de recogida no está vinculado a este cliente",
        )

    era_predeterminado = vinculo.es_predeterminado
    ahora = datetime.now()
    vinculo.eliminado_en = ahora
    vinculo.es_predeterminado = False
    vinculo.actualizado_en = ahora

    if era_predeterminado:
        siguiente = db.query(ClientePuntoRecogida).filter(
            ClientePuntoRecogida.cliente_id == cliente_id,
            ClientePuntoRecogida.eliminado_en.is_(None),
        ).order_by(ClientePuntoRecogida.id.asc()).first()
        if siguiente is not None:
            _marcar_predeterminado(db, cliente_id, siguiente.punto_recogida_id)

    db.commit()
    return {
        "mensaje": "Punto de recogida desvinculado del cliente",
        "cliente_id": cliente_id,
        "punto_recogida_id": punto_recogida_id,
    }


def _cliente_resumen_domicilio(cliente) -> dict:
    return {
        "id": cliente.id,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
        "telefono": cliente.telefono,
    }


def _domicilio_listado_dict(
    punto: PuntoRecogida,
    vinculo: ClientePuntoRecogida | None = None,
    cliente=None,
) -> dict:
    es_predeterminado = vinculo.es_predeterminado if vinculo is not None else False
    data = punto_recogida_a_dict(punto, es_predeterminado=es_predeterminado)
    if vinculo is not None:
        data["vinculo_id"] = vinculo.id
    if cliente is not None:
        data["cliente"] = _cliente_resumen_domicilio(cliente)
    else:
        data["cliente"] = None
        data["sin_cliente"] = True
    return data


def listar_domicilios_recogida(
    db: Session,
    cliente_id: int | None = None,
    buscar: str | None = None,
    solo_activos: bool = True,
    incluir_sin_cliente: bool = True,
    pagina: int = 1,
    limite: int = 10,
) -> dict:
    from modelos.cliente_modelo import Cliente
    from sqlalchemy import or_

    consulta = (
        db.query(ClientePuntoRecogida, PuntoRecogida, Cliente)
        .join(PuntoRecogida, PuntoRecogida.id == ClientePuntoRecogida.punto_recogida_id)
        .join(Cliente, Cliente.id == ClientePuntoRecogida.cliente_id)
        .filter(
            ClientePuntoRecogida.eliminado_en.is_(None),
            PuntoRecogida.eliminado_en.is_(None),
            Cliente.eliminado_en.is_(None),
        )
    )

    if cliente_id is not None:
        consulta = consulta.filter(ClientePuntoRecogida.cliente_id == cliente_id)
    if solo_activos:
        consulta = consulta.filter(PuntoRecogida.activo.is_(True))
    if buscar is not None and buscar.strip():
        termino = f"%{buscar.strip().lower()}%"
        consulta = consulta.filter(
            or_(
                func.lower(PuntoRecogida.nombre).like(termino),
                func.lower(PuntoRecogida.direccion).like(termino),
                func.lower(PuntoRecogida.ciudad).like(termino),
                func.lower(Cliente.nombre).like(termino),
                func.lower(Cliente.apellido).like(termino),
                func.lower(Cliente.numero_documento).like(termino),
            )
        )

    filas = consulta.order_by(
        Cliente.apellido.asc(),
        Cliente.nombre.asc(),
        ClientePuntoRecogida.es_predeterminado.desc(),
        PuntoRecogida.nombre.asc(),
    ).all()

    domicilios = [
        _domicilio_listado_dict(punto, vinculo, cliente)
        for vinculo, punto, cliente in filas
    ]
    ids_listados = {item["id"] for item in domicilios}

    if incluir_sin_cliente and cliente_id is None and not buscar:
        huerfanos = (
            db.query(PuntoRecogida)
            .filter(
                PuntoRecogida.eliminado_en.is_(None),
                PuntoRecogida.tipo == TIPO_DOMICILIO,
            )
            .all()
        )
        for punto in huerfanos:
            if punto.id in ids_listados:
                continue
            tiene_vinculo = db.query(ClientePuntoRecogida).filter(
                ClientePuntoRecogida.punto_recogida_id == punto.id,
                ClientePuntoRecogida.eliminado_en.is_(None),
            ).first()
            if tiene_vinculo is not None:
                continue
            if solo_activos and not punto.activo:
                continue
            domicilios.append(_domicilio_listado_dict(punto))

    total = len(domicilios)
    inicio = offset_pagina(pagina, limite)
    items = domicilios[inicio:inicio + limite]
    return respuesta_paginada(items, total, pagina, limite)


def obtener_domicilio_recogida(db: Session, punto_recogida_id: int) -> dict:
    from modelos.cliente_modelo import Cliente

    punto = db.query(PuntoRecogida).filter(
        PuntoRecogida.id == punto_recogida_id,
        PuntoRecogida.eliminado_en.is_(None),
    ).first()
    if punto is None:
        raise HTTPException(status_code=404, detail="Domicilio de recogida no encontrado")

    filas = (
        db.query(ClientePuntoRecogida, Cliente)
        .join(Cliente, Cliente.id == ClientePuntoRecogida.cliente_id)
        .filter(
            ClientePuntoRecogida.punto_recogida_id == punto_recogida_id,
            ClientePuntoRecogida.eliminado_en.is_(None),
            Cliente.eliminado_en.is_(None),
        )
        .order_by(Cliente.apellido.asc(), Cliente.nombre.asc())
        .all()
    )

    clientes = [
        {
            **_cliente_resumen_domicilio(cliente),
            "es_predeterminado": vinculo.es_predeterminado,
            "vinculo_id": vinculo.id,
        }
        for vinculo, cliente in filas
    ]

    domicilio = punto_recogida_a_dict(punto)
    domicilio["clientes"] = clientes
    domicilio["sin_cliente"] = len(clientes) == 0
    return {"domicilio": domicilio}
