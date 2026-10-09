from sqlmodel import create_engine, Session
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    # pool_pre_ping descarta conexões mortas quando o container do Postgres reinicia,
    # evitando OperationalError na primeira requisição após o restart.
    pool_pre_ping=True,
    pool_size=5,
    pool_recycle=1800,
)

def get_session():
    with Session(engine) as session:
        yield session
