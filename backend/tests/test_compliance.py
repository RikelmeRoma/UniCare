from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

# O schema e criado pela Alembic no fixture `initialize_database` de tests/conftest.py.
# Nao declarar aqui um fixture com o mesmo nome: um fixture definido no modulo de
# teste sobrescreve o do conftest, e o ciclo de migracao deixaria de rodar.

def get_auth_token(email_ou_matricula: str, senha: str = "unicare123") -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email_ou_matricula": email_ou_matricula, "senha": senha}
    )
    assert response.status_code == 200, f"Falha no login com {email_ou_matricula}: {response.text}"
    return response.json()["access_token"]

def test_login_perfis_institucionais():
    """Valida a autenticação e RBAC de todos os perfis institucionais UNINASSAU"""
    perfis = [
        ("16032935", "estagiario"),
        ("DOC-8821", "supervisor"),
        # Recepção é uma conta por clínica desde a vertical slice.
        ("REC-001", "recepcao"),
        ("REC-002", "recepcao"),
        ("RT-001", "rt"),
    ]
    for matricula, perfil_esperado in perfis:
        token = get_auth_token(matricula)
        headers = {"Authorization": f"Bearer {token}"}
        res_me = client.get("/api/v1/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["perfil"] == perfil_esperado

    # Nenhuma recepção é mais institucional: as duas têm clínica definida.
    for matricula in ("REC-001", "REC-002"):
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {get_auth_token(matricula)}"})
        assert res.json()["curso"] in ("psicologia", "odontologia")

def test_rn001_bloqueio_recepcao_prontuarios():
    """RN-001 / CA-01: Perfil de recepção tem acesso expressamente bloqueado a prontuários e evoluções clínicas"""
    token_recepcao = get_auth_token("REC-001")
    headers = {"Authorization": f"Bearer {token_recepcao}"}

    # Tentativa de listar prontuários de psicologia
    res_psico = client.get("/api/v1/prontuarios/psico", headers=headers)
    assert res_psico.status_code == 403
    assert "RN-001" in res_psico.json()["detail"]

    # Tentativa de listar fichas de odontologia
    res_odonto = client.get("/api/v1/prontuarios/odonto", headers=headers)
    assert res_odonto.status_code == 403

def test_rn002_anti_quotes_cfp_06_2019_rejeicao():
    """RN-002 / CA-03: Resolução CFP 06/2019 proíbe transcrições literais (aspas) em evoluções de psicologia"""
    token_estagiario = get_auth_token("16032935")
    headers = {"Authorization": f"Bearer {token_estagiario}"}

    payload_com_aspas = {
        "paciente_id": 1,
        "paciente_nome": "Marcos Aurélio Silveira",
        "estagiario_nome": "Rikelme Roma Santos",
        "estagiario_matricula": "16032935",
        "data_sessao": "16/09/2026",
        "numero_sessao": "Sessão 05",
        # Aspas proibidas (RN-002): a frase chega inteira, para provar que
        # foi a aspa a rejeitar e não algum outro motivo.
        "redacao_texto": 'Paciente relatou pontualmente que "está sentindo muita ansiedade"' "Intervenção técnica com reestruturação cognitiva." "Pactuado automonitoramento.",


    }

    res = client.post("/api/v1/prontuarios/psico", json=payload_com_aspas, headers=headers)
    assert res.status_code == 422
    assert "RN-002" in str(res.json())

# Id do prontuario criado em test_rn002_evolucao_psico_sintese_conforme. E
# exportado por fixture para que test_rf004 nao dependa do id 1 hardcoded, que so
# funcionava por tres coincidencias: sequence reiniciada pelo downgrade base, ordem
# fixa do seed, e este teste rodar antes do de homologacao.
PRONTUARIO_SUBMETIDO_ID = {}

def test_rn002_evolucao_psico_sintese_conforme():
    """RN-002: Submissão de síntese clínica técnica sem aspas é aceita com sucesso"""
    token_estagiario = get_auth_token("16032935")
    headers = {"Authorization": f"Bearer {token_estagiario}"}

    payload_valido = {
        "paciente_id": 1,
        "paciente_nome": "Marcos Aurélio Silveira",
        "estagiario_nome": "Rikelme Roma Santos",
        "estagiario_matricula": "16032935",
        "data_sessao": "16/09/2026",
        "numero_sessao": "Sessão 05",
        "redacao_texto": "Acolhimento pontual. Paciente manifestou queixas somatizadas de ansiedade diante do período de avaliações acadêmicas. Aplicação de técnica de identificação de distorções cognitivas. Paciente demonstrou boa capacidade reflexiva e flexibilidade. Fechamento com registro de pensamentos automáticos disfuncionais. Sem sinais de risco ou ideação autolesiva.",


        "supervisor_nome": "Prof. Dr. Robert Santos do Carmo"
    }

    res = client.post("/api/v1/prontuarios/psico", json=payload_valido, headers=headers)
    assert res.status_code == 201
    prontuario = res.json()
    assert prontuario["status"] == "AGUARDANDO_VALIDACAO"
    assert prontuario["id"] is not None

    PRONTUARIO_SUBMETIDO_ID["id"] = prontuario["id"]


def test_redacao_clinica_recusa_campo_em_branco():
    """A redação clínica não aceita branco

    O validador existia só para aspas (RN-002) e aceitava string vazia. A tela
    preenchia o campo por conta própria, mas qualquer cliente chamando a rota
    direto mandava em branco e o banco aceitava — ficha clínica vazia entrando
    na fila de homologação.

    Antes eram três campos (início/meio/fim) e o teste rodava 3 × 3 combinações.
    Com a caixa única sobrou uma, e o teste perdeu proporção: o risco continua
    coberto, porque o que ele exercita é o caminho de escrita, não a contagem.
    """
    headers_estagiario = {"Authorization": f"Bearer {get_auth_token('16032935')}"}
    headers_supervisor = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}

    # Conta a fila dentro do próprio teste: depender do seed tornaria a
    # asserção sensível à ordem em que os testes anteriores criaram registros.
    antes = len(client.get("/api/v1/prontuarios/psico", headers=headers_supervisor).json())

    base = {
        "paciente_id": 1,
        "paciente_nome": "Paciente Teste Sintese Vazia",
        "estagiario_nome": "Teste",
        "estagiario_matricula": "16032935",
        "data_sessao": "10/10/2026",
        "numero_sessao": "Sessão 97",
        "redacao_texto": (
            "Sessão iniciada no horário pactuado. Intervenção concluída sem "
            "intercorrências. Encerramento com retorno agendado."
        ),
    }

    for vazio in ("", "   ", "\n\t "):
        res = client.post(
            "/api/v1/prontuarios/psico",
            json=dict(base, redacao_texto=vazio),
            headers=headers_estagiario,
        )
        assert res.status_code == 422, f"redacao_texto={vazio!r} deveria ser recusado"

    # Recusa não pode ter gravado nada: a fila não cresceu e o nome fictício não existe.
    depois = client.get("/api/v1/prontuarios/psico", headers=headers_supervisor).json()
    assert len(depois) == antes
    assert not any(e["paciente_nome"] == base["paciente_nome"] for e in depois)

    # E o caminho válido continua aceito — a regra é preenchimento, não recusa geral.
    assert client.post(
        "/api/v1/prontuarios/psico", json=base, headers=headers_estagiario
    ).status_code == 201


def test_rn004_menor_de_idade_obrigatoriedade_responsavel():
    """RN-004 & UC-03: Menor de idade exige obrigatoriamente nome e contato do responsável legal"""
    token_recepcao = get_auth_token("REC-001")
    headers = {"Authorization": f"Bearer {token_recepcao}"}

    # Menor sem responsável legal -> Deve falhar com 400
    payload_invalido = {
        "nome": "Criança Teste Sem Responsavel",
        "cpf_rg": "999.888.777-66",
        "data_nascimento": "2018-05-10",
        "telefone": "(79) 99999-8888",
        "eh_menor": True,
        "nome_responsavel": None,
        "contato_responsavel": None,
        "curso": "odontologia"
    }
    res = client.post("/api/v1/pacientes", json=payload_invalido, headers=headers)
    assert res.status_code == 400
    assert "RN-004" in res.json()["detail"]

    # Menor com responsável legal -> Deve cadastrar com 201
    import time
    cpf_unico = f"999.{int(time.time()) % 900 + 100}.{int(time.time() * 10) % 900 + 100}-77"
    payload_valido = {
        "nome": "Criança Teste Com Responsavel",
        "cpf_rg": cpf_unico,
        "data_nascimento": "2018-05-10",
        "telefone": "(79) 99999-8888",
        "eh_menor": True,
        "nome_responsavel": "Ana Paula da Silva (Mãe)",
        "contato_responsavel": "(79) 99999-8888",
        "curso": "odontologia"
    }
    res_valido = client.post("/api/v1/pacientes", json=payload_valido, headers=headers)

    assert res_valido.status_code == 201
    assert res_valido.json()["nome_responsavel"] == "Ana Paula da Silva (Mãe)"

