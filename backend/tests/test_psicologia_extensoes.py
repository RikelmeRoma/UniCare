from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

_PAC_SEQ = [900]


def _headers(login: str, senha: str = "unicare123") -> dict[str, str]:
    res = client.post(
        "/api/v1/auth/login",
        json={"email_ou_matricula": login, "senha": senha},
    )
    assert res.status_code == 200, f"Falha no login de {login}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _criar_e_vincular_paciente_psico(matricula_estagiario: str = "16032935") -> tuple[int, str]:
    _PAC_SEQ[0] += 1
    n = _PAC_SEQ[0]
    recepcao = _headers("REC-002")
    nome = f"Paciente Extensao Psico {n}"
    pac = client.post(
        "/api/v1/pacientes",
        json={
            "nome": nome,
            "cpf_rg": f"{n:03d}.444.555-66",
            "data_nascimento": "1996-04-12",
            "telefone": f"(79) 9888{n:04d}",
            "endereco": f"Rua SPA Teste {n}",
            "numero": "100",
            "eh_menor": False,
            "curso": "psicologia",
        },
        headers=recepcao,
    )
    assert pac.status_code == 201, pac.text
    paciente_id = pac.json()["id"]

    vinc = client.post(
        "/api/v1/atribuicoes/psico",
        json={
            "paciente_id": paciente_id,
            "estagiario_nome": "Estagiário Teste",
            "estagiario_matricula": matricula_estagiario,
        },
        headers=recepcao,
    )
    assert vinc.status_code in (200, 201), vinc.text
    return paciente_id, nome


def test_prontuario_psico_demanda_encerramento_e_timeline():
    """Demanda e Encerramento integram a linha do tempo e seguem para homologação."""
    paciente_id, paciente_nome = _criar_e_vincular_paciente_psico("16032935")
    estagiario = _headers("16032935")
    supervisor = _headers("DOC-8821")

    # 1. Submissão de Avaliação da Demanda
    res_demanda = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Ignorado",
            "estagiario_matricula": "99999999",
            "data_sessao": "10/11/2026",
            "numero_sessao": "Avaliação da Demanda",
            "tipo_registro": "DEMANDA",
            "avaliacao_demanda": "Queixa inicial de ansiedade acadêmica persistente.",
            "objetivos_intervencao": "Fortalecer estratégias de regulação emocional.",
            "hipotese_diagnostica": "Quadro ansioso reativo em avaliação inicial.",
        },
        headers=estagiario,
    )
    assert res_demanda.status_code == 201, res_demanda.text
    demanda_json = res_demanda.json()
    assert demanda_json["tipo_registro"] == "DEMANDA"
    assert demanda_json["estagiario_matricula"] == "16032935"
    assert demanda_json["conteudo_estruturado"]["avaliacao_demanda"].startswith("Queixa inicial")
    assert "Avaliação da Demanda ou Queixa:" in demanda_json["redacao_texto"]

    # 2. Submissão clássica de Sessão (compatível sem informar tipo_registro)
    res_sessao = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "11/11/2026",
            "numero_sessao": "Sessão 01",
            "redacao_texto": "Acolhimento inicial e escuta clínica estruturada sem uso de citações diretas.",
        },
        headers=estagiario,
    )
    assert res_sessao.status_code == 201, res_sessao.text
    assert res_sessao.json()["tipo_registro"] == "SESSAO"
    assert res_sessao.json()["conteudo_estruturado"] is None

    # 3. Submissão de Registro de Encerramento com múltiplos motivos válidos
    res_enc = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "12/11/2026",
            "numero_sessao": "Encerramento",
            "tipo_registro": "ENCERRAMENTO",
            "avaliacao_final": "Paciente alcançou redução significativa dos sintomas e autonomia.",
            "motivos_encerramento": [
                "Alta do Cliente/Finalização",
                "Finalização do período de estágio",
            ],
            "informacoes_adicionais": "Orientado retorno caso haja necessidade futura.",
        },
        headers=estagiario,
    )
    assert res_enc.status_code == 201, res_enc.text
    enc_json = res_enc.json()
    assert enc_json["tipo_registro"] == "ENCERRAMENTO"
    assert enc_json["conteudo_estruturado"]["motivos_encerramento"] == [
        "Finalização do período de estágio",
        "Alta do Cliente/Finalização",
    ]

    # 4. Todos os 3 tipos aparecem na listagem unificada e aceitam homologação docente
    lista = client.get("/api/v1/prontuarios/psico", headers=supervisor).json()
    tipos_paciente = {r["tipo_registro"] for r in lista if r["paciente_id"] == paciente_id}
    assert tipos_paciente == {"DEMANDA", "SESSAO", "ENCERRAMENTO"}

    hom_demanda = client.patch(
        f"/api/v1/prontuarios/psico/{demanda_json['id']}/homologar",
        json={"decisao": "VALIDADO", "parecer": "Demanda bem estruturada conforme CFP."},
        headers=supervisor,
    )
    assert hom_demanda.status_code == 200, hom_demanda.text
    assert hom_demanda.json()["status"] == "VALIDADO"


