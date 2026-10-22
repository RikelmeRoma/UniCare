from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel

class LogAuditoriaRead(SQLModel):
    id: int
    usuario_id: int
    usuario_nome: str
    acao: str
    tabela_afetada: str
    registro_id: Optional[int] = None
    curso: str
    endereco_ip: Optional[str] = None
    timestamp: datetime