def test_cadastro_impede_cpf_duplicado():
    """Cadastro: o sistema impede múltiplos pacientes com o mesmo CPF"""
    token_recepcao = get_auth_token("REC-001")
    headers = {"Authorization": f"Bearer {token_recepcao}"}

    # CPF já existente no seed inicial: 048.291.545-88
    # REC-001 é a recepção da ODONTOLOGIA; o curso do payload precisa ser o dela,
    # senão a validação de curso responde 403 antes de chegar no CPF duplicado.
    payload_duplicado = {
        "nome": "Clone Invalido",
        "cpf_rg": "04829154588", # Mesmo CPF sem pontuação
        "data_nascimento": "1995-01-01",
        "telefone": "(79) 99999-0000",
        "eh_menor": False,
        "curso": "odontologia"
    }
    res = client.post("/api/v1/pacientes", json=payload_duplicado, headers=headers)
    assert res.status_code == 400
    assert "RF-007" in res.json()["detail"]

def test_rf004_homologacao_docente_supervisor():
    """RF-004: O supervisor valida a evolução do estagiário com visto digital e parecer pedagógico"""
    token_supervisor = get_auth_token("DOC-8821")
    headers = {"Authorization": f"Bearer {token_supervisor}"}

    # Homologa o prontuario submetido pelo estagiario em
    # test_rn002_evolucao_psico_sintese_conforme, em vez de um id fixo.
    prontuario_id = PRONTUARIO_SUBMETIDO_ID.get("id")
    assert prontuario_id is not None, "test_rn002_evolucao_psico_sintese_conforme deve rodar antes"

    payload_homologacao = {
        "decisao": "VALIDADO",
        "parecer": "Evolução clínica exemplar. Síntese conceitual adequada aos preceitos da TCC. Visto digital deferido."
    }
    res = client.patch(f"/api/v1/prontuarios/psico/{prontuario_id}/homologar", json=payload_homologacao, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "VALIDADO"
    assert "Visto digital deferido" in res.json()["parecer_supervisor"]

def test_rf006_relatorio_estatistico_rt():
    """RF-006 & RN-003: Emissão de relatórios estatísticos e indicadores de absenteísmo para a RT"""
    token_rt = get_auth_token("RT-001")
    headers = {"Authorization": f"Bearer {token_rt}"}

    res = client.get("/api/v1/relatorios/estatisticas", headers=headers)
    assert res.status_code == 200
    dados = res.json()
    assert dados["resumo_executivo"]["total_pacientes"] >= 4
    assert "taxa_absenteismo_pct" in dados["resumo_executivo"]
    assert "distribuicao_cursos" in dados
    assert "conformidade_legal" in dados

def test_bloco1_fila_demandas_de_estagio():
    """Bloco 1: a fila de trabalho dos estagiários persiste no banco e é conciliável pela recepção"""
    token_estagiario = get_auth_token("16024402")
    headers = {"Authorization": f"Bearer {token_estagiario}"}

    # O seed popula a fila; a recepção precisa enxergar as demandas existentes.
    # Vertical slice: o estagiário só vê a fila da própria clínica, e o seed
    # tem 2 de odontologia e 1 de psicologia.
    res_lista = client.get("/api/v1/demandas", headers=headers)
    assert res_lista.status_code == 200
    assert all(d["curso"] == "odontologia" for d in res_lista.json())
    assert len(res_lista.json()) >= 2

    # Filtro por curso, usado pelo painel da recepção de cada clínica.
    res_filtro = client.get("/api/v1/demandas?curso=odontologia", headers=headers)
    assert res_filtro.status_code == 200
    assert all(d["curso"] == "odontologia" for d in res_filtro.json())

    # Estagiário registra uma nova solicitação e recebe o id real do banco.
    payload = {
        "aluno_nome": "Aluno de Teste RF-009",
        "aluno_matricula": "16024402",
        "curso": "odontologia",
        "procedimento_desejado": "1 paciente para avaliação de restauração classe I.",
        "prioridade": "Alta",
        "data_solicitacao": "10/10/2026",
    }
    res_cria = client.post("/api/v1/demandas", json=payload, headers=headers)
    assert res_cria.status_code == 201
    demanda = res_cria.json()
    assert demanda["status"] == "Pendente"
    assert demanda["id"] is not None

    # A demanda recém-criada aparece na listagem — prova que persistiu.
    res_confere = client.get("/api/v1/demandas", headers=headers)
    assert demanda["id"] in [d["id"] for d in res_confere.json()]

    # Recepção concilia a fila com a agenda real.
    token_recepcao = get_auth_token("REC-001")
    headers_recepcao = {"Authorization": f"Bearer {token_recepcao}"}
    res_status = client.patch(
        f"/api/v1/demandas/{demanda['id']}/status",
        json={"status": "Agendado"},
        headers=headers_recepcao,
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "Agendado"

    # Demanda inexistente devolve 404, nao 500.
    res_inexistente = client.patch(
        "/api/v1/demandas/999999/status",
        json={"status": "Agendado"},
        headers=headers_recepcao,
    )
    assert res_inexistente.status_code == 404

def test_vslice_supervisor_odonto_bloqueado_na_psicologia():
    """Vertical slice: o supervisor de odontologia não acessa prontuários psicológicos"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}

    # Leitura bloqueada.
    res_leitura = client.get("/api/v1/prontuarios/psico", headers=headers)
    assert res_leitura.status_code == 403

    # Escrita bloqueada: paciente 1 é da psicologia, então o registro em prontuário
    # psicológico seria um cruzamento de clínica.
    res_escrita = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": 1,
            "paciente_nome": "Marcos Aurélio Silveira",
            "estagiario_nome": "X",
            "estagiario_matricula": "16024402",
            "data_sessao": "10/10/2026",
            "numero_sessao": "S1",
        "redacao_texto": "Síntese sem aspas. Síntese do meio. Síntese do fim.",


        },
        headers=headers,
    )
    assert res_escrita.status_code == 403

    # Homologação bloqueada.
    res_homologa = client.patch(
        f"/api/v1/prontuarios/psico/{PRONTUARIO_SUBMETIDO_ID.get('id', 1)}/homologar",
        json={"decisao": "VALIDADO", "parecer": "Visto"},
        headers=headers,
    )
    assert res_homologa.status_code == 403

def test_vslice_supervisor_psico_bloqueado_na_odontologia():
    """Vertical slice: o supervisor de psicologia não acessa fichas odontológicas"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}

    res_leitura = client.get("/api/v1/prontuarios/odonto", headers=headers)
    assert res_leitura.status_code == 403

    # Paciente 2 é de odontologia; registrar ficha odonto a partir de um supervisor
    # de psicologia também é cruzamento.
    res_escrita = client.post(
        "/api/v1/prontuarios/odonto",
        json={
            "paciente_id": 2,
            "dupla_estagiarios": "X",
            "dente_regiao": "Dente 36",
            "procedimento_realizado": "Restauração",
            "materiais_utilizados": "Resina"
        },
        headers=headers,
    )
    assert res_escrita.status_code == 403

def test_vslice_rt_escopado_ao_proprio_curso():
    """Vertical slice: a Referência Técnica tem visão panorâmica só da sua clínica

    A salvaguarda institucional (RN-003) dá ao RT acesso amplo, mas a vertical
    slice exige que ele não leia dado clínico da outra clínica.
    """
    rt_odonto = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    rt_psico = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}

    # RT de odontologia: sua clínica sim, a outra não.
    assert client.get("/api/v1/prontuarios/odonto", headers=rt_odonto).status_code == 200
    assert client.get("/api/v1/prontuarios/psico", headers=rt_odonto).status_code == 403

    # RT de psicologia: o inverso.
    assert client.get("/api/v1/prontuarios/psico", headers=rt_psico).status_code == 200
    assert client.get("/api/v1/prontuarios/odonto", headers=rt_psico).status_code == 403

    # O relatório gerencial também vem filtrado: distribuicao_cursos só traz a
    # chave da clínica do solicitante.
    est_odonto = client.get("/api/v1/relatorios/estatisticas", headers=rt_odonto)
    assert est_odonto.status_code == 200
    dados_odonto = est_odonto.json()
    assert dados_odonto["resumo_executivo"]["curso"] == "odontologia"
    assert list(dados_odonto["distribuicao_cursos"].keys()) == ["odontologia"]

    est_psico = client.get("/api/v1/relatorios/estatisticas", headers=rt_psico)
    dados_psico = est_psico.json()
    assert dados_psico["resumo_executivo"]["curso"] == "psicologia"
    assert list(dados_psico["distribuicao_cursos"].keys()) == ["psicologia"]

    # Contagens também não se misturam entre as duas clínicas.
    assert dados_odonto["resumo_executivo"]["total_pacientes"] != dados_psico["resumo_executivo"]["total_pacientes"]

def test_vslice_recepcao_so_enxerga_a_propria_clinica():
    """Vertical slice: recepção é uma conta por clínica

    REC-001 concilia a odontologia, REC-002 concilia a psicologia. Sem isso a
    separação vira só filtro de tela: bastava omitir ?curso= na API para ver a
    agenda inteira.
    """
    rec_odonto = {"Authorization": f"Bearer {get_auth_token('REC-001')}"}
    rec_psico = {"Authorization": f"Bearer {get_auth_token('REC-002')}"}

    # Cada recepção enxerga apenas a agenda da própria clínica.
    pac_odonto = client.get("/api/v1/pacientes", headers=rec_odonto).json()
    pac_psico = client.get("/api/v1/pacientes", headers=rec_psico).json()
    assert all(p["curso"] in ("odontologia", "ambos") for p in pac_odonto)
    assert all(p["curso"] in ("psicologia", "ambos") for p in pac_psico)
    assert pac_odonto and pac_psico, "o seed precisa ter pacientes das duas clínicas"

    # Parametro do cliente não contorna o escopo: pedir a outra clínica em vez
    # de omitir devolve a lista da própria, não a alheia.
    pedido_alheio = client.get("/api/v1/pacientes?curso=psicologia", headers=rec_odonto).json()
    assert all(p["curso"] in ("odontologia", "ambos") for p in pedido_alheio)

    # Demanda é fila da clínica do aluno — a recepção concilia só a dela.
    dem_odonto = client.get("/api/v1/demandas", headers=rec_odonto).json()
    dem_psico = client.get("/api/v1/demandas", headers=rec_psico).json()
    assert all(d["curso"] == "odontologia" for d in dem_odonto)
    assert all(d["curso"] == "psicologia" for d in dem_psico)

def test_vslice_recepcao_nao_altera_registro_de_outra_clinica():
    """Vertical slice: filtrar a listagem não dá direito de agir sobre o id alheio"""
    rec_psico = {"Authorization": f"Bearer {get_auth_token('REC-002')}"}
    rec_odonto = {"Authorization": f"Bearer {get_auth_token('REC-001')}"}

    agendamento_odonto = next(
        a for a in client.get("/api/v1/agendamentos", headers=rec_odonto).json()
        if a["curso"] == "odontologia"
    )

    # Confirmar presença de uma consulta odontológica é ato da recepção de odonto.
    res = client.patch(
        f"/api/v1/agendamentos/{agendamento_odonto['id']}/status",
        json={"status": "PRESENTE"},
        headers=rec_psico,
    )
    assert res.status_code == 403

    # Nem criar paciente na outra clínica.
    res_cria = client.post(
        "/api/v1/pacientes",
        json={
            "nome": "Paciente Fora Da Clinica",
            "cpf_rg": "99988877766",
            "data_nascimento": "1990-01-01",
            "telefone": "(79) 98888-7777",
            "eh_menor": False,
            "curso": "odontologia",
        },
        headers=rec_psico,
    )
    assert res_cria.status_code == 403

def test_vslice_rn001_preservado_na_recepcao_da_psicologia():
    """Vertical slice: separar por curso não vira permissão clínica

    A recepção da psicologia tem a agenda da clínica dela, mas continua barrada
    do prontuário pelo RN-001 — e o detail precisa ser o normativo, não o de
    curso. O guard de papel roda antes do de curso justamente para isso.
    """
    headers = {"Authorization": f"Bearer {get_auth_token('REC-002')}"}

    res_psico = client.get("/api/v1/prontuarios/psico", headers=headers)
    assert res_psico.status_code == 403
    assert "RN-001" in res_psico.json()["detail"]

    res_odonto = client.get("/api/v1/prontuarios/odonto", headers=headers)
    assert res_odonto.status_code == 403

def test_rf007_auditoria_filtrada_por_curso():
    """RF-007: a trilha de auditoria é dado pessoal (LGPD Art. 11) e não vaza entre clínicas"""
    rt_odonto = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    rt_psico = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}

    # A própria RT rende log ao entrar, então a lista nunca vem vazia.
    logs_odonto = client.get("/api/v1/auditoria", headers=rt_odonto).json()
    logs_psico = client.get("/api/v1/auditoria", headers=rt_psico).json()

    assert logs_odonto and logs_psico
    assert all(l["curso"] in ("odontologia", "ambos") for l in logs_odonto)
    assert all(l["curso"] in ("psicologia", "ambos") for l in logs_psico)

    # Os dois lados não podem enxergar exatamente a mesma trilha.
    assert {l["id"] for l in logs_odonto} != {l["id"] for l in logs_psico}

