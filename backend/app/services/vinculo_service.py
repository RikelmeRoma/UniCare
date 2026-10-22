from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
from app.models.paciente import Paciente
from app.models.usuario import PerfilUsuario, Usuario

# Motivo gravado quando a troca de responsável vem de um agendamento e não de
# alguém digitando no painel de atribuição. A linha antiga continua existindo
# como SUBSTITUIDA, com data — é o registro de que houve troca, e responde
# "quem era o responsável quando".
MOTIVO_TROCA_POR_AGENDAMENTO = "Agendamento criado pela recepção"

# Auditoria: qual ação foi registrada quando o vínculo mudou durante o
# agendamento. None quando nada mudou.
ACAO_ATRIBUICAO = "ATRIBUICAO_PACIENTE"
ACAO_TROCA = "TROCA_ATRIBUICAO"


def paciente_da_clinica(session: Session, paciente_id: int, curso: str) -> Paciente:
    """Paciente que existe e pertence à clínica informada.

    `ambos` pertence às duas clínicas, então um paciente de clínica dupla é
    vinculável na psicologia — é a exceção legítima, diferente do agendamento
    (que tem cadeira fixa e por isso nunca é `ambos`).
    """
    paciente = session.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Paciente não localizado."
        )
    if paciente.curso not in (curso, "ambos"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Clínica restrita: o paciente pertence a {paciente.curso} e não "
                f"pode ser vinculado em {curso}."
            ),
        )
    return paciente


def exigir_estagiario_da_clinica(
    session: Session, matricula: str, nome: str, curso: str
) -> Usuario:
    """Confere que a matrícula existe, é de estagiário e é da clínica.

    Sem isso a recepção digitaria uma matrícula inventada e o vínculo nasceria
    apontando para alguém que não existe — o mesmo furo que a matricula fixa do
    modal de agendamento tinha.
    """
    estagiario = session.exec(
        select(Usuario).where(Usuario.matricula == matricula.strip().upper())
    ).first()
    if not estagiario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum usuário com a matrícula {matricula}.",
        )
    if estagiario.perfil != PerfilUsuario.ESTAGIARIO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{matricula} é {estagiario.perfil.value}, não estagiário. O "
                "vínculo é entre paciente e estagiário responsável."
            ),
        )
    if estagiario.curso != curso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{matricula} é de {estagiario.curso} e não pode receber pacientes "
                f"de {curso}."
            ),
        )
    if not estagiario.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{matricula} está desativado e não pode receber pacientes.",
        )
    return estagiario


def vinculo_ativo(
    session: Session, paciente_id: int, curso: str
) -> Optional[AtribuicaoClinica]:
    """Linha ATIVA do paciente na clínica, se houver."""
    return session.exec(
        select(AtribuicaoClinica).where(
            AtribuicaoClinica.paciente_id == paciente_id,
            AtribuicaoClinica.curso == curso,
            AtribuicaoClinica.situacao == SituacaoAtribuicao.ATIVA,
        )
    ).first()


def vincular_ou_transferir(
    session: Session,
    responsavel: Usuario,
    paciente_id: int,
    estagiario: Usuario,
    curso: str,
    motivo_troca: str = MOTIVO_TROCA_POR_AGENDAMENTO,
) -> Tuple[AtribuicaoClinica, Optional[str]]:
    """Deixa `estagiario` como responsável ativo de `paciente_id`.

    Um estagiário pode ter N pacientes — são N linhas, e nada aqui atrapalha.
    O limite é no outro lado: o paciente tem UM responsável ativo por vez, o que
    o índice único parcial `uq_atribuicao_ativa_por_paciente_clinica` garante.

    Devolve (vínculo, ação de auditoria). `ação` é None quando o responsável
    ativo já era esse e nada foi gravado.

    A linha antiga nunca é apagada: ela passa a SUBSTITUIDA com motivo e data.
    O prontuário guarda o autor no momento da escrita, então nenhum registro
    clínico é reescrito — a troca só muda para quem vale daqui em diante.

    Não faz commit: quem chama decide a fronteira da transação. No agendamento
    isso importa — o vínculo e a sessão precisam nascer juntos ou não nascer.
    """
    agora = datetime.now(timezone.utc)
    atual = vinculo_ativo(session, paciente_id, curso)

    if atual is not None and atual.estagiario_matricula == estagiario.matricula:
        return atual, None

    if atual is not None:
        atual.situacao = SituacaoAtribuicao.SUBSTITUIDA
        atual.motivo = motivo_troca.strip()
        atual.data_encerramento = agora
        session.add(atual)
        acao: Optional[str] = ACAO_TROCA
    else:
        acao = ACAO_ATRIBUICAO

    nova = AtribuicaoClinica(
        paciente_id=paciente_id,
        curso=curso,
        estagiario_nome=estagiario.nome,
        estagiario_matricula=estagiario.matricula,
        situacao=SituacaoAtribuicao.ATIVA,
        motivo=None,
        # O nome vem do cadastro, não do que a recepção digitou: duas fontes de
        # verdade para o mesmo campo é como nasce dado divergente.
        atribuido_por_nome=responsavel.nome,
        atribuido_por_matricula=responsavel.matricula,
        data_atribuicao=agora,
        criado_em=agora,
    )
    session.add(nova)
    # flush e não commit: popula o id para a auditoria e faz o índice único
    # parcial ser conferido agora, mas deixa quem chamou fechar a transação.
    session.flush()
    session.refresh(nova)
    return nova, acao
