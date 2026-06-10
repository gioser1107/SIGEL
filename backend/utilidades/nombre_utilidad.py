def nombre_completo_de(nombre: str | None, apellido: str | None) -> str:
    return f"{nombre or ''} {apellido or ''}".strip()