def test_demanda_e_encerramento_rejeitam_aspas_e_campos_invalidos():
    """RN-002 (anti-aspas) e validação de obrigatoriedade valem também nas novas folhas."""
    paciente_id, paciente_nome = _criar_e_vincular_paciente_psico("16032935")
    estagiario = _headers("16032935")

    # Demanda com aspas (RN-002) -> 422
    res_aspas = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "11/11/2026",
            "numero_sessao": "Avaliação da Demanda",
            "tipo_registro": "DEMANDA",
            "avaliacao_demanda": 'Paciente afirmou "nao aguento mais".',
            "objetivos_intervencao": "Reduzir sobrecarga.",
            "hipotese_diagnostica": "Em acompanhamento.",
        },
        headers=estagiario,
    )
    assert res_aspas.status_code == 422, res_aspas.text
    assert "CFP" in res_aspas.text or "RN-002" in res_aspas.text

    # Demanda com campo vazio -> 422
    res_vazia = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "11/11/2026",
            "numero_sessao": "Avaliação da Demanda",
            "tipo_registro": "DEMANDA",
            "avaliacao_demanda": "Queixa valida",
            "objetivos_intervencao": "   ",
            "hipotese_diagnostica": "Hipotese valida",
        },
        headers=estagiario,
    )
    assert res_vazia.status_code == 422

    # Encerramento sem nenhum checkbox -> 422
    res_sem_motivo = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "11/11/2026",
            "numero_sessao": "Encerramento",
            "tipo_registro": "ENCERRAMENTO",
            "avaliacao_final": "Caso concluido.",
            "motivos_encerramento": [],
        },
        headers=estagiario,
    )
    assert res_sem_motivo.status_code == 422

    # Encerramento com motivo fora das 6 opções -> 422
    res_motivo_invalido = client.post(
        "/api/v1/prontuarios/psico",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "data_sessao": "11/11/2026",
            "numero_sessao": "Encerramento",
            "tipo_registro": "ENCERRAMENTO",
            "avaliacao_final": "Caso concluido.",
            "motivos_encerramento": ["Motivo inventado"],
        },
        headers=estagiario,
    )
    assert res_motivo_invalido.status_code == 422