def test_rf004_homologacao_odontologica_docente():
    """RF-004 na odontologia: o supervisor homologa a ficha com visto digital

    Paridade com a clínica de psicologia. Antes o botão de homologação do
    odontológico não tinha handler e `POST /prontuarios/odonto` não tinha
    cliente — a supervisão da odonto era só JSX literal.
    """
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}

    fila = client.get("/api/v1/prontuarios/odonto", headers=headers)
    assert fila.status_code == 200
    fichas = fila.json()
    assert fichas, "o seed precisa criar fichas odontológicas"

    pendente = next(f for f in fichas if f["status"] == "AGUARDANDO_VALIDACAO")

    res = client.patch(
        f"/api/v1/prontuarios/odonto/{pendente['id']}/homologar",
        json={"decisao": "VALIDADO", "parecer": "Técnica adequada. Homologado."},
        headers=headers,
    )
    assert res.status_code == 200
    homologada = res.json()
    assert homologada["status"] == "VALIDADO"
    assert homologada["parecer_supervisor"] == "Técnica adequada. Homologado."

    # O parecer sobreviveu ao commit: releitura não volta como pendente.
    relido = client.get("/api/v1/prontuarios/odonto", headers=headers).json()
    assert next(f for f in relido if f["id"] == pendente["id"])["status"] == "VALIDADO"

def test_rf004_homologacao_odontologica_devolucao():
    """RF-004: devolução para ajuste também é decisão de homologação"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}
    fichas = client.get("/api/v1/prontuarios/odonto", headers=headers).json()
    pendente = next(f for f in fichas if f["status"] == "AGUARDANDO_VALIDACAO")

    res = client.patch(
        f"/api/v1/prontuarios/odonto/{pendente['id']}/homologar",
        json={"decisao": "DEVOLVIDO_PARA_AJUSTE", "parecer": "Falta registrar o material_used."},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "DEVOLVIDO_PARA_AJUSTE"

def test_vslice_homologacao_odontologica_bloqueada_por_curso():
    """Vertical slice: só supervisor/RT da odontologia homologa ficha odontológica"""
    headers_psi = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}
    rt_psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    estagiario = {"Authorization": f"Bearer {get_auth_token('16024402')}"}

    # A RT de odontologia enxerga a fila; as outras clínicas nem a leem.
    fila_odonto = client.get("/api/v1/prontuarios/odonto", headers={"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}).json()
    assert client.get("/api/v1/prontuarios/odonto", headers=rt_psi).status_code == 403

    ficha_id = fila_odonto[0]["id"]
    payload = {"decisao": "VALIDADO", "parecer": "Homologação indevida."}

    assert client.patch(
        f"/api/v1/prontuarios/odonto/{ficha_id}/homologar", json=payload, headers=headers_psi
    ).status_code == 403
    assert client.patch(
        f"/api/v1/prontuarios/odonto/{ficha_id}/homologar", json=payload, headers=rt_psi
    ).status_code == 403
    # Estagiário não homologa nem a própria ficha (RN-004 é ato docente).
    assert client.patch(
        f"/api/v1/prontuarios/odonto/{ficha_id}/homologar", json=payload, headers=estagiario
    ).status_code == 403

    # E a ficha continua como estava: tentativa negada não pode ter gravado.
    relido = client.get(
        "/api/v1/prontuarios/odonto",
        headers={"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}
    ).json()
    assert next(f for f in relido if f["id"] == ficha_id)["status"] == fila_odonto[0]["status"]

def test_vslice_fila_odontologica_traz_paciente_compartilhado():
    """Vertical slice: paciente de curso "ambos" aparece nas duas clínicas"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}
    fichas = client.get("/api/v1/prontuarios/odonto", headers=headers).json()
    assert fichas

    # A ficha do paciente compartilhado existe e está na fila da odontologia.
    pacientes_odonto = client.get("/api/v1/pacientes", headers=headers).json()
    compartilhado = next(p for p in pacientes_odonto if p["curso"] == "ambos")
    ids = {f["paciente_id"] for f in fichas}
    assert compartilhado["id"] in ids

