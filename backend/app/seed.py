"""Dados de demonstracao (seed) do UniCare.

Extraido do lifespan de app/main.py, que ocupava 197 das 266 linhas do arquivo.

A ordem entre as funcoes nao e decorativa: agendamentos e prontuarios referenciam
`paciente_id`, uma chave estrangeira real no PostgreSQL. O commit + refresh dos
pacientes precisa acontecer antes de qualquer agendamento, senao o INSERT viola a
FK.
"""
from typing import List

from sqlmodel import Session, select

from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.models.paciente import Paciente
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.demanda import DemandaEstagio, StatusDemanda, PrioridadeDemanda
from app.services.crypto_service import get_password_hash

SENHA_DEMO = "unicare123"


def _tabela_vazia(session: Session, model) -> bool:
    return session.exec(select(model)).first() is None


def seed_usuarios(session: Session) -> None:
    """Perfis institucionais (RN-001, RN-003, RN-004)."""
    if not _tabela_vazia(session, Usuario):
        return

    session.add_all([
        Usuario(
            nome="Rikelme Roma Santos",
            email="rikelmeroma13@gmail.com",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="16032935"
        ),
        Usuario(
            nome="Augusto Cesar Farias Carvalho",
            email="augustocsar97@gmail.com",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="16024402"
        ),
        Usuario(
            nome="Prof. Dr. Robert Santos do Carmo",
            email="robert.carmo@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.SUPERVISOR,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="DOC-8821",
            registro_profissional="CRP 19/0844"
        ),
        Usuario(
            nome="Profa. Dra. Bianca Nubia",
            email="bianca.silva@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.SUPERVISOR,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="DOC-9122",
            registro_profissional="CRO-SE 4512"
        ),
        Usuario(
            nome="Recepção Integrada Odontologia",
            email="recepcao@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.RECEPCAO,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="REC-001"
        ),
        Usuario(
            # Recepcao tambem e por clinica: uma conta nao concilia a agenda das
            # duas. Sem acesso clinico (RN-001), mas so enxerga a propria.
            nome="Recepção do Serviço de Psicologia Aplicada",
            email="recepcao.psi@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.RECEPCAO,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="REC-002"
        ),
        Usuario(
            nome="Dra. Camila (RT Odontologia)",
            email="camila.rt@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.RT,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="RT-001",
            registro_profissional="RT-ODONTO"
        ),
        # A Referência Técnica é institucional por SALVAGUARDA de role (RN-003),
        # mas o escopo de dados é o próprio curso: cada RT tem visão panorâmica
        # apenas da clínica sob sua responsabilidade.
        Usuario(
            nome="Dr. Renato (RT Psicologia)",
            email="renato.rt@uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.RT,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="RT-002",
            registro_profissional="RT-PSICO"
        ),
    ])
    session.commit()


def seed_pacientes(session: Session) -> List[Paciente]:
    """Pacientes academicos, incluindo um menor de idade (RF-007, RN-004).

    Retorna os pacientes criados, porque agendamentos e prontuarios dependem dos
    ids gerados pelo banco.
    """
    if not _tabela_vazia(session, Paciente):
        return session.exec(select(Paciente)).all()

    p1 = Paciente(
        nome="Marcos Aurélio Silveira",
        cpf_rg="048.291.545-88",
        data_nascimento="1998-08-14",
        telefone="(79) 99841-2299",
        eh_menor=False,
        curso="psicologia"
    )
    p2 = Paciente(
        nome="Carlos Silva e Santos",
        cpf_rg="123.456.789-00",
        data_nascimento="1984-05-12",
        telefone="(79) 98821-3312",
        eh_menor=False,
        curso="odontologia"
    )
    p3 = Paciente(
        nome="Juliana Ferreira Oliveira",
        cpf_rg="789.123.456-11",
        data_nascimento="2003-11-20",
        telefone="(79) 99122-4455",
        eh_menor=False,
        curso="ambos"
    )
    p4 = Paciente(
        nome="Lucas Gabriel Menezes (Menor)",
        cpf_rg="882.114.992-30",
        data_nascimento="2016-04-10",
        telefone="(79) 98711-0022",
        eh_menor=True,
        nome_responsavel="Mariana Menezes (Mãe)",
        contato_responsavel="(79) 98711-0022",
        curso="odontologia"
    )

    session.add_all([p1, p2, p3, p4])
    session.commit()

    for p in (p1, p2, p3, p4):
        session.refresh(p)

    return [p1, p2, p3, p4]


