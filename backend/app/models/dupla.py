from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class DuplaOdonto(SQLModel, table=True):
    """Dupla clínica de estagiários de odontologia (PDR-05).

    A dupla é uma unidade de supervisão: o supervisor monta a dupla com dois
    alunos que já estão vinculados a ele, e a ficha/documento passa a apontar
    para essas duas matrículas. Guardar a dupla em tabela própria permite
    mostrá-la antes de existir ficha, que era o vazio da tela de supervisão.

    Uma dupla ativa por aluno é regra de aplicação, não de FK: o vínculo com
    `usuarios` é fraco por matrícula, como no resto do projeto. A troca de
    supervisor/matrícula ou a desativação do aluno encerra as duplas afetadas.
    """

    __tablename__ = "duplas_odonto"

    id: Optional[int] = Field(default=None, primary_key=True)
    operador_matricula: str = Field(max_length=32, index=True)
    auxiliar_matricula: str = Field(max_length=32, index=True)
    supervisor_matricula: str = Field(max_length=32, index=True)
    ativo: bool = Field(default=True)
    criado_por_matricula: str = Field(max_length=32)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    desativado_em: Optional[datetime] = Field(default=None)
