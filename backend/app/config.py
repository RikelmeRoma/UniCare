from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Tupla para funcionar independente do diretório de trabalho: tanto na raiz do
    # repositório quanto em backend/ (o Compose usa a service `api` em /app).
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "backend/.env"),
        extra="ignore",
    )

    PROJECT_NAME: str = "UniCare API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Obrigatorio: sem valor default, ausencia de DATABASE_URL no ambiente ou no
    # .env falha na importacao com ValidationError explicito. O banco e o
    # PostgreSQL dockerizado (docker-compose.yml, servico `db`); antes havia um
    # fallback para um arquivo local, que criava um banco paralelo sem nenhum
    # aviso — a mesma divergencia que a Alembic veio eliminar.
    DATABASE_URL: str
    SECRET_KEY: str = "unicare_super_secret_jwt_key_uninassau_2026"  # APENAS fallback: defina via .env em qualquer ambiente real
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Origens liberadas no CORS, separadas por virgula. Antes o main.py usava
    # "*" junto de allow_credentials=True, o que fazia o Starlette refletir
    # qualquer origin e deixava a allowlist como codigo morto. Nao ha "*" aqui:
    # origin fora da lista e barrada, e a correcao e adicionar a origem no .env.
    # 5174 entra porque o Vite cai para essa porta quando a 5173 esta ocupada.
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origem.strip() for origem in self.CORS_ORIGINS.split(",") if origem.strip()]


settings = Settings()
