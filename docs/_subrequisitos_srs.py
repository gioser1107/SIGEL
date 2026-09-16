"""Subrequisitos 3.1 / 3.2 / 3.3 de cada requisito general (observación de la profesora)."""

SUB_RF = {
    "RF-01": (
        "El sistema debe mostrar el mapa de asientos de la unidad asignada al viaje.",
        "El sistema debe asociar un asiento libre a un pasajero de la reserva.",
        "El sistema debe rechazar con HTTP 409 un segundo intento sobre el mismo asiento vigente.",
    ),
    "RF-02": (
        "El sistema debe registrar monto, método, referencia, moneda y comprobante del abono.",
        "El sistema debe convertir el monto a EUR con la tasa del día cuando el pago es en divisas.",
        "El sistema debe dejar el pago en estado en_validacion y calcular el saldo deudor.",
    ),
    "RF-03": (
        "El sistema debe listar el manifiesto de pasajeros del viaje.",
        "El sistema debe registrar abordado o no presentado de forma individual o por lote.",
        "El sistema debe permitir anular el registro y devolver al pasajero a pendiente.",
    ),
    "RF-04": (
        "El sistema debe crear destinos con nombre, descripción, precio e imágenes.",
        "El sistema debe publicar destinos activos en el portal público.",
        "El sistema debe bloquear la anulación si existen viajes o reservas dependientes.",
    ),
    "RF-05": (
        "El sistema debe crear cotizaciones con cliente, destino, vigencia y líneas de desglose.",
        "El sistema debe recalcular totales al modificar o eliminar una línea.",
        "El sistema debe cancelar lógicamente la cotización si no hay reservas activas asociadas.",
    ),
    "RF-06": (
        "El sistema debe registrar partidas de costo asociadas a un viaje.",
        "El sistema debe clasificar costos (transporte, guías, viáticos u otra partida).",
        "El sistema debe calcular el total de gastos y el precio de venta del viaje.",
    ),
    "RF-07": (
        "El sistema debe ordenar las paradas de recogida del viaje.",
        "El sistema debe vincular el domicilio del cliente a la reserva.",
        "El sistema debe permitir al cliente crear y editar sus puntos de recogida en el portal.",
    ),
    "RF-08": (
        "El sistema debe habilitar la reseña solo en reservas elegibles.",
        "El sistema debe almacenar puntuación de 1 a 5 y comentario opcional.",
        "El sistema debe permitir al administrador ocultar o eliminar reseñas inapropiadas.",
    ),
    "RF-09": (
        "El sistema debe mostrar la bandeja de pagos en validación con el comprobante.",
        "El sistema debe aprobar el pago, dejar estado aprobado y reducir el saldo.",
        "El sistema debe rechazar el pago sin alterar saldos ya aprobados y registrar bitácora.",
    ),
    "RF-10": (
        "El sistema debe asignar uno o más guías a un viaje y marcar el guía principal.",
        "El sistema debe listar los viajes autorizados al guía autenticado.",
        "El sistema debe limitar el manifiesto y el abordaje al permiso del rol Guía.",
    ),
    "RF-11": (
        "El sistema debe crear clientes con tipo y número de documento únicos.",
        "El sistema debe permitir consultar y editar datos de contacto y ubicación.",
        "El sistema debe desactivar el cliente de forma lógica sin borrar el historial.",
    ),
    "RF-12": (
        "El sistema debe crear la reserva con titular y viajeros, cada viajero siendo un cliente.",
        "El sistema debe debitar cupo al confirmar y liberar asientos al anular.",
        "El sistema debe restringir al cliente la consulta de reservas a las suyas.",
    ),
    "RF-13": (
        "El sistema debe mostrar destinos publicados sin autenticación.",
        "El sistema debe mostrar la agenda de viajes publicados con filtros de fecha o destino.",
        "El sistema debe ofrecer enlaces a registro e inicio de sesión desde el catálogo.",
    ),
    "RF-14": (
        "El sistema debe autenticar al cliente y mostrar solo sus reservas.",
        "El sistema debe permitir reportar un pago y completar el abono desde el portal.",
        "El sistema debe permitir gestionar recogida y reseñas del titular autenticado.",
    ),
    "RF-15": (
        "El sistema debe filtrar indicadores por fecha desde y fecha hasta reales.",
        "El sistema debe mostrar clientes, reservas, destinos e ingresos aprobados del periodo.",
        "El sistema debe rechazar con HTTP 400 rangos invertidos o años imposibles.",
    ),
    "RF-16": (
        "El sistema debe registrar la unidad con placa única, modelo y capacidad.",
        "El sistema debe configurar filas, columnas y tipo de cada asiento.",
        "El sistema debe dar de baja la unidad de forma lógica sin borrar el historial.",
    ),
    "RF-17": (
        "El sistema debe mantener monedas, métodos de pago, bancos y puntos de venta activos.",
        "El sistema debe registrar o sincronizar la tasa del día (incluida la del BCV).",
        "El sistema debe rechazar el pago en divisas si no existe tasa del día.",
    ),
    "RF-18": (
        "El sistema debe crear el viaje con destino, fechas, unidad y estado operativo.",
        "El sistema debe generar un reporte de viaje consultable e imprimible.",
        "El sistema debe bloquear la anulación si existen reservas activas.",
    ),
    "RF-19": (
        "El sistema debe listar eventos de bitácora con actor, módulo, acción y registro.",
        "El sistema debe filtrar por módulo, acción, usuario, fechas y texto.",
        "El sistema debe retornar HTTP 403 si falta el permiso leer_bitacora.",
    ),
    "RF-20": (
        "El sistema debe registrar la cuenta del visitante con correo único y contraseña.",
        "El sistema debe crear el perfil de cliente asociado al usuario de rol Cliente.",
        "El sistema debe rechazar el registro si el correo o el documento ya existen.",
    ),
}

