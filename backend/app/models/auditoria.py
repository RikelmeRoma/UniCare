from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class LogAuditoria(SQLModel, table=True):
    __tablename__ = "logs_auditoria"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(index=True)
    usuario_nome: str = Field(max_length=200)
    acao: str = Field(max_length=100)
    tabela_afetada: str = Field(max_length=64)
    registro_id: Optional[int] = None
    # Curso de quem praticou o ato. Sem esta coluna o log não é filtrável por
    # clínica: a tabela não tem curso próprio e o usuário autenticado é a única
    # fonte. Escritas são validadas contra o curso do usuário, então o curso do
    # autor é o da clínica afetada.
    curso: str = Field(index=True, max_length=20)
    endereco_ip: Optional[str] = Field(default=None, max_length=45)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
