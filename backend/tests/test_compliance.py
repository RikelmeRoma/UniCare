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
        "inicio_sessao_texto": 'Paciente relatou pontualmente que "está sentindo muita ansiedade"', # Aspas proibidas
        "meio_sessao_texto": "Intervenção técnica com reestruturação cognitiva.",
        "fim_sessao_texto": "Pactuado automonitoramento."
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
    """RN-002 & RNF-003: Submissão de síntese clínica técnica sem aspas é aceita com sucesso"""
    token_estagiario = get_auth_token("16032935")
    headers = {"Authorization": f"Bearer {token_estagiario}"}

    payload_valido = {
        "paciente_id": 1,
        "paciente_nome": "Marcos Aurélio Silveira",
        "estagiario_nome": "Rikelme Roma Santos",
        "estagiario_matricula": "16032935",
        "data_sessao": "16/09/2026",
        "numero_sessao": "Sessão 05",
        "inicio_sessao_texto": "Acolhimento pontual. Paciente manifestou queixas somatizadas de ansiedade diante do período de avaliações acadêmicas.",
        "meio_sessao_texto": "Aplicação de técnica de identificação de distorções cognitivas. Paciente demonstrou boa capacidade reflexiva e flexibilidade.",
        "fim_sessao_texto": "Fechamento com registro de pensamentos automáticos disfuncionais. Sem sinais de risco ou ideação autolesiva.",
        "supervisor_nome": "Prof. Dr. Robert Santos do Carmo"
    }

    res = client.post("/api/v1/prontuarios/psico", json=payload_valido, headers=headers)
    assert res.status_code == 201
    prontuario = res.json()
    assert prontuario["status"] == "AGUARDANDO_VALIDACAO"
    assert prontuario["id"] is not None

    PRONTUARIO_SUBMETIDO_ID["id"] = prontuario["id"]

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

def test_rf007_impedimento_cpf_duplicado():
    """RF-007: O sistema impede o cadastro de múltiplos pacientes com o mesmo CPF"""
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

def test_rf009_fila_demandas_de_estagio():
    """RF-009: A fila de trabalho dos estagiários persiste no banco e é conciliável pela recepção"""
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
            "inicio_sessao_texto": "Síntese sem aspas.",
            "meio_sessao_texto": "Síntese do meio.",
            "fim_sessao_texto": "Síntese do fim."
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

def test_vslice_auditoria_filtrada_por_curso():
    """Vertical slice: o log de auditoria é dado pessoal (LGPD Art. 11) e não vaza entre clínicas"""
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

def test_seg_auditoria_registra_ip_real():
    """O log de auditoria carrega o IP da requisição, não um loopback fixo

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
