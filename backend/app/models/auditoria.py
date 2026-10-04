from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class LogAuditoria(SQLModel, table=True):
    __tablename__ = "logs_auditoria"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(index=True)
    usuario_nome: str
    acao: str
    tabela_afetada: str
    registro_id: Optional[int] = None
    endereco_ip: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