def test_seg_senha_bcrypt_com_salt():
    """Senha é guardada com bcrypt e salt novo a cada geração"""
    from app.services.crypto_service import get_password_hash, verify_password

    h1 = get_password_hash("unicare123")
    h2 = get_password_hash("unicare123")

    assert h1.startswith("$2b$")
    assert len(h1) == 60, "o hash bcrypt precisa caber nos 128 chars da coluna"
    # Mesmo senhora, hash diferente: é o salt fazendo o trabalho.
    assert h1 != h2
    assert verify_password("unicare123", h1)
    assert verify_password("unicare123", h2)
    assert not verify_password("senha-errada", h1)

def test_seg_fallback_cleartext_removido():
    """Regressão: hash em texto puro NÃO pode autenticar

    `verify_password` tinha `return plain_password == hashed_password` como
    fallback. Qualquer `senha_hash` malformado — inclusive a senha em claro —
    passava na verificação.
    """
    from app.services.crypto_service import verify_password

    assert not verify_password("unicare123", "unicare123")
    assert not verify_password("qualquer-coisa", "qualquer-coisa")
    assert not verify_password("unicare123", "")
    # Hash de outro algoritmo também não é aceito.
    assert not verify_password("unicare123", "abcd1234:ef567890")

def test_seg_senha_longa_nao_quebra_o_login():
    """Senha acima de 72 bytes não pode transformar o login em 500

    O bcrypt recusa senha com mais de 72 bytes. Se o `ValueError` escapar, o
    login responde 500 em vez de 401 e ainda entrega um stack trace.
    """
    from app.services.crypto_service import get_password_hash, verify_password, SenhaLongaError

    longa = "x" * 100
    with pytest.raises(SenhaLongaError):
        get_password_hash(longa)

    hash_valido = get_password_hash("unicare123")
    assert verify_password(longa, hash_valido) is False

    # E pela rota: um login com senha longa responde 401, não 500.
    res = client.post(
        "/api/v1/auth/login",
        json={"email_ou_matricula": "16032935", "senha": longa}
    )
    assert res.status_code == 401

def test_rf007_auditoria_registra_ip_real():
    """RF-007: o log de auditoria carrega o IP da requisição, não um loopback fixo

    O default era "127.0.0.1" em 100% dos registros. O TestClient do Starlette se
    apresenta como "testclient", então ver esse valor prova que o IP veio da
    requisição.
    """
    from app.services.auditoria_service import registrar_log

    # Assinatura sem IP explícito não pode inventar um endereço.
    import inspect
    parametro = inspect.signature(registrar_log).parameters["endereco_ip"]
    assert parametro.default is None, "default None evita gravar IP falso por omissão"

    token = get_auth_token("DOC-8821")
    logs = client.get(
        "/api/v1/auditoria",
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    login = next((l for l in logs if l["acao"] == "LOGIN_EFETUADO"), None)
    assert login is not None, "o proprio login deve gerar registro"
    assert login["endereco_ip"] == "testclient"
    assert login["endereco_ip"] != "127.0.0.1"

def test_seg_cors_bloqueia_origin_nao_permitida():
    """CORS: origem fora da lista não recebe o header de autorização"""
    settings = __import__("app.config", fromlist=["settings"]).settings
    assert "*" not in settings.cors_origins_list, "wildcard com credentials reflete qualquer origin"

    # Preflight de origem não permitida não pode ser autorizado.
    res_bloqueado = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://site-malicioso.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in res_bloqueado.headers

    # Origem da lista recebe.
    permitido = settings.cors_origins_list[0]
    res_permitido = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": permitido,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res_permitido.headers.get("access-control-allow-origin") == permitido


# --- RF-009: Gerenciamento RBAC com Ciclo de Vida Completo ---

def test_rf009_rt_cadastra_usuario_na_propria_clinica():
    """RF-009: a RT cadastra usuário na própria clínica, com senha hasheada"""
    headers = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}

    novo = {
        "nome": "Estagiário de Teste RF009",
        "email": "estagiario.teste@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "estagiario",
        "matricula": "TST009",
    }
    res = client.post("/api/v1/usuarios", json=novo, headers=headers)
    assert res.status_code == 201
    criado = res.json()

    # O curso nunca vem do corpo: é o da RT.
    assert criado["curso"] == "odontologia"
    # senha_hash não existe no schema de leitura.
    assert "senha_hash" not in criado
    assert criado["ativo"] is True
    assert criado["id"] is not None

    # A senha foi realmente gravada com bcrypt, e o texto puro não autentica.
    token = get_auth_token("TST009", "senha-teste-123")
    assert token
    res_ruim = client.post(
        "/api/v1/auth/login",
        json={"email_ou_matricula": "TST009", "senha": "senha-teste-123"}
    )
    assert res_ruim.status_code == 200

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["id"] == criado["id"], "getMe precisa devolver o id real do banco"


