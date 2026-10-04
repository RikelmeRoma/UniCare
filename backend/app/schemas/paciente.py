from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PacienteCreate(BaseModel):
    nome: str
    cpf_rg: str
    data_nascimento: str
    telefone: str
    eh_menor: bool = False
    nome_responsavel: Optional[str] = None
    contato_responsavel: Optional[str] = None
    curso: str = "odontologia"

class PacienteRead(BaseModel):
    id: int
    nome: str
    cpf_rg: str
    data_nascimento: str
    telefone: str
    eh_menor: bool
    nome_responsavel: Optional[str] = None
    contato_responsavel: Optional[str] = None
    curso: str
    prontuario_ativo: bool
    criado_em: datetime
