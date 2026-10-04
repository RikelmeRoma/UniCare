import hashlib
import os

def get_password_hash(password: str) -> str:
    salt = os.urandom(16).hex()
    hash_obj = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}:{hash_obj}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, expected_hash = hashed_password.split(":")
        actual_hash = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return actual_hash == expected_hash
    except Exception:
        # Fallback de compatibilidade
        return plain_password == hashed_password