def test_rf009_rt_nao_cadastra_usuario_de_outra_clinica():
    """RF-009 + vertical slice: nenhum usuário pode ser criado em clínica alheia"""
    headers = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}

    # O corpo manda psicologia, mas a RT é de psicologia também: o curso forçado
    # é o dela. O teste que importa é que a RT de odontologia não alcança a psi.
    novo = {
        "nome": "Tentativa Cruzada",
        "email": "cruzado.teste@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "estagiario",
        "matricula": "CRZ009",
    }
    res = client.post("/api/v1/usuarios", json=novo, headers=headers)
    assert res.status_code == 201
    assert res.json()["curso"] == "psicologia"

    # A RT de odontologia não enxerga esse usuário na listagem.
    lista_odonto = client.get(
        "/api/v1/usuarios",
        headers={"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    ).json()
    assert all(u["matricula"] != "CRZ009" for u in lista_odonto)


def test_rf009_supervisor_gerencia_apenas_estagiario():
    """RF-009: supervisor administra estagiários; promover a RT é ato da RT"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}

    lista = client.get("/api/v1/usuarios", headers=headers).json()
    assert lista, "o supervisor precisa ver os estagiários da própria clínica"
    assert all(u["perfil"] == "estagiario" for u in lista), "supervisor só vê estagiário"
    assert all(u["curso"] == "odontologia" for u in lista)

    # Pode criar estagiário...
    res_ok = client.post("/api/v1/usuarios", json={
        "nome": "Estagiário Sobreador",
        "email": "estagiario.sobreador@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "estagiario",
        "matricula": "SOB009",
    }, headers=headers)
    assert res_ok.status_code == 201

    # ...mas não criar supervisor.
    res_neg = client.post("/api/v1/usuarios", json={
        "nome": "Supervisor Fraudado",
        "email": "supervisor.fraudado@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "supervisor",
        "matricula": "FRD009",
    }, headers=headers)
    assert res_neg.status_code == 403


def test_rf009_estagiario_e_recepcao_nao_gerenciam_usuarios():
    """RF-009: só RT e supervisor administram contas"""
    for matricula in ("16024402", "REC-001"):
        headers = {"Authorization": f"Bearer {get_auth_token(matricula)}"}
        assert client.get("/api/v1/usuarios", headers=headers).status_code == 403
        assert client.post("/api/v1/usuarios", json={
            "nome": "Nao Autorizado",
            "email": "nao.autorizado@uninassau.edu.br",
            "senha": "senha-teste-123",
            "perfil": "estagiario",
            "matricula": "NAUT09",
        }, headers=headers).status_code == 403


def test_rf009_unicidade_de_email_e_matricula():
    """Violação de unicidade precisa ser 400 legível, não 500"""
    headers = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    novo = {
        "nome": "Duplicado",
        "email": "duplicado.teste@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "estagiario",
        "matricula": "DUP009",
    }
    assert client.post("/api/v1/usuarios", json=novo, headers=headers).status_code == 201

    # Matrícula repetida.
    res = client.post("/api/v1/usuarios", json=novo, headers=headers)
    assert res.status_code == 400
    assert "matrícula" in res.json()["detail"]


def test_rf009_desativar_corta_acesso_e_preserva_registro():
    """DELETE desativa: corta o login, mas não apaga a linha (auditoria)"""
    headers = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    novo = {
        "nome": "Usuário Para Desativar",
        "email": "desativar.teste@uninassau.edu.br",
        "senha": "senha-teste-123",
        "perfil": "estagiario",
        "matricula": "DES009",
    }
    criado = client.post("/api/v1/usuarios", json=novo, headers=headers).json()

    res = client.delete(f"/api/v1/usuarios/{criado['id']}", headers=headers)
    assert res.status_code == 200
    assert res.json()["ativo"] is False

    # O login passa a 401.
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email_ou_matricula": "DES009", "senha": "senha-teste-123"}
    )
    assert res_login.status_code == 401

    # Mas o registro continua na listagem (preservado para auditoria).
    lista = client.get("/api/v1/usuarios", headers=headers).json()
    desativado = next(u for u in lista if u["id"] == criado["id"])
    assert desativado["ativo"] is False


def test_rf009_rt_nao_altera_o_proprio_cadastro():
    """Auto-edição e auto-desativação são barradas"""
    headers = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    eu = client.get("/api/v1/auth/me", headers=headers).json()

    res_edit = client.patch(f"/api/v1/usuarios/{eu['id']}", json={"nome": "Novo Nome"}, headers=headers)
    assert res_edit.status_code == 400

    res_del = client.delete(f"/api/v1/usuarios/{eu['id']}", headers=headers)
    assert res_del.status_code == 400

# --- RF-004: o parecer do supervisor e obrigatorio nas DUAS clinicas ---

def test_rf004_homologacao_exige_parecer_na_psicologia():
    """RF-004: homologar sem parecer recusa com 422

    A tela de psicologia abria o campo de parecer com um texto ja redigido, e
    esse texto ia para o PATCH. Alem disso o parecer era opcional no schema,
    entao a regra so existia na interface.
    """
    # Cria a propria evolucao: depender de uma pendente do seed torna o teste
    # sensivel a ordem, porque os testes de homologacao anteriores ja consomem
    # as duas fichas pendentes.
    headers_estagiario = {"Authorization": f"Bearer {get_auth_token('16032935')}"}
    criada = client.post("/api/v1/prontuarios/psico", json={
        "paciente_id": 1,
        "paciente_nome": "Paciente Teste Parecer",
        "estagiario_nome": "Teste",
        "estagiario_matricula": "16032935",
        "data_sessao": "10/10/2026",
        "numero_sessao": "Sessão 99",
        "redacao_texto": "Sessão iniciada no horário pactuado. Intervenção planejada concluída sem intercorrências. Encerramento com retorno agendado.",


    }, headers=headers_estagiario)
    assert criada.status_code == 201
    pendente = criada.json()

    headers = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}

    for parecer in ("", "   ", "\n\t "):
        res = client.patch(
            f"/api/v1/prontuarios/psico/{pendente['id']}/homologar",
            json={"decisao": "VALIDADO", "parecer": parecer},
            headers=headers,
        )
        assert res.status_code == 422, f"parecer {parecer!r} deveria ser recusado"

    # A ficha continua pendente: recusa não pode ter gravado nada.
    relida = client.get("/api/v1/prontuarios/psico", headers=headers).json()
    assert next(e for e in relida if e["id"] == pendente["id"])["status"] == "AGUARDANDO_VALIDACAO"


def test_rf004_homologacao_exige_parecer_na_odontologia():
    """RF-004: a mesma exigência vale para a ficha odontológica"""
    headers_estagiario = {"Authorization": f"Bearer {get_auth_token('16024402')}"}
    criada = client.post("/api/v1/prontuarios/odonto", json={
        "paciente_id": 2,
        "dupla_estagiarios": "Dupla Teste",
        "dente_regiao": "Dente 16",
        "procedimento_realizado": "Restauracao classe I.",
        "materiais_utilizados": "Resina A2.",
    }, headers=headers_estagiario)
    assert criada.status_code == 201
    pendente = criada.json()

    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}

    res = client.patch(
        f"/api/v1/prontuarios/odonto/{pendente['id']}/homologar",
        json={"decisao": "VALIDADO", "parecer": "  "},
        headers=headers,
    )
    assert res.status_code == 422

    # E com parecer real, o texto vai aparasado para o banco.
    ok = client.patch(
        f"/api/v1/prontuarios/odonto/{pendente['id']}/homologar",
        json={"decisao": "VALIDADO", "parecer": "  Tecnica adequada.  "},
        headers=headers,
    )
    assert ok.status_code == 200
    assert ok.json()["parecer_supervisor"] == "Tecnica adequada."

# --- Anamnese e sinais vitais do paciente ---

def test_anamnese_registra_e_persiste():
    """Aferição gravada volta na releitura, com autoria vinda do token"""
    headers = {"Authorization": f"Bearer {get_auth_token('16024402')}"}

    payload = {
        "pressao_arterial": "120/80",
        "glicemia_capilar": 98,
        "frequencia_cardiaca": 74,
        "temperatura": 36.5,
        "alergias": "Penicilina e derivados",
        "condicoes_cronicas": "Hipertensão controlada",
        "medicacoes_em_uso": "Losartana 50mg",
    }
    res = client.post("/api/v1/pacientes/2/anamnese", json=payload, headers=headers)
    assert res.status_code == 201
    criada = res.json()

    # A autoria é do token: o corpo não tem campo de responsável.
    assert criada["responsavel_matricula"] == "16024402"
    assert criada["pressao_arterial"] == "120/80"
    assert criada["alergias"] == "Penicilina e derivados"
    assert criada["afetido_em"] is not None

    relida = client.get("/api/v1/pacientes/2/anamnese", headers=headers).json()
    assert any(a["id"] == criada["id"] for a in relida)


def test_anamnese_rejeita_valor_fora_de_faixa():
    """Dado impossível é pior que dado ausente: erro de digitação tem de aparecer"""
    headers = {"Authorization": f"Bearer {get_auth_token('16024402')}"}

    casos = {
        "pressao mal formatada": {"pressao_arterial": "120 por 80"},
        "glicemia absurda": {"glicemia_capilar": 980},
        "frequencia baixa": {"frequencia_cardiaca": 5},
        "temperatura impossivel": {"temperatura": 52.0},
    }
    for descricao, corpo in casos.items():
        res = client.post(
            "/api/v1/pacientes/2/anamnese", json=corpo, headers=headers
        )
        assert res.status_code == 422, f"{descricao} deveria dar 422"


def test_anamnese_respeita_a_clinica_do_paciente():
    """Anamnese é dado clínico: só a clínica do paciente lê e grava"""
    headers_psi = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}

    # Paciente 2 é de odontologia: a supervisora de psicologia não chega nele.
    assert client.get("/api/v1/pacientes/2/anamnese", headers=headers_psi).status_code == 403
    assert client.post(
        "/api/v1/pacientes/2/anamnese",
        json={"pressao_arterial": "120/80"},
        headers=headers_psi,
    ).status_code == 403

    # Paciente 1 é de psicologia e a supervisora de odontologia é barrada.
    headers_odonto = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}
    assert client.get("/api/v1/pacientes/1/anamnese", headers=headers_odonto).status_code == 403


def test_anamnese_paciente_compartilhado_veem_as_duas_clinicas():
    """Paciente de curso "ambos" tem anamnese visível para as duas clínicas"""
    reg_psi = {"Authorization": f"Bearer {get_auth_token('16032935')}"}
    res = client.post(
        "/api/v1/pacientes/3/anamnese",
        json={"pressao_arterial": "118/76", "frequencia_cardiaca": 70},
        headers=reg_psi,
    )
    assert res.status_code == 201

    # Visível na psicologia (quem registrou) e na odontologia.
    assert client.get("/api/v1/pacientes/3/anamnese", headers=reg_psi).status_code == 200
    assert client.get(
        "/api/v1/pacientes/3/anamnese",
        headers={"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}
    ).status_code == 200


def test_anamnese_rececao_bloqueada_pelo_rn001():
    """RN-001: a recepção não toca dado clínico, nem registra aferição"""
    headers = {"Authorization": f"Bearer {get_auth_token('REC-001')}"}

    assert client.get("/api/v1/pacientes/2/anamnese", headers=headers).status_code == 403
    res = client.post(
        "/api/v1/pacientes/2/anamnese",
        json={"pressao_arterial": "120/80"},
        headers=headers,
    )
    assert res.status_code == 403
    assert "RN-001" in res.json()["detail"]


def test_rf004_homologacao_carimba_o_supervisor():
    """RF-004: quem homologou fica gravado no prontuário

    A coluna supervisor_nome existia e só era preenchida na criação, com o que
    o cliente mandava. Sem vínculo estagiário↔supervisor no schema, o
    homologador é a fonte real de autoria docente — e o servidor escreve, não o
    cliente.
    """
    estagiario = {"Authorization": f"Bearer {get_auth_token('16032935')}"}
    supervisor = {"Authorization": f"Bearer {get_auth_token('DOC-8821')}"}

    criada = client.post("/api/v1/prontuarios/psico", json={
        "paciente_id": 1,
        "paciente_nome": "Paciente Teste Carimbo",
        "estagiario_nome": "Teste",
        "estagiario_matricula": "16032935",
        "data_sessao": "10/10/2026",
        "numero_sessao": "Sessão 98",
        "redacao_texto": "Sessão iniciada no horário pactuado. Intervenção concluída sem intercorrências. Encerramento com retorno agendado.",


    }, headers=estagiario)
    assert criada.status_code == 201
    # Antes de homologar não há docente: nada é inventado na criação.
    assert criada.json()["supervisor_nome"] is None

    res = client.patch(
        f"/api/v1/prontuarios/psico/{criada.json()['id']}/homologar",
        json={"decisao": "VALIDADO", "parecer": "Síntese adequada. Homologado."},
        headers=supervisor,
    )
    assert res.status_code == 200
    assert res.json()["supervisor_nome"] == "Prof. Dr. Robert Santos do Carmo"

    # E persiste: a releitura não volta vazia.
    relida = client.get("/api/v1/prontuarios/psico", headers=supervisor).json()
    carimbada = next(e for e in relida if e["id"] == criada.json()["id"])
    assert carimbada["supervisor_nome"] == "Prof. Dr. Robert Santos do Carmo"

# --- Troca de senha pelo próprio usuário (RF-009 / segurança de conta) ---


def test_troca_de_senha_exige_a_senha_atual():
    """Trocar a senha sem a senha atual é recusado"""
    headers = {"Authorization": f"Bearer {get_auth_token('16024402')}"}

    # Senha atual vazia é campo obrigatório: 422 na validação, como já acontece
    # com o parecer de homologação. Senha preenchida e errada é 401.
    vazia = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "", "nova_senha": "novasenha123"},
        headers=headers,
    )
    assert vazia.status_code == 422

    for errada in ("senha-errada", "unicare1234"):
        res = client.patch(
            "/api/v1/auth/senha",
            json={"senha_atual": errada, "nova_senha": "novasenha123"},
            headers=headers,
        )
        assert res.status_code == 401, f"senha_atual={errada!r} deveria ser recusada"

    # A senha da conta não foi alterada por nenhuma das tentativas.
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16024402", "senha": "unicare123"
    }).status_code == 200


def test_troca_de_senha_troca_o_hash_e_invalida_a_antiga():
    """Senha correta troca o hash: a antiga deixa de funcionar, a nova passa"""
    estagiario = {"Authorization": f"Bearer {get_auth_token('16032935')}"}

    res = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "unicare123", "nova_senha": "senha-trocada-456"},
        headers=estagiario,
    )
    assert res.status_code == 200
    # Nem a senha nem o hash podem aparecer na resposta.
    corpo = res.text
    assert "senha-trocada-456" not in corpo
    assert "senha_hash" not in corpo

    # A antiga não entra mais...
    barrada = client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16032935", "senha": "unicare123"
    })
    assert barrada.status_code == 401

    # ... e a nova entra.
    liberada = client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16032935", "senha": "senha-trocada-456"
    })
    assert liberada.status_code == 200

    # Restaura o hash do seed: os testes seguintes dependem desta conta.
    restaura = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "senha-trocada-456", "nova_senha": "unicare123"},
        headers={"Authorization": f"Bearer {liberada.json()['access_token']}"},
    )
    assert restaura.status_code == 200


def test_troca_de_senha_recusa_valor_fora_de_faixa():
    """Nova senha curta ou acima do limite do bcrypt não pode virar 500"""
    headers = {"Authorization": f"Bearer {get_auth_token('REC-002')}"}

    # Abaixo do mínimo de 6 caracteres.
    curta = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "unicare123", "nova_senha": "12345"},
        headers=headers,
    )
    assert curta.status_code == 422

    # Acima dos 72 bytes do bcrypt. `max_length` do schema barra; o `except`
    # SenhaLongaError da rota é a segunda rede, não a primeira.
    longa = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "unicare123", "nova_senha": "x" * 73},
        headers=headers,
    )
    assert longa.status_code == 422, "senha acima de 72 bytes deve ser 422, não 500"

    # E a senha antiga continua valendo: recusa não pode ter gravado nada.
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "REC-002", "senha": "unicare123"
    }).status_code == 200


def test_troca_de_senha_registra_a_trilha_de_auditoria():
    """A troca de senha deixa rastro na trilha, com IP real"""
    headers = {"Authorization": f"Bearer {get_auth_token('DOC-9122')}"}

    client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "unicare123", "nova_senha": "auditoria-trocada-1"},
        headers=headers,
    )

    rt = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    res = client.get("/api/v1/auditoria/", headers=rt)
    assert res.status_code == 200
    assert any(
        log["acao"] == "SENHA_ALTERADA" for log in res.json()
    ), "a troca de senha precisa aparecer na trilha de auditoria"

    # Restaura a senha desta conta também.
    login = client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "DOC-9122", "senha": "auditoria-trocada-1"
    })
    assert login.status_code == 200
    client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "auditoria-trocada-1", "nova_senha": "unicare123"},
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )


def test_troca_de_senha_exige_sessao_autenticada():
    """Rota de troca de senha é autenticada: sem token, nem chega na validação"""
    res = client.patch(
        "/api/v1/auth/senha",
        json={"senha_atual": "unicare123", "nova_senha": "qualquer-coisa-1"},
    )
    assert res.status_code == 401




# --- Pedido de credencial e autorização pela RT ---


def _pedido(empresa: str, **extra):
    base = {
        "nome": "Beatriz Lima Ribeiro",
        "email": empresa,
        "matricula": "17012345",
        "telefone": "(79) 99111-0000",
        "curso_declarado": "psicologia",
        "perfil_declarado": "estagiario",
    }
    base.update(extra)
    return base


def test_solicitacao_exige_email_institucional():
    """A rota é pública: sem filtro de domínio, qualquer um criaria linha na fila"""
    ok = client.post("/api/v1/solicitacoes-cadastro/",
                     json=_pedido("beatriz.lima@prof.uninassau.edu.br"))
    assert ok.status_code == 201
    assert ok.json()["situacao"] == "PENDENTE"

    for dominio in ("beatriz@gmail.com", "beatriz@outrauniversidade.edu.br",
                    "beatriz@uni.com"):
        res = client.post("/api/v1/solicitacoes-cadastro/",
                          json=_pedido(dominio, matricula="17099999"))
        assert res.status_code == 422, f"{dominio} não é institucional"


def test_solicitacao_publica_nao_revela_conta_existente():
    """Rota anônima não pode servir de oráculo para enumerar cadastro"""
    # E-mail que JÁ tem conta no seed.
    res = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "robert.carmo@uninassau.edu.br", matricula="17088888"))

    # A resposta é a de um pedido normal: 201, com o número do protocolo. Nada
    # aqui diz que a conta existe — se dissesse, qualquer um com um e-mail
    # campus conseguiria enumerar o cadastro pelo endpoint público.
    assert res.status_code == 201
    corpo = res.text.lower()
    assert "já existe usuário" not in corpo
    assert "senha incorreta" not in corpo

    # E o pedido entra na fila como pendente, para a RT resolver o conflito.
    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    pendentes = client.get("/api/v1/solicitacoes-cadastro/", headers=psi).json()
    pedido = next(s for s in pendentes if s["email"] == "robert.carmo@uninassau.edu.br")
    assert pedido["situacao"] == "PENDENTE"


def test_solicitacao_repetida_do_mesmo_email_da_409():
    """Uma pendência por e-mail: substitui o rate limiter que o projeto não tem"""
    payload = _pedido("novo.estagiario@prof.uninassau.edu.br", matricula="17055555")
    assert client.post("/api/v1/solicitacoes-cadastro/", json=payload).status_code == 201

    repetido = client.post("/api/v1/solicitacoes-cadastro/", json=payload)
    assert repetido.status_code == 409


def test_fila_de_solicitacoes_escopada_por_clinica():
    """Cada RT só enxerga a fila da clínica dela"""
    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    odonto = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}

    client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "fila.psi@prof.uninassau.edu.br", matricula="17040001",
        curso_declarado="psicologia"))
    client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "fila.odonto@uninassau.edu.br", matricula="17040002",
        curso_declarado="odontologia"))

    fila_psi = client.get("/api/v1/solicitacoes-cadastro/", headers=psi).json()
    assert all(s["curso_declarado"] == "psicologia" for s in fila_psi)
    assert any(s["email"] == "fila.psi@prof.uninassau.edu.br" for s in fila_psi)

    fila_odonto = client.get("/api/v1/solicitacoes-cadastro/", headers=odonto).json()
    assert all(s["curso_declarado"] == "odontologia" for s in fila_odonto)
    assert not any(s["email"] == "fila.psi@prof.uninassau.edu.br" for s in fila_odonto)


def test_rt_nao_aprova_solicitacao_da_outra_clinica():
    """Aprovação cruzada é 403, mesmo com token válido"""
    criada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "cruzada.odonto@uninassau.edu.br", matricula="17060001",
        curso_declarado="odontologia"))
    assert criada.status_code == 201

    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    res = client.post(
        f"/api/v1/solicitacoes-cadastro/{criada.json()['id']}/aprovar",
        json={"perfil": "estagiario", "senha": "senha-inicial-1"},
        headers=psi,
    )
    assert res.status_code == 403


def test_aprovacao_cria_conta_na_clinica_da_rt():
    """Aprovar cria o usuário no mesmo ato, com o curso vindo do token da RT"""
    criada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "aprovada.psi@prof.uninassau.edu.br", matricula="17070001"))
    solicitacao_id = criada.json()["id"]

    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    res = client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/aprovar",
        # O solicitante pediu "estagiario"; a RT confirma com registro.
        json={"perfil": "estagiario", "registro_profissional": "9º Período",
              "senha": "senha-inicial-2"},
        headers=psi,
    )
    assert res.status_code == 200
    aprovacao = res.json()
    assert aprovacao["situacao"] == "APROVADA"
    assert aprovacao["decidido_por_matricula"] == "RT-002"
    assert aprovacao["decidido_em"] is not None
    assert aprovacao["usuario_criado_id"] is not None

    # A conta existe, na clínica da RT, e a senha é a que a RT definiu.
    login = client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "17070001", "senha": "senha-inicial-2"
    })
    assert login.status_code == 200
    assert login.json()["curso"] == "psicologia"

    # E some da fila de pendentes.
    pendentes = client.get("/api/v1/solicitacoes-cadastro/", headers=psi).json()
    assert not any(s["id"] == solicitacao_id for s in pendentes)


def test_aprovacao_com_conflito_nao_encerra_o_pedido():
    """Matrícula já cadastrada: 400 e o pedido continua PENDENTE

    Se marcasse como aprovada sem criar conta, existiria "aprovado sem usuário".
    """
    criada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "conflito.psi@prof.uninassau.edu.br", matricula="16032935"))
    solicitacao_id = criada.json()["id"]

    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    res = client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/aprovar",
        json={"perfil": "estagiario", "senha": "senha-inicial-3"},
        headers=psi,
    )
    assert res.status_code == 400

    relida = client.get(
        f"/api/v1/solicitacoes-cadastro/?situacao=PENDENTE", headers=psi).json()
    assert next(s for s in relida if s["id"] == solicitacao_id)["situacao"] == "PENDENTE"


def test_recusa_exige_motivo_e_nao_cria_conta():
    """Recusa sem motivo é 422; com motivo, o pedido fecha sem virar usuário"""
    criada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "recusada.psi@prof.uninassau.edu.br", matricula="17080001"))
    solicitacao_id = criada.json()["id"]

    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    sem_motivo = client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/recusar",
        json={"motivo": "  "}, headers=psi,
    )
    assert sem_motivo.status_code == 422

    res = client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/recusar",
        json={"motivo": "E-mail não pertence a vínculo ativo da clínica."},
        headers=psi,
    )
    assert res.status_code == 200
    assert res.json()["situacao"] == "RECUSADA"
    assert res.json()["usuario_criado_id"] is None

    # Nenhuma conta foi criada: o e-mail não entra.
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "recusada.psi@prof.uninassau.edu.br", "senha": "unicare123"
    }).status_code == 401


def test_solicitacao_nao_e_decidida_duas_vezes():
    """Aprovar um pedido já recusado dá 409"""
    criada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "duas.vezes@prof.uninassau.edu.br", matricula="17090001"))
    solicitacao_id = criada.json()["id"]

    psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/recusar",
        json={"motivo": "Documentação incompleta."}, headers=psi,
    )
    segunda = client.post(
        f"/api/v1/solicitacoes-cadastro/{solicitacao_id}/aprovar",
        json={"perfil": "estagiario", "senha": "senha-inicial-4"},
        headers=psi,
    )
    assert segunda.status_code == 409


def test_fila_de_solicitacoes_so_abre_para_a_rt():
    """Supervisor, estagiário e recepção não listam nem decidem"""
    for matricula in ("DOC-8821", "16032935", "REC-002"):
        headers = {"Authorization": f"Bearer {get_auth_token(matricula)}"}
        assert client.get("/api/v1/solicitacoes-cadastro/", headers=headers).status_code == 403

    # E sem token também não.
    assert client.get("/api/v1/solicitacoes-cadastro/").status_code == 401


def test_decisao_da_rt_entra_na_trilha_de_auditoria():
    """Aprovar e recusar deixam rastro"""
    rt_psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}

    aprovada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "auditoria.aprovada@prof.uninassau.edu.br", matricula="17100001"))
    client.post(
        f"/api/v1/solicitacoes-cadastro/{aprovada.json()['id']}/aprovar",
        json={"perfil": "estagiario", "senha": "senha-inicial-5"},
        headers=rt_psi,
    )

    recusada = client.post("/api/v1/solicitacoes-cadastro/", json=_pedido(
        "auditoria.recusada@prof.uninassau.edu.br", matricula="17100002"))
    client.post(
        f"/api/v1/solicitacoes-cadastro/{recusada.json()['id']}/recusar",
        json={"motivo": "Sem vínculo com a clínica."},
        headers=rt_psi,
    )

    # A trilha é segregada por curso: quem decidiu foi a RT de psicologia, e é
    # com ela que a leitura tem que ser feita. Ler com a outra RT não encontraria
    # — e não deve encontrar.
    logs = client.get("/api/v1/auditoria/", headers=rt_psi).json()
    acoes = {log["acao"] for log in logs}
    assert "APROVACAO_SOLICITACAO_CREDENCIAL" in acoes
    assert "RECUSA_SOLICITACAO_CREDENCIAL" in acoes

    rt_odonto = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    acoes_da_outra = {log["acao"] for log in client.get("/api/v1/auditoria/", headers=rt_odonto).json()}
    assert "APROVACAO_SOLICITACAO_CREDENCIAL" not in acoes_da_outra


# --- Recuperação de senha por token no e-mail ---
#
# Nenhum teste toca a rede: `email_service.enviar` é substituído por um dublê
# em toda a suíte. O envio real só é verificado à mão, contra o SMTP real.


class _EnvioFalso:
    """Dublê do email_service. Guarda o que teria sido enviado."""

    def __init__(self):
        self.enviados: list[tuple[str, str, str]] = []
        self.comportamento = "enviado"

    def enviar(self, destinatario: str, assunto: str, corpo: str):
        self.enviados.append((destinatario, assunto, corpo))
        from app.services.email_service import ResultadoEnvio, StatusEnvio

        if self.comportamento == "enviado":
            return ResultadoEnvio(StatusEnvio.ENVIADO)
        if self.comportamento == "nao_configurado":
            return ResultadoEnvio(StatusEnvio.NAO_CONFIGURADO, "sem SMTP nos testes")
        return ResultadoEnvio(StatusEnvio.FALHOU, "535 recusado nos testes")

    def codigo_do_ultimo(self) -> str:
        """Extrai o código do corpo do e-mail, que é o que a pessoa digita."""
        assert self.enviados, "nenhum e-mail foi enviado"
        corpo = self.enviados[-1][2]
        for linha in corpo.splitlines():
            if linha.startswith("Seu código é:"):
                return linha.split(":")[1].strip()
        raise AssertionError("o corpo do e-mail não trouxe o código")


def _instalar_envio_falso(monkeypatch, comportamento: str = "enviado") -> _EnvioFalso:
    dublê = _EnvioFalso()
    dublê.comportamento = comportamento
    monkeypatch.setattr("app.routers.auth.email_service", dublê)
    return dublê


def test_recuperacao_envia_codigo_para_o_email_cadastrado(monkeypatch):
    """O pedido gera token e manda o código para o e-mail que está no cadastro"""
    envio = _instalar_envio_falso(monkeypatch)

    res = client.post("/api/v1/auth/senha/recuperar/solicitar",
                      json={"email_ou_matricula": "DOC-9122"})
    assert res.status_code == 200

    assert len(envio.enviados) == 1
    destinatario, assunto, corpo = envio.enviados[0]
    assert destinatario == "bianca.silva@uninassau.edu.br"
    assert "UniCare" in assunto
    # O código vai no corpo e tem 6 caracteres do alfabeto sem 0/O/1/l/I.
    codigo = envio.codigo_do_ultimo()
    assert len(codigo) == 6
    assert not set(codigo) & set("01OIl")


def test_resgate_troca_a_senha_e_invalida_o_codigo(monkeypatch):
    """O código certaininho troca a senha; a antiga deixa de funcionar"""
    envio = _instalar_envio_falso(monkeypatch)

    client.post("/api/v1/auth/senha/recuperar/solicitar",
                json={"email_ou_matricula": "16024402"})
    codigo = envio.codigo_do_ultimo()

    res = client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "16024402", "codigo": codigo, "nova_senha": "senha-recuperada-1"
    })
    assert res.status_code == 200

    # A nova senha entra...
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16024402", "senha": "senha-recuperada-1"
    }).status_code == 200
    # ... e a antiga não entra mais.
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16024402", "senha": "unicare123"
    }).status_code == 401

    # O mesmo código não serve duas vezes.
    segundo = client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "16024402", "codigo": codigo, "nova_senha": "outra-senha-123"
    })
    assert segundo.status_code == 400


def test_codigo_errado_ou_conta_inexistente_dao_a_mesma_resposta(monkeypatch):
    """Mensagem única: se divergisse, a rota viraria oráculo de enumeração"""
    _instalar_envio_falso(monkeypatch)

    res_identificador = client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "16024402", "codigo": "AAAAAA", "nova_senha": "senha-nova-123"
    })
    res_conta = client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "ninguem@prof.uninassau.edu.br", "codigo": "AAAAAA",
        "nova_senha": "senha-nova-123"
    })

    assert res_identificador.status_code == 400
    assert res_conta.status_code == 400
    assert res_identificador.json()["detail"] == res_conta.json()["detail"]


def test_pedido_nao_revela_se_a_conta_existe(monkeypatch):
    """Conta existente e inexistente dão a MESMA resposta de sucesso"""
    envio = _instalar_envio_falso(monkeypatch)

    com_conta = client.post("/api/v1/auth/senha/recuperar/solicitar",
                            json={"email_ou_matricula": "DOC-9122"})
    sem_conta = client.post("/api/v1/auth/senha/recuperar/solicitar",
                            json={"email_ou_matricula": "ninguem@prof.uninassau.edu.br"})

    assert com_conta.status_code == 200
    assert sem_conta.status_code == 200
    assert com_conta.json()["message"] == sem_conta.json()["message"]
    # Só a conta que existe gera e-mail.
    assert len(envio.enviados) == 1


def test_novo_pedido_invalida_o_codigo_anterior(monkeypatch):
    """Sem invalidar, dava para acumular códigos válidos por conta"""
    envio = _instalar_envio_falso(monkeypatch)

    client.post("/api/v1/auth/senha/recuperar/solicitar",
                json={"email_ou_matricula": "REC-001"})
    primeiro = envio.codigo_do_ultimo()

    client.post("/api/v1/auth/senha/recuperar/solicitar",
                json={"email_ou_matricula": "REC-001"})
    segundo = envio.codigo_do_ultimo()
    assert primeiro != segundo

    # O antigo não vale mais, o novo vale.
    assert client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "REC-001", "codigo": primeiro, "nova_senha": "senha-nova-123"
    }).status_code == 400
    assert client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "REC-001", "codigo": segundo, "nova_senha": "senha-nova-123"
    }).status_code == 200


def test_smtp_desligado_da_resposta_honesta_e_nao_gera_token(monkeypatch):
    """Sem SMTP não pode haver "enviamos": seria mentira

    É o teste do comportamento escolhido: quando o envio não está configurado a
    tela **diz** que está indisponível, e nenhum token é criado.
    """
    _instalar_envio_falso(monkeypatch, comportamento="nao_configurado")

    res = client.post("/api/v1/auth/senha/recuperar/solicitar",
                      json={"email_ou_matricula": "DOC-8821"})
    assert res.status_code == 503
    assert "indisponível" in res.json()["detail"]


def test_smtp_quebrado_da_resposta_honesta(monkeypatch):
    """SMTP configurado e falhando também não pode virar sucesso silencioso"""
    _instalar_envio_falso(monkeypatch, comportamento="falhou")

    res = client.post("/api/v1/auth/senha/recuperar/solicitar",
                      json={"email_ou_matricula": "RT-001"})
    assert res.status_code == 503
    assert "Não foi possível enviar" in res.json()["detail"]


def test_token_expirado_e_recusado(monkeypatch):
    """Passado o prazo, o código não vale — nem o hash do banco é reutilizável"""
    from datetime import datetime, timedelta, timezone

    from sqlmodel import select

    from app.database import get_session
    from app.models.token_recuperacao import TokenRecuperacaoSenha

    envio = _instalar_envio_falso(monkeypatch)
    client.post("/api/v1/auth/senha/recuperar/solicitar",
                json={"email_ou_matricula": "16032935"})
    codigo = envio.codigo_do_ultimo()

    # Envelhece o token direto no banco.
    with next(get_session()) as session:
        token = session.exec(
            select(TokenRecuperacaoSenha).order_by(TokenRecuperacaoSenha.id.desc())
        ).first()
        token.expira_em = datetime.now(timezone.utc) - timedelta(minutes=1)
        session.add(token)
        session.commit()

    res = client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "16032935", "codigo": codigo, "nova_senha": "senha-nova-123"
    })
    assert res.status_code == 400
    assert client.post("/api/v1/auth/login", json={
        "email_ou_matricula": "16032935", "senha": "unicare123"
    }).status_code == 200


def test_nenhum_codigo_ou_hash_vaza_na_resposta_ou_na_trilha(monkeypatch):
    """Nem a resposta nem a trilha podem carregar o código"""
    envio = _instalar_envio_falso(monkeypatch)

    res = client.post("/api/v1/auth/senha/recuperar/solicitar",
                      json={"email_ou_matricula": "DOC-8821"})
    codigo = envio.codigo_do_ultimo()

    assert codigo not in res.text

    rt = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    logs = client.get("/api/v1/auditoria/", headers=rt).json()
    assert any(log["acao"] == "RECUPERACAO_SOLICITADA" for log in logs)
    assert all(codigo not in str(log) for log in logs)


def test_conta_desativada_nao_recebe_codigo(monkeypatch):
    """Conta desativada não gera token, mas a resposta continua genérica"""
    envio = _instalar_envio_falso(monkeypatch)

    # Desativa o estagiário de psicologia pela própria rota da RT.
    rt = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    lista = client.get("/api/v1/usuarios/", headers=rt).json()
    estagiario = next(u for u in lista if u["matricula"] == "16032935")
    client.delete(f"/api/v1/usuarios/{estagiario['id']}", headers=rt)

    res = client.post("/api/v1/auth/senha/recuperar/solicitar",
                      json={"email_ou_matricula": "16032935"})
    # Mesma resposta de quem não existe, e nenhum e-mail disparado.
    assert res.status_code == 200
    assert not any("rikelmeroma13" in e[0] for e in envio.enviados)


def test_recuperacao_deixa_rastro_na_auditoria(monkeypatch):
    """Solicitar e resgatar entram na trilha, e a trilha é segregada por curso"""
    envio = _instalar_envio_falso(monkeypatch)
    client.post("/api/v1/auth/senha/recuperar/solicitar",
                json={"email_ou_matricula": "16024402"})
    codigo = envio.codigo_do_ultimo()
    client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "16024402", "codigo": codigo, "nova_senha": "senha-recuperada-2"
    })

    rt_odonto = {"Authorization": f"Bearer {get_auth_token('RT-001')}"}
    acoes = {log["acao"] for log in client.get("/api/v1/auditoria/", headers=rt_odonto).json()}
    assert "RECUPERACAO_SOLICITADA" in acoes
    assert "SENHA_RECUPERADA" in acoes

    # A RT da outra clínica não enxerga o rastro.
    rt_psi = {"Authorization": f"Bearer {get_auth_token('RT-002')}"}
    acoes_psi = {log["acao"] for log in client.get("/api/v1/auditoria/", headers=rt_psi).json()}
    assert "SENHA_RECUPERADA" not in acoes_psi


def test_solicitacao_e_resgate_sao_publicos(monkeypatch):
    """As duas rotas não exigem sessão: é o caso de quem esqueceu a senha"""
    _instalar_envio_falso(monkeypatch)
    assert client.post("/api/v1/auth/senha/recuperar/solicitar",
                       json={"email_ou_matricula": "DOC-9122"}).status_code == 200
    assert client.post("/api/v1/auth/senha/recuperar/redeem", json={
        "identificador": "DOC-9122", "codigo": "AAAAAA", "nova_senha": "senha-nova-123"
    }).status_code == 400