SUB_RNF = {
    "RNF-01": (
        "El sistema debe exigir token JWT válido en rutas administrativas, de guía y de portal cliente.",
        "El sistema debe rechazar con HTTP 401 credenciales inválidas, token expirado o usuario eliminado.",
        "El token debe incluir sub, exp e iat, con expiración configurable no mayor a 24 h.",
    ),
    "RNF-02": (
        "El sistema debe permitir crear, editar y desactivar cuentas internas y de cliente.",
        "El sistema no debe autenticar cuentas inactivas o con eliminado_en.",
        "El cambio de estado debe registrarse en bitácora y aplicarse en la siguiente solicitud (≤ 60 s).",
    ),
    "RNF-03": (
        "El menú debe persistir según el rol autenticado.",
        "Catálogo, reserva, mapa de asientos y pagos pendientes deben alcanzarse en ≤ 4 clics.",
        "Los flujos de reserva y pago no deben tener callejón sin salida.",
    ),
    "RNF-04": (
        "La interfaz debe adaptarse a un ancho mínimo de 360 px.",
        "Reserva y check-in deben operar en Chrome y Edge (dos últimas versiones).",
        "No debe perderse la función de manifiesto en viewport móvil.",
    ),
    "RNF-05": (
        "Los formularios de reserva, asiento y pago deben mostrar mensajes en español.",
        "Una reserva de prueba debe completarse en ≤ 10 min sin ayuda.",
        "La tasa de error de usuarios de prueba debe ser ≤ 10 % (SUS ≥ 70).",
    ),
    "RNF-06": (
        "El backend debe separar controladores, modelos y utilidades (MVC).",
        "Un endpoint CRUD nuevo debe poder incorporarse en ≤ 4 h.",
        "La API debe documentarse en OpenAPI (/docs).",
    ),
    "RNF-07": (
        "Los listados de más de 50 registros deben paginarse.",
        "Las búsquedas frecuentes deben usar índices de clave.",
        "El listado no debe cargar el maestro completo en una sola respuesta.",
    ),
    "RNF-08": (
        "La asignación de asiento y el cupo deben ejecutarse en transacción ACID.",
        "Un conflicto de integridad debe responder HTTP 409.",
        "Una prueba concurrente sobre el mismo asiento debe producir 0 sobreventas.",
    ),
    "RNF-09": (
        "Las contraseñas deben almacenarse con hash unidireccional (no texto plano ni MD5).",
        "Los secretos no deben versionarse en el repositorio.",
        "Los archivos subidos deben validar MIME y un máximo de 10 MB.",
    ),
    "RNF-10": (
        "Toda escritura debe validarse en cliente y en servidor (Pydantic y reglas de dominio).",
        "Un payload inválido debe retornar HTTP 400 o 422 y no persistir.",
        "Montos deben ser ≥ 0 y las fechas deben ser coherentes.",
    ),
    "RNF-11": (
        "Cada acción administrativa debe autorizarse con un permiso granular.",
        "La ausencia de permiso debe retornar HTTP 403.",
        "Un cliente no debe ejecutar conciliación, usuarios ni bitácora.",
    ),
    "RNF-12": (
        "Deben existir al menos los roles Administrador, Guía y Cliente.",
        "El token debe incluir rol_id verificado contra la base de datos.",
        "El cambio de permisos del rol debe aplicarse en la siguiente autenticación (≤ 60 s).",
    ),
    "RNF-13": (
        "La API debe exponer routers por dominio bajo el prefijo /api.",
        "Deben documentarse ≥ 15 routers en /docs.",
        "Desactivar un router no debe impedir el arranque del resto.",
    ),
    "RNF-14": (
        "Cada escritura crítica debe guardar usuario, módulo, acción, tabla, id, IP y fecha.",
        "La consulta de bitácora debe ser paginada y filtrable.",
        "Un login más tres escrituras deben generar ≥ 4 registros coherentes.",
    ),
    "RNF-15": (
        "El percentil 95 de lecturas frecuentes debe ser ≤ 2 s.",
        "El percentil 95 de escrituras frecuentes debe ser ≤ 3 s.",
        "El endpoint de salud /api debe responder en ≤ 500 ms.",
    ),
    "RNF-16": (
        "La autenticación debe ser JWT sin estado de servidor.",
        "La API debe poder ejecutarse en ≥ 2 procesos concurrentes.",
        "50 usuarios virtuales / 10 min deben mantener error 5xx < 1 %.",
    ),
    "RNF-17": (
        "Debe existir verificación de salud en /api.",
        "Debe preverse respaldo diario de MySQL con retención de 7 días.",
        "Ante caída de BD el usuario debe recibir HTTP 503 controlado.",
    ),
    "RNF-18": (
        "Una prueba de 25 usuarios (70 % lectura, 30 % escritura) debe documentarse.",
        "El P95 debe permanecer dentro de RNF-15.",
        "No deben aparecer HTTP 500 por agotamiento de recursos en esa prueba.",
    ),
    "RNF-19": (
        "El bundle principal comprimido debe ser ≤ 500 KB.",
        "Las imágenes de catálogo deben servirse en WebP.",
        "La RAM del proceso API debe ser ≤ 512 MB con 25 usuarios.",
    ),
}