def test_recepcao_registra_ocorrencia_estagiario_e_respeita_rbac():
    """Recepção registra ocorrência no aluno; aluno vê a sua, supervisor vê seus orientandos, outra clínica recebe 403."""
    recepcao_psi = _headers("REC-002")
    recepcao_odonto = _headers("REC-001")
    estagiario_a = _headers("16032935")
    estagiario_b = _headers("16051234")
    supervisor_psi = _headers("DOC-8821")

    # Estagiário e supervisor NÃO podem registrar ocorrência
    assert (
        client.post(
            "/api/v1/ocorrencias/psico",
            json={
                "estagiario_matricula": "16032935",
                "tipo": "ATRASO",
                "data_ocorrencia": "2026-11-11",
                "descricao": "Tentativa indevida",
            },
            headers=estagiario_a,
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/ocorrencias/psico",
            json={
                "estagiario_matricula": "16032935",
                "tipo": "ATRASO",
                "data_ocorrencia": "2026-11-11",
                "descricao": "Supervisor tentando registrar pela recepção",
            },
            headers=supervisor_psi,
        ).status_code
        == 403
    )

    # Recepção da odontologia recebe 403
    assert (
        client.post(
            "/api/v1/ocorrencias/psico",
            json={
                "estagiario_matricula": "16032935",
                "tipo": "ATRASO",
                "data_ocorrencia": "2026-11-11",
                "descricao": "Tentativa de outra clinica",
            },
            headers=recepcao_odonto,
        ).status_code
        == 403
    )
    assert client.get("/api/v1/ocorrencias/psico", headers=recepcao_odonto).status_code == 403

    # Estagiário de outro curso ou matrícula inexistente é recusado
    assert (
        client.post(
            "/api/v1/ocorrencias/psico",
            json={
                "estagiario_matricula": "16024402",
                "tipo": "FALTA",
                "data_ocorrencia": "2026-11-11",
                "descricao": "Aluno de odontologia",
            },
            headers=recepcao_psi,
        ).status_code
        == 400
    )

    # Recepção da psicologia registra ocorrência válida para 16032935
    criada = client.post(
        "/api/v1/ocorrencias/psico",
        json={
            "estagiario_matricula": "16032935",
            "tipo": "ATRASO",
            "data_ocorrencia": "2026-11-11",
            "descricao": "Atraso de 20 minutos para o atendimento das 14h sem aviso prévio.",
        },
        headers=recepcao_psi,
    )
    assert criada.status_code == 201, criada.text
    oc = criada.json()
    assert oc["estagiario_matricula"] == "16032935"
    assert oc["registrado_por_matricula"] == "REC-002"
    assert oc["curso"] == "psicologia"

    # Estagiário A vê sua ocorrência; colega Estagiário B não vê
    lista_a = client.get("/api/v1/ocorrencias/psico", headers=estagiario_a).json()
    lista_b = client.get("/api/v1/ocorrencias/psico", headers=estagiario_b).json()
    assert any(item["id"] == oc["id"] for item in lista_a)
    assert not any(item["id"] == oc["id"] for item in lista_b)

    # Supervisor de 16032935 (DOC-8821) vê a ocorrência
    lista_sup = client.get("/api/v1/ocorrencias/psico", headers=supervisor_psi).json()
    assert any(item["id"] == oc["id"] for item in lista_sup)


def test_seis_consultorios_spa_e_ocupacao():
    """Alocação de salas na psicologia expõe os 6 consultórios SPA e marca sala ocupada."""
    recepcao_psi = _headers("REC-002")
    recepcao_odonto = _headers("REC-001")
    paciente_id, paciente_nome = _criar_e_vincular_paciente_psico("16032935")

    assert (
        client.get("/api/v1/agendamentos/salas-psico", headers=recepcao_odonto).status_code
        == 403
    )

    # Cria agendamento no Consultório SPA-04 em horário exclusivo de teste
    ag = client.post(
        "/api/v1/agendamentos",
        json={
            "paciente_id": paciente_id,
            "paciente_nome": paciente_nome,
            "estagiario_nome": "Rikelme",
            "estagiario_matricula": "16032935",
            "curso": "psicologia",
            "data_sessao": "2026-12-15",
            "horario": "15:30",
            "turno": "tarde",
            "sala_ou_cadeira": "Consultório SPA-04",
            "tipo_consulta": "Psicoterapia",
        },
        headers=recepcao_psi,
    )
    assert ag.status_code == 201, ag.text

    salas = client.get(
        "/api/v1/agendamentos/salas-psico?data_sessao=2026-12-15&horario=15:30",
        headers=recepcao_psi,
    )
    assert salas.status_code == 200, salas.text
    payload = salas.json()
    assert payload["total_salas"] == 6
    assert len(payload["salas"]) == 6

    por_nome = {s["nome"]: s for s in payload["salas"]}
    assert set(por_nome.keys()) == {f"Consultório SPA-0{i}" for i in range(1, 7)}
    assert por_nome["Consultório SPA-04"]["disponivel"] is False
    assert por_nome["Consultório SPA-04"]["ocupacao"]["horario"] == "15:30"
    assert por_nome["Consultório SPA-01"]["disponivel"] is True
