import re
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime


def _somente_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor)


def _formatar_cpf(digitos: str) -> str:
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"


class PacienteCreate(BaseModel):
    nome: str
    cpf_rg: str
    data_nascimento: str
    telefone: str
    endereco: Optional[str] = Field(default=None, max_length=200)
    numero: Optional[str] = Field(default=None, max_length=20)
    complemento: Optional[str] = Field(default=None, max_length=100)
    eh_menor: bool = False
    nome_responsavel: Optional[str] = None
    contato_responsavel: Optional[str] = None
    curso: str = "odontologia"

    @model_validator(mode="after")
    def validar_cadastro_da_psicologia(self):
        if self.curso != "psicologia":
            return self

        cpf = _somente_digitos(self.cpf_rg)
        if len(cpf) != 11:
            raise ValueError("CPF deve conter exatamente 11 dígitos.")
        self.cpf_rg = _formatar_cpf(cpf)

        endereco = (self.endereco or "").strip()
        numero = (self.numero or "").strip()
        if not endereco:
            raise ValueError("Endereço é obrigatório no cadastro de psicologia.")
        if not numero:
            raise ValueError("Número do endereço é obrigatório no cadastro de psicologia.")
        self.endereco = endereco
        self.numero = numero

        if self.complemento is not None:
            self.complemento = self.complemento.strip() or None
        return self


class PacienteRead(BaseModel):
    id: int
    nome: str
    cpf_rg: str
    data_nascimento: str
    telefone: str
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    eh_menor: bool
    nome_responsavel: Optional[str] = None
    contato_responsavel: Optional[str] = None
    curso: str
    prontuario_ativo: bool
    criado_em: datetime
