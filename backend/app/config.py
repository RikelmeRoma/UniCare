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

    # --- Envio de e-mail (recuperação de senha) ---
    #
    # TODAS opcionais, com padrão vazio. É o contrário de `DATABASE_URL`: lá a
    # ausência tem que falhar alto para não nascer um banco paralelo em silêncio;
    # aqui a ausência só significa "recuperação por e-mail indisponível", e a
    # tela diz isso explicitamente em vez de fingir que enviou.
    #
    # A troca de provedor (Gmail, Outlook, servidor institucional) é só mudança
    # neste arquivo — nenhum código muda. A única exceção a prometer é Office 365
    # com autenticação básica desabilitada, que exigiria OAuth2; ver AGENTS.md.
    MAIL_HOST: str = ""
    MAIL_PORT: int = 587
    MAIL_USER: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    # 587 usa STARTTLS. 465 usaria TLS implícito e precisaria de outro caminho
    # no email_service; enquanto o projeto falar só com 587, o valor fixo aqui é
    # o que mantém o serviço simples.
    MAIL_TLS: bool = True
    # Timeout curto de propósito: a recuperação é síncrona na request e não pode
    # segurar a conexão do usuário por um SMTP travado.
    MAIL_TIMEOUT_SEGUNDOS: int = 10

    # Validade do token de recuperação. Curto por princípio: um código de
    # recuperação é um segredo de uso único, não uma credencial de sessão.
    TOKEN_RECUPERACAO_MINUTOS: int = 15

    @property
    def mail_configurado(self) -> bool:
        """E-mail só é considerado configurado com host, usuário, senha e remetente.

        Sem a checagem do remetente, um envio sairia com `From:` vazio ou
        inventado — o servidor SMTP rejeitaria e o erro chegaria como "falha
        genérica", escondendo que o problema é configuração incompleta.
        """
        return bool(self.MAIL_HOST and self.MAIL_USER and self.MAIL_PASSWORD and self.MAIL_FROM)


settings = Settings()