SUB_RCI = {
    "RCI-01": (
        "El modelo debe recibir costos, precio de venta y ocupación histórica del viaje.",
        "El modelo debe devolver ocupación mínima de equilibrio e indicador de ganancia o pérdida.",
        "El error absoluto medio del punto de equilibrio debe ser < 15 % en el conjunto de prueba.",
    ),
    "RCI-02": (
        "El modelo debe usar historial de reservas y reseñas del cliente (sin género ni edad).",
        "El modelo debe devolver tres destinos ordenados por relevancia.",
        "El índice de relevancia de la sugerencia debe ser ≥ 75 %.",
    ),
    "RCI-03": (
        "El modelo debe tomar la serie diaria de asientos vendidos por destino.",
        "El modelo debe proyectar la demanda a 30 días.",
        "El error de la proyección debe ser < 15 %.",
    ),
}


def _bloque(subs):
    return (
        " Subrequisitos: "
        f"3.1 {subs[0]} "
        f"3.2 {subs[1]} "
        f"3.3 {subs[2]}"
    )


def aplicar_matriz(matriz, tabla_subs):
    filas = []
    for fila in matriz:
        ident = fila[0]
        if ident in tabla_subs:
            spec = fila[4] + _bloque(tabla_subs[ident])
            fila = fila[:4] + (spec,) + fila[5:]
        filas.append(fila)
    return filas


def aplicar_fichas_rf(fichas, tabla_subs):
    out = []
    for ficha in fichas:
        ident = ficha[0]
        if ident in tabla_subs:
            desc = ficha[2] + _bloque(tabla_subs[ident])
            ficha = (ficha[0], ficha[1], desc) + ficha[3:]
        out.append(ficha)
    return out


def aplicar_fichas_rnf(fichas, tabla_subs):
    return aplicar_fichas_rf(fichas, tabla_subs)


def aplicar_fichas_rci(fichas, tabla_subs):
    out = []
    for ficha in fichas:
        ident = ficha[0]
        if ident in tabla_subs:
            desc = ficha[3] + _bloque(tabla_subs[ident])
            ficha = ficha[:3] + (desc,) + ficha[4:]
        out.append(ficha)
    return out
