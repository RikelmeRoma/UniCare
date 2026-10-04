from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "UniCare API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = "sqlite:///./unicare.db"  # Fallback SQLite para execução local instantânea sem Docker
    SECRET_KEY: str = "unicare_super_secret_jwt_key_uninassau_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
