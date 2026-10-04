import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def initialize_database():
    with TestClient(app):
        yield

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
        ("REC-001", "recepcao"),
        ("RT-001", "rt"),
    ]
    for matricula, perfil_esperado in perfis:
        token = get_auth_token(matricula)
        headers = {"Authorization": f"Bearer {token}"}
        res_me = client.get("/api/v1/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["perfil"] == perfil_esperado

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
    payload_duplicado = {
        "nome": "Clone Invalido",
        "cpf_rg": "04829154588", # Mesmo CPF sem pontuação
        "data_nascimento": "1995-01-01",
        "telefone": "(79) 99999-0000",
        "eh_menor": False,
        "curso": "psicologia"
    }
    res = client.post("/api/v1/pacientes", json=payload_duplicado, headers=headers)
    assert res.status_code == 400
    assert "RF-007" in res.json()["detail"]

def test_rf004_homologacao_docente_supervisor():
    """RF-004: O supervisor valida a evolução do estagiário com visto digital e parecer pedagógico"""
    token_supervisor = get_auth_token("DOC-8821")
    headers = {"Authorization": f"Bearer {token_supervisor}"}

    # Homologa o prontuário 1 (submetido pelo estagiário Rikelme Roma)
    payload_homologacao = {
        "decisao": "VALIDADO",
        "parecer": "Evolução clínica exemplar. Síntese conceitual adequada aos preceitos da TCC. Visto digital deferido."
    }
    res = client.patch("/api/v1/prontuarios/psico/1/homologar", json=payload_homologacao, headers=headers)
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
