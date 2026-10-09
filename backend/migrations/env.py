from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from sqlmodel import SQLModel

# Importar o pacote de models popula SQLModel.metadata com todas as tabelas.
# Sem este import o metadata chega vazio ao autogenerate e nenhuma revision e
# produzida.
from app import models  # noqa: F401
from app.config import settings

# Config object do Alembic, com acesso aos valores do alembic.ini
config = context.config

# Interpreta o arquivo de configuracao para o logging do Python
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# A URL vem do settings (fonte unica de verdade: .env), e nao do alembic.ini.
# O escape de "%" e necessario porque o alembic.ini usa interpolacao do
# ConfigParser e uma senha com "%" seria interpretada como placeholder.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Executa as migracoes em modo 'offline', emitting apenas o SQL."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Executa as migracoes em modo 'online', com Engine e conexao reais."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Sem compare_type, alteracoes de tipo (ex.: str -> Text) nao sao detectadas
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()