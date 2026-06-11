import hashlib

def hashear_contrasena(contrasena: str) -> str:
    return hashlib.sha256(contrasena.encode("utf-8")).hexdigest()

def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    hash_ingresado = hashear_contrasena(contrasena)
    return hash_ingresado == hash_guardado
