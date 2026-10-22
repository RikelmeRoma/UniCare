from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.atribuicao import SituacaoAtribuicao


class AtribuicaoCreate(BaseModel):
    """Vínculo pedido pela recepção.

    `estagiario_nome` e `estagiario_matricula` vêm juntos porque a tela escolhe
    uma pessoa da lista, não digita. A matrícula é a chave: o nome é
    desnormalizado para exibição, igual `prontuarios` faz com o paciente.
    """

    paciente_id: int
    estagiario_nome: str
    estagiario_matricula: str

    @field_validator("estagiario_nome", "estagiario_matricula")
    @classmethod
    def validar_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O estagiário responsável é obrigatório.")
        return v.strip()


class TransferenciaRequest(BaseModel):
    """Troca do estagiário responsável por um paciente.

    O motivo é obrigatório: é a justificativa pedagógica que fica no histórico
    da linha encerrada. Transferência sem motivo é troca silenciosa, que é
    exatamente o que o registro de custódia precisa impedir.
    """

    estagiario_nome: str
    estagiario_matricula: str
    motivo: str

    @field_validator("motivo")
    @classmethod
    def validar_motivo(cls, v: str) -> str:
        texto = v.strip()
        if not texto:
            raise ValueError(
                "O motivo da transferência é obrigatório: é ele que fica no "
                "histórico de quem esteve com o paciente."
            )
        return texto

    @field_validator("estagiario_nome", "estagiario_matricula")
    @classmethod
    def validar_nao_vazio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("O estagiário responsável é obrigatório.")
        return v.strip()


class AtribuicaoRead(BaseModel):
    id: int
    paciente_id: int
    paciente_nome: str = ""
    curso: str
    estagiario_nome: str
    estagiario_matricula: str
    situacao: str
    motivo: Optional[str] = None
    atribuido_por_nome: str
    atribuido_por_matricula: str
    data_atribuicao: datetime
    data_encerramento: Optional[datetime] = None