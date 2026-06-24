def normalizar_paginacion(pagina: int, limite: int, limite_max: int = 200) -> tuple[int, int]:
    pagina = max(1, pagina)
    limite = min(max(1, limite), limite_max)
    return pagina, limite


def offset_pagina(pagina: int, limite: int) -> int:
    return (pagina - 1) * limite


def respuesta_paginada(
    items: list,
    total: int,
    pagina: int,
    limite: int,
) -> dict:
    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "limite": limite,
    }


def paginar_consulta(consulta, pagina: int, limite: int):
    total = consulta.count()
    filas = (
        consulta.offset(offset_pagina(pagina, limite))
        .limit(limite)
        .all()
    )
    return filas, total