def seed_agendamentos(session: Session, pacientes: List[Paciente]) -> None:
    """Agendamentos das duas clinicas (RF-002)."""
    if not _tabela_vazia(session, Agendamento) or len(pacientes) < 4:
        return

    p1, p2, p3, p4 = pacientes

    session.add_all([
        Agendamento(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            curso="psicologia",
            horario="14:00",
            turno="tarde",
            sala_ou_cadeira="Consultório SPA-02",
            tipo_consulta="Psicoterapia Cognitivo-Comportamental",
            status=StatusAgendamento.PRESENTE,
            observacao_logistica="Aguardando na recepção pontual"
        ),
        Agendamento(
            paciente_id=p3.id,
            paciente_nome=p3.nome,
            estagiario_nome="João Kaio Rodrigues",
            estagiario_matricula="16031730",
            curso="psicologia",
            horario="15:00",
            turno="tarde",
            sala_ou_cadeira="Consultório SPA-04",
            tipo_consulta="Avaliação Psicológica Vocacional",
            status=StatusAgendamento.AGENDADO,
            observacao_logistica="Confirmou presença por WhatsApp"
        ),
        Agendamento(
            paciente_id=p2.id,
            paciente_nome=p2.nome,
            estagiario_nome="Augusto Cesar Farias & Gabriela Prado",
            estagiario_matricula="16024402",
            curso="odontologia",
            horario="14:00",
            turno="tarde",
            sala_ou_cadeira="Cadeira Odonto 04",
            tipo_consulta="Restauração Resina Dente 36 (Classe II)",
            status=StatusAgendamento.EM_ATENDIMENTO,
            observacao_logistica="Alerta de Alergia a Penicilina conferido"
        ),
        Agendamento(
            paciente_id=p4.id,
            paciente_nome=p4.nome,
            estagiario_nome="Marlon Bruno dos Santos",
            estagiario_matricula="16032601",
            curso="odontologia",
            horario="15:30",
            turno="tarde",
            sala_ou_cadeira="Cadeira Odonto 02 (Odontopediatria)",
            tipo_consulta="Aplicação de Selante Dente 16",
            status=StatusAgendamento.AGENDADO,
            observacao_logistica="Acompanhado pela responsável legal"
        ),
    ])
    session.commit()


def seed_prontuarios(session: Session, pacientes: List[Paciente]) -> None:
    """Sintezes clinicas conforme CFP 06/2019 — sem falas literais (RN-002)."""
    if not _tabela_vazia(session, ProntuarioPsico) or len(pacientes) < 4:
        return

    p1, _p2, p3, _p4 = pacientes

    session.add_all([
        ProntuarioPsico(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            supervisor_nome="Prof. Dr. Robert Santos do Carmo",
            data_sessao="15/09/2026",
            numero_sessao="Sessão 04",
            inicio_sessao_texto="Acolhimento pontual e receptivo. Paciente relata persistência dos gatilhos de sobrecarga com avaliações acadêmicas.",
            meio_sessao_texto="Aplicação da técnica de questionamento socrático sobre catastrofização. Paciente identificou padrões de autoexigência com flexibilização cognitiva orientada.",
            fim_sessao_texto="Pactuado automonitoramento diário de pensamentos disfuncionais (RPD). Sem risco autolesivo ou queixas agudas.",
            status=StatusProntuario.AGUARDANDO_VALIDACAO
        ),
        ProntuarioPsico(
            paciente_id=p3.id,
            paciente_nome=p3.nome,
            estagiario_nome="João Kaio Rodrigues",
            estagiario_matricula="16031730",
            supervisor_nome="Prof. Dr. Robert Santos do Carmo",
            data_sessao="14/09/2026",
            numero_sessao="Sessão 02",
            inicio_sessao_texto="Sessão iniciada no horário. Acolhimento e validação dos sentimentos relativos à escolha profissional.",
            meio_sessao_texto="Aplicação da primeira bateria do questionário de interesses ocupacionais. Boa compreensão das instruções e colaboração ativa.",
            fim_sessao_texto="Encerramento com agendamento da aplicação da escala complementar na sessão seguinte.",
            parecer_supervisor="Excelente condução técnica e síntese clínica sem transcrições literais. Aprovado com visto digital.",
            status=StatusProntuario.VALIDADO
        ),
    ])
    session.commit()


