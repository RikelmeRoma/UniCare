"""Dados de demonstracao (seed) do UniCare.

Extraido do lifespan de app/main.py, que ocupava 197 das 266 linhas do arquivo.

A ordem entre as funcoes nao e decorativa: agendamentos e prontuarios referenciam
`paciente_id`, uma chave estrangeira real no PostgreSQL. O commit + refresh dos
pacientes precisa acontecer antes de qualquer agendamento, senao o INSERT viola a
FK.
"""
from datetime import date, datetime, timedelta, timezone
from typing import List

from sqlmodel import Session, select

from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.models.paciente import Paciente
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.anamnese import Anamnese
from app.models.solicitacao import SolicitacaoCadastro, SituacaoSolicitacao
from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
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
            matricula="16032935",
            supervisor_matricula="DOC-8821",
        ),
        Usuario(
            # Segundo estagiário de psicologia. Sem ele a transferência de
            # paciente não tem para quem ir: a fila do vínculo precisa de duas
            # pontas para demonstrar a troca, e a tela de supervisão psi
            # mostrava só um cartão de estagiário.
            #
            # Matrícula 16051234 e não 17031122: esse número já é o de um
            # pedido pendente na fila da RT (seed_solicitacoes). Aprovar aquele
            # pedido depois criaria um usuário com matrícula repetida e a
            # unicidade do banco derrubaria a aprovação.
            nome="Letícia Barbosa Monteiro",
            email="leticia.barbosa@prof.uninassau.edu.br",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="16051234",
            supervisor_matricula="DOC-8821",
        ),
        Usuario(
            nome="Augusto Cesar Farias Carvalho",
            email="augustocsar97@gmail.com",
            senha_hash=get_password_hash(SENHA_DEMO),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="16024402",
            supervisor_matricula="DOC-9122",
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

    # Menor de idade que atende nas DUAS clínicas. Sem ele, a sinalização de
    # menor (eh_menor) só aparecia em odontologia, e a psicologia — que também
    # atende adolescente — ficava sem nenhum caso no seed. Fica como "ambos"
    # para que as duas clínicas continuem com contagens diferentes de
    # pacientes; o teste de segregação depende dessa desigualdade.
    p5 = Paciente(
        nome="Ana Beatriz Nogueira",
        cpf_rg="455.902.338-14",
        data_nascimento="2010-11-03",
        telefone="(79) 99640-7788",
        eh_menor=True,
        nome_responsavel="Patrícia Nogueira (Mãe)",
        contato_responsavel="(79) 99640-7788",
        curso="ambos"
    )

    session.add_all([p1, p2, p3, p4, p5])
    session.commit()

    for p in (p1, p2, p3, p4, p5):
        session.refresh(p)

    return [p1, p2, p3, p4, p5]


def seed_agendamentos(session: Session, pacientes: List[Paciente]) -> None:
    """Agendamentos das duas clinicas (RF-002)."""
    if not _tabela_vazia(session, Agendamento) or len(pacientes) < 4:
        return

    # [:4] porque seed_pacientes devolve 5 (o quinto é a menor de idade das duas
    # clínicas). O desempacotamento fixo quebrava com ValueError e derrubava o
    # lifespan inteiro — 69 testes de erro por um unpacking.
    p1, p2, p3, p4 = pacientes[:4]

    # Datas relativas a hoje, e nao fixas: e o que faz a agenda abrir com
    # sentido. Sessao de ontem que ficou CONCLUIDO, de hoje que esta PRESENTE e
    # de semana que vem que esta AGENDADO -- o filtro por data e o cartao de
    # absenteismo so demonstram alguma coisa com isso.
    hoje = date.today()

    session.add_all([
        Agendamento(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            curso="psicologia",
            data_sessao=hoje,
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
            # Era "João Kaio Rodrigues / 16031730", que não existe em
            # seed_usuarios: o agendamento aparecia sem nenhum operador que
            # pudesse theoretical abrir.
            #
            # Letícia (16051234) e não Rikelme: `seed_atribuicoes` vincula esta
            # paciente a ela, e as duas telas que o vínculo alimenta discordam
            # quando a sessão aponta para outro — o aluno via a sessão sem ter a
            # paciente na lista, e a paciente aparecia sem nenhuma sessão.
            estagiario_nome="Letícia Barbosa Monteiro",
            estagiario_matricula="16051234",
            curso="psicologia",
            data_sessao=hoje + timedelta(days=2),
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
            data_sessao=hoje,
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
            # "Marlon Bruno dos Santos / 16032601" também não existe no seed.
            estagiario_nome="Augusto Cesar Farias & Gabriela Prado",
            estagiario_matricula="16024402",
            curso="odontologia",
            data_sessao=hoje + timedelta(days=2),
            horario="15:30",
            turno="tarde",
            sala_ou_cadeira="Cadeira Odonto 02 (Odontopediatria)",
            tipo_consulta="Aplicação de Selante Dente 16",
            status=StatusAgendamento.AGENDADO,
            observacao_logistica="Acompanhado pela responsável legal"
        ),
        # Status que faltavam no seed. Sem eles, os cartões de taxa de
        # absenteísmo (odontologia) e de cancelamentos (psicologia) abriam em
        # zero vindo do banco — número real, mas que não demonstrava nada.
        Agendamento(
            paciente_id=p3.id,
            paciente_nome=p3.nome,
            estagiario_nome="Letícia Barbosa Monteiro",
            estagiario_matricula="16051234",
            curso="psicologia",
            data_sessao=hoje - timedelta(days=3),
            horario="16:00",
            turno="tarde",
            sala_ou_cadeira="Consultório SPA-01",
            tipo_consulta="Sessão de acolhimento inicial",
            status=StatusAgendamento.CANCELADO,
            observacao_logistica="Remarcada a pedido do paciente"
        ),
        Agendamento(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            curso="psicologia",
            data_sessao=hoje - timedelta(days=7),
            horario="10:00",
            turno="manha",
            sala_ou_cadeira="Consultório SPA-03",
            tipo_consulta="Psicoterapia Cognitivo-Comportamental",
            status=StatusAgendamento.CONCLUIDO,
            observacao_logistica="Sessão concluída e registrada"
        ),
        Agendamento(
            paciente_id=p2.id,
            paciente_nome=p2.nome,
            estagiario_nome="Augusto Cesar Farias & Gabriela Prado",
            estagiario_matricula="16024402",
            curso="odontologia",
            data_sessao=hoje - timedelta(days=7),
            horario="09:00",
            turno="manha",
            sala_ou_cadeira="Cadeira Odonto 07",
            tipo_consulta="Profilaxia e Higienização",
            status=StatusAgendamento.FALTOU,
            observacao_logistica="Falta registrada na recepção"
        ),
        # Falta em psicologia. A recepção de psi ganhou o cartão de taxa de
        # absenteísmo, e sem nenhuma sessão com FALTOU ele abriria em 0.0% —
        # número verdadeiro, mas que não demonstra nada. Odontologia já tinha.
        Agendamento(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            curso="psicologia",
            data_sessao=hoje - timedelta(days=2),
            horario="11:00",
            turno="manha",
            sala_ou_cadeira="Consultório SPA-05",
            tipo_consulta="Acompanhamento Psicológico de Ansiedade",
            status=StatusAgendamento.FALTOU,
            observacao_logistica="Falta registrada na recepção após contato sem sucesso"
        ),
    ])
    session.commit()



def seed_prontuarios(session: Session, pacientes: List[Paciente]) -> None:
    """Sintezes clinicas conforme CFP 06/2019 — sem falas literais (RN-002)."""
    if not _tabela_vazia(session, ProntuarioPsico) or len(pacientes) < 4:
        return

    p1, _p2, p3, _p4 = pacientes[:4]

    session.add_all([
        ProntuarioPsico(
            paciente_id=p1.id,
            paciente_nome=p1.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            supervisor_nome="Prof. Dr. Robert Santos do Carmo",
            data_sessao="15/09/2026",
            numero_sessao="Sessão 04",
            redacao_texto="Acolhimento pontual e receptivo. Paciente relata persistência dos gatilhos de sobrecarga com avaliações acadêmicas. Aplicação da técnica de questionamento socrático sobre catastrofização. Paciente identificou padrões de autoexigência com flexibilização cognitiva orientada. Pactuado automonitoramento diário de pensamentos disfuncionais (RPD). Sem risco autolesivo ou queixas agudas.",


            status=StatusProntuario.AGUARDANDO_VALIDACAO
        ),
        ProntuarioPsico(
            paciente_id=p3.id,
            paciente_nome=p3.nome,
            # Era "João Kaio Rodrigues / 16031730", que **não existe em
            # seed_usuarios**. Com a segregação de prontuarios.py, o estagiário
            # 16032935 via só 1 dos 2 registros do seed — e o segundo era
            # invisível para qualquer login real.
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            supervisor_nome="Prof. Dr. Robert Santos do Carmo",
            data_sessao="14/09/2026",
            numero_sessao="Sessão 02",
            redacao_texto="Sessão iniciada no horário. Acolhimento e validação dos sentimentos relativos à escolha profissional. Aplicação da primeira bateria do questionário de interesses ocupacionais. Boa compreensão das instruções e colaboração ativa. Encerramento com agendamento da aplicação da escala complementar na sessão seguinte.",


            parecer_supervisor="Excelente condução técnica e síntese clínica sem transcrições literais. Aprovado com visto digital.",
            status=StatusProntuario.VALIDADO
        ),
        # Devolução: sem um DEVOLVIDO no seed da psicologia, o caminho de
        # devolução — corrigido no Bloco 8/Fatia B, quando o badge dizia
        # "Homologado" numa evolução devolvida — nunca era exercitado por seed.
        ProntuarioPsico(
            paciente_id=p3.id,
            paciente_nome=p3.nome,
            estagiario_nome="Rikelme Roma Santos",
            estagiario_matricula="16032935",
            supervisor_nome="Prof. Dr. Robert Santos do Carmo",
            data_sessao="17/09/2026",
            numero_sessao="Sessão 06",
            redacao_texto="Retomada da sessão. Acolhimento dedicado ao feedback da devolutiva anterior. Trabalho em torno do registro de pensamentos automáticos, com pausa para checagem de compreensão. Sessão suspensa antes do fechamento: falta registrar o material utilizado e pactuar o retorno.",


            parecer_supervisor="Síntese interrompida antes do fechamento. Completar o registro de materiais e reenviar.",
            status=StatusProntuario.DEVOLVIDO_PARA_AJUSTE
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

    _p1, p2, p3, _p4 = pacientes[:4]
    # Unico estagiario de odontologia do seed (16024402). Nao existe segundo
    # aluno da clinica para compor a dupla na demonstracao, entao o auxiliar
    # fica nulo em vez de inventar um nome. Criar um usuario extra so para isso
    # deslocaria contagens que a suite assume. O texto da dupla usa o nome real
    # do cadastro, e nao nomes digitados.
    dupla = "Augusto Cesar Farias Carvalho"
    operador = "16024402"
    supervisora = "Profa. Dra. Bianca Nubia"

    session.add_all([
        FichaOdonto(
            paciente_id=p2.id,
            dupla_estagiarios=dupla,
            operador_matricula=operador,
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
            operador_matricula=operador,
            dente_regiao="Dente 16 - primeiro molar superior direito",
            procedimento_realizado="Restauracao direta classe II, com matriz metalica e polimento final.",
            materiais_utilizados="Resina composta A3, matriz metalica, oxidador de estiramento.",
            anestesico="Lidocaina 2% 1:80.000 (infiltrativa)",
            alerta_alergia=None,
            parecer_supervisor="Preparo dentro dos limites do tecido saudo. Homologado com visto digital.",
            supervisor_nome=supervisora,
            status=StatusProntuario.VALIDADO
        ),
        FichaOdonto(
            paciente_id=p2.id,
            dupla_estagiarios=dupla,
            operador_matricula=operador,
            dente_regiao="Dente 46 - primeiro molar inferior direito",
            procedimento_realizado="Preparo cavitario classe I. Devolvido para ajuste da documentacao clinica.",
            materiais_utilizados="Resina composta A3.",
            parecer_supervisor="Documentacao clinica incompleta: refazer o registro do procedimento.",
            supervisor_nome=supervisora,
            status=StatusProntuario.DEVOLVIDO_PARA_AJUSTE
        ),
        # Paciente de curso "ambos": a ficha aparece nas DUAS clinicas, e por
        # isso a listagem da odontologia precisa trazê-la.
        FichaOdonto(
            paciente_id=p3.id,
            dupla_estagiarios=dupla,
            operador_matricula=operador,
            dente_regiao="Dente 26 - primeiro molar superior esquerdo",
            procedimento_realizado="Selante de fossas oclusais e mamelares, sem necessidade de restauracao.",
            materiais_utilizados="Selante hidrofílico, ácido grabador, microbrush.",
            anestesico="Nao funcional",
            alerta_alergia="Nenhuma alergia registrada em anamnese",
            status=StatusProntuario.AGUARDANDO_VALIDACAO
        ),
    ])
    session.commit()


def seed_atribuicoes(session: Session, pacientes: List[Paciente]) -> None:
    """Vinculo paciente-estagiario da psicologia (RF-001).

    O estagiario so escreve de paciente ativo em seu nome, entao sem esta etapa
    o seed deixa os dois estagiarios de psicologia sem nenhum paciente e a tela
    do prontuario abre vazia para todo mundo.

    Os pacientes de psicologia vao para o Rikelme, exceto um, que ja entra com a
    Leticia: e o que da para demonstrate a transferencia sem ter que montar o
    cenario na mao.
    """
    if not _tabela_vazia(session, AtribuicaoClinica) or len(pacientes) < 4:
        return

    recepcao = session.exec(
        select(Usuario).where(Usuario.matricula == "REC-002")
    ).first()
    # Atribuicao por nome e matricula da recepcao: quem vincula fica registrado
    # como quem vinculou. Ausente so na importacao direta de um seed avulso.
    por_nome = recepcao.nome if recepcao else "Recepção do Serviço de Psicologia"
    por_matricula = recepcao.matricula if recepcao else "REC-002"

    agora = datetime.now(timezone.utc)

    alvos = [
        (pacientes[0], "Rikelme Roma Santos", "16032935"),
        (pacientes[2], "Letícia Barbosa Monteiro", "16051234"),
    ]
    for paciente, nome, matricula in alvos:
        if paciente.curso not in ("psicologia", "ambos"):
            continue
        session.add(
            AtribuicaoClinica(
                paciente_id=paciente.id,
                curso="psicologia",
                estagiario_nome=nome,
                estagiario_matricula=matricula,
                situacao=SituacaoAtribuicao.ATIVA,
                motivo=None,
                atribuido_por_nome=por_nome,
                atribuido_por_matricula=por_matricula,
                data_atribuicao=agora,
                criado_em=agora,
            )
        )
    session.commit()



def seed_solicitacoes(session: Session) -> None:
    """Um pedido de credencial pendente por clínica.

    Sem isso a fila da RT nasce vazia e a seção "Solicitações de credencial" do
    painel da RT parece quebrada em vez de vazia. São pedidos de demonstração:
    a pessoa não existe como usuário, porque conta só nasce na aprovação.
    """
    if not _tabela_vazia(session, SolicitacaoCadastro):
        return

    session.add_all([
        SolicitacaoCadastro(
            nome="Letícia Barbosa Nascimento",
            email="leticia.barbosa@prof.uninassau.edu.br",
            matricula="17031122",
            telefone="(79) 98844-1122",
            curso_declarado="psicologia",
            perfil_declarado=PerfilUsuario.ESTAGIARIO,
            situacao=SituacaoSolicitacao.PENDENTE,
        ),
        SolicitacaoCadastro(
            nome="Thiago Menezes de Sá",
            email="thiago.menezes@uninassau.edu.br",
            matricula="17042233",
            telefone="(79) 98777-3344",
            curso_declarado="odontologia",
            perfil_declarado=PerfilUsuario.ESTAGIARIO,
            situacao=SituacaoSolicitacao.PENDENTE,
        ),
    ])
    session.commit()


def seed_anamneses(session: Session, pacientes: List[Paciente]) -> None:
    """Aferições de sinais vitais e anamnese dos pacientes de odontologia.

Só a ficha odontológica mostra anamnese (decisão do produto): a de psicologia é
composta por evolução de sessão e linha do tempo, sem sinais vitais. O paciente
de curso "ambos" aparece aqui porque é visto pela odontologia — a anamnese é dado
do paciente, não da clínica, e ele tem uma só.

Sem isso a aba de odontologia nasce mostrando "Não registrado" em tudo, e a tela
parece quebrada em vez de vazia. É dado de demonstração: a autoria vem do token de
quem afere em uso real, aqui é o estagiário do seed.
"""
    if not _tabela_vazia(session, Anamnese) or len(pacientes) < 4:
        return

    p2, p3, _p4 = pacientes[1], pacientes[2], pacientes[3]

    session.add_all([
        # Paciente de odontologia: só os sinais, sem alerta clínico.
        Anamnese(
            paciente_id=p2.id,
            pressao_arterial="120/80",
            glicemia_capilar=91,
            frequencia_cardiaca=72,
            temperatura=36.4,
            responsavel_nome="Augusto Cesar Farias Carvalho",
            responsavel_matricula="16024402",
        ),
        # Paciente de curso "ambos": duas aferições, para a ficha mostrar
        # histórico e não só a última.
        Anamnese(
            paciente_id=p3.id,
            pressao_arterial="122/78",
            frequencia_cardiaca=75,
            temperatura=36.5,
            responsavel_nome="Rikelme Roma Santos",
            responsavel_matricula="16032935",
        ),
        Anamnese(
            paciente_id=p3.id,
            pressao_arterial="118/76",
            glicemia_capilar=88,
            responsavel_nome="Augusto Cesar Farias Carvalho",
            responsavel_matricula="16024402",
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
    seed_anamneses(session, pacientes)
    seed_atribuicoes(session, pacientes)
    seed_solicitacoes(session)