def seed_fichas_odonto(session: Session, pacientes: List[Paciente]) -> None:
    """Fichas clinicas odontologicas para a fila de homologacao docente (RF-004).

    A tabela nascia vazia: o seed so criava prontuarios de psicologia, entao
    GET /prontuarios/odonto devolvia zero e a fila de homologacao odontologica
    nao tinha o que mostrar nem o que validar.
    """
    if not _tabela_vazia(session, FichaOdonto) or len(pacientes) < 4:
        return

    _p1, p2, p3, _p4 = pacientes
    dupla = "Lucas Vasconcelos & Gabriela Prado"

    session.add_all([
        FichaOdonto(
            paciente_id=p2.id,
            dupla_estagiarios=dupla,
            dente_regiao="Dente 36 - primeiro molar inferior esquerdo",
            procedimento_realizado="Restauracao direta em resina composta classe I, com preparo conservador e isolamento absoluto por dique de borracha.",
            materiais_utilizados="Resina composta A2, adesivo universal, matriz deinkgo e dique de borracha.",
            anestesico="Lidocaina 2% 1:100.000 (infiltrativa)",
            alerta_alergia="Nenhuma alergia registrada em anamnese",
            status=StatusProntuario.AGUARDANDO_VALIDACAO
        ),
        FichaOdonto(
            paciente_id=p2.id,
            dupla_estagiarios=dupla,
            dente_regiao="Dente 16 - primeiro molar superior direito",
            procedimento_realizado="Restauracao direta classe II, com matriz metalica e polimento final.",
            materiais_utilizados="Resina composta A3, matriz metalica, oxidador de estiramento.",
            anestesico="Lidocaina 2% 1:80.000 (infiltrativa)",
            alerta_alergia=None,
            parecer_supervisor="Preparo dentro dos limites do tecido saudo. Homologado com visto digital.",
            status=StatusProntuario.VALIDADO
        ),
        FichaOdonto(
            paciente_id=p2.id,
            dupla_estagiarios=dupla,
            dente_regiao="Dente 46 - primeiro molar inferior direito",
            procedimento_realizado="Preparo cavitario classe I. Devolvido para ajuste da documentacao clinica.",
            materiais_utilizados="Resina composta A3.",
            status=StatusProntuario.DEVOLVIDO_PARA_AJUSTE
        ),
        # Paciente de curso "ambos": a ficha aparece nas DUAS clinicas, e por
        # isso a listagem da odontologia precisa trazê-la.
        FichaOdonto(
            paciente_id=p3.id,
            dupla_estagiarios=dupla,
            dente_regiao="Dente 26 - primeiro molar superior esquerdo",
            procedimento_realizado="Selante de fossas oclusais e mamelares, sem necessidade de restauracao.",
            materiais_utilizados="Selante hidrofílico, ácido grabador, microbrush.",
            anestesico="Nao funcional",
            alerta_alergia="Nenhuma alergia registrada em anamnese",
            status=StatusProntuario.AGUARDANDO_VALIDACAO
        ),
    ])
    session.commit()


def seed_demandas(session: Session) -> None:
    """Fila de trabalho dos estagiarios (RF-009)."""
    if not _tabela_vazia(session, DemandaEstagio):
        return

    session.add_all([
        DemandaEstagio(
            aluno_nome="Augusto Cesar Farias",
            aluno_matricula="16024402",
            curso="odontologia",
            procedimento_desejado="1 paciente para raspagem supra e subgengival (Periodontia).",
            prioridade=PrioridadeDemanda.ALTA,
            data_solicitacao="15/09/2026",
            status=StatusDemanda.PENDENTE
        ),
        DemandaEstagio(
            aluno_nome="Rikelme Roma Santos",
            aluno_matricula="16032935",
            curso="psicologia",
            procedimento_desejado="1 paciente adulto para avaliação TCC (sessão inicial).",
            prioridade=PrioridadeDemanda.MEDIA,
            data_solicitacao="15/09/2026",
            status=StatusDemanda.PENDENTE
        ),
        DemandaEstagio(
            aluno_nome="Lucas Vasconcelos & Gabriela Prado",
            aluno_matricula="16024402",
            curso="odontologia",
            procedimento_desejado="1 paciente infantil para selante em dentes permanentes (Odontopediatria).",
            prioridade=PrioridadeDemanda.NORMAL,
            data_solicitacao="16/09/2026",
            status=StatusDemanda.PENDENTE
        ),
    ])
    session.commit()


def run_seed(session: Session) -> None:
    """Popula o banco de demonstracao. Idempotente por tabela.

    Chamado no lifespan da aplicacao e pelo fixture de testes. Cada etapa so
    roda se a tabela correspondente estiver vazia.
    """
    seed_usuarios(session)
    pacientes = seed_pacientes(session)
    seed_agendamentos(session, pacientes)
    seed_prontuarios(session, pacientes)
    seed_fichas_odonto(session, pacientes)
    seed_demandas(session)
