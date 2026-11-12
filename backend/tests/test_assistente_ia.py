from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.config import settings
from app.database import get_session
from app.main import app
from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
from app.models.auditoria import LogAuditoria
from app.models.paciente import Paciente
from app.models.prontuario import ProntuarioPsico
from app.models.usuario import CursoUsuario, PerfilUsuario, Usuario
from app.services.auth_service import create_access_token
from app.services.crypto_service import get_password_hash


@pytest.fixture
def ia_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def _override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = _override_session
    try:
        with Session(engine) as s:
            senha = get_password_hash("Teste@1234")
            usuarios = [
                Usuario(
                    nome="Estagiária Psico",
                    email="est.psi@unicare.test",
                    matricula="EST-PSI-01",
                    senha_hash=senha,
                    perfil=PerfilUsuario.ESTAGIARIO,
                    curso=CursoUsuario.PSICOLOGIA,
                    ativo=True,
                ),
                Usuario(
                    nome="Estagiário Odonto",
                    email="est.odo@unicare.test",
                    matricula="EST-ODO-01",
                    senha_hash=senha,
                    perfil=PerfilUsuario.ESTAGIARIO,
                    curso=CursoUsuario.ODONTOLOGIA,
                    ativo=True,
                ),
                Usuario(
                    nome="Recepção Central",
                    email="rec.psi@unicare.test",
                    matricula="REC-01",
                    senha_hash=senha,
                    perfil=PerfilUsuario.RECEPCAO,
                    curso=CursoUsuario.PSICOLOGIA,
                    ativo=True,
                ),
            ]
            for u in usuarios:
                s.add(u)

            p_psi = Paciente(
                nome="Carlos Eduardo Silva",
                cpf_rg="12345678909",
                data_nascimento="1995-04-10",
                telefone="79999998888",
                endereco="Rua Sigilosa 999",
                curso="psicologia",
            )
            p_psi_nao_vinculado = Paciente(
                nome="Outro Paciente Psico",
                cpf_rg="98765432100",
                data_nascimento="1992-01-01",
                telefone="79988887777",
                curso="psicologia",
            )
            p_odo = Paciente(
                nome="Mariana Costa",
                cpf_rg="11122233396",
                data_nascimento="1988-08-20",
                telefone="79977776666",
                curso="odontologia",
            )
            s.add(p_psi)
            s.add(p_psi_nao_vinculado)
            s.add(p_odo)
            s.commit()
            s.refresh(p_psi)
            s.refresh(p_psi_nao_vinculado)
            s.refresh(p_odo)

            s.add(
                AtribuicaoClinica(
                    paciente_id=p_psi.id,
                    curso="psicologia",
                    estagiario_matricula="EST-PSI-01",
                    estagiario_nome="Estagiária Psico",
                    atribuido_por_matricula="REC-01",
                    atribuido_por_nome="Recepção Central",
                    situacao=SituacaoAtribuicao.ATIVA,
                )
            )
            s.add(
                ProntuarioPsico(
                    paciente_id=p_psi.id,
                    paciente_nome=p_psi.nome,
                    estagiario_nome="Estagiária Psico",
                    estagiario_matricula="EST-PSI-01",
                    data_sessao="10/11/2026",
                    numero_sessao="Sessão 01",
                    tipo_registro="SESSAO",
                    redacao_texto="Paciente compareceu para acolhimento inicial relatando ansiedade laboral.",
                )
            )
            s.commit()
            ids = {
                "psi_id": p_psi.id,
                "psi_sem_vinculo_id": p_psi_nao_vinculado.id,
                "odo_id": p_odo.id,
            }

        yield TestClient(app), engine, ids
    finally:
        app.dependency_overrides.pop(get_session, None)


def _auth(email: str) -> dict[str, str]:
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


def test_rn001_recepcao_bloqueada_nas_rotas_ia(ia_client):
    client, _, ids = ia_client
    headers = _auth("rec.psi@unicare.test")

    assert client.get("/api/v1/ia/status", headers=headers).status_code == 403
    resp = client.post(
        "/api/v1/ia/assistente",
        headers=headers,
        data={"paciente_id": str(ids["psi_id"]), "curso": "psicologia", "mensagem": "Resumo"},
    )
    assert resp.status_code == 403
    assert "RN-001" in resp.json()["detail"]


def test_isolamento_curso_e_vinculo_estagiario(ia_client):
    client, _, ids = ia_client
    headers_psi = _auth("est.psi@unicare.test")

    # Psicologia tentando consultar paciente exclusivo de Odontologia -> 403
    r_curso = client.post(
        "/api/v1/ia/assistente",
        headers=headers_psi,
        data={"paciente_id": str(ids["odo_id"]), "curso": "odontologia", "mensagem": "Resumo"},
    )
    assert r_curso.status_code == 403

    # Estagiário tentando consultar paciente de Psicologia não vinculado a ele -> 403
    r_sem_vinculo = client.post(
        "/api/v1/ia/assistente",
        headers=headers_psi,
        data={"paciente_id": str(ids["psi_sem_vinculo_id"]), "curso": "psicologia", "mensagem": "Resumo"},
    )
    assert r_sem_vinculo.status_code == 403


def test_assistente_psico_sanitiza_aspas_anonimiza_lgpd_e_faz_fallback(ia_client, monkeypatch):
    client, engine, ids = ia_client
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "chave-falsa-para-teste")
    monkeypatch.setattr(settings, "GEMINI_MODEL_PRIMARY", "gemini-3.8-flash")
    monkeypatch.setattr(settings, "GEMINI_MODEL_FALLBACK", "gemini-3.5-flash")

    chamadas = []

    class FakeInteractions:
        def create(self, **kwargs):
            chamadas.append(kwargs)
            if kwargs["model"] == "gemini-3.8-flash":
                raise RuntimeError("503 service_unavailable")
            return SimpleNamespace(
                output_text=(
                    '{"transcricao": null, '
                    '"resposta": "Síntese preparada para revisão.", '
                    '"redacao_texto": "O paciente relatou \\"muita pressão\\" no trabalho e “cansaço”.", '
                    '"avaliacao_demanda": null, "objetivos_intervencao": null, '
                    '"hipotese_diagnostica": null, "avaliacao_final": null, '
                    '"informacoes_adicionais": null, "alertas_clinicos": ["Monitorar estresse"]}'
                )
            )

    monkeypatch.setattr(
        "app.services.gemini_service.genai.Client",
        lambda api_key: SimpleNamespace(interactions=FakeInteractions()),
    )

    resp = client.post(
        "/api/v1/ia/assistente",
        headers=_auth("est.psi@unicare.test"),
        data={
            "paciente_id": str(ids["psi_id"]),
            "curso": "psicologia",
            "modo": "rascunho",
            "aba_atual": "registro",
            "mensagem": "Rascunhe a sessão de hoje",
        },
    )
    assert resp.status_code == 200
    body = resp.json()

    # Fallback aconteceu automaticamente de gemini-3.8-flash para gemini-3.5-flash
    assert [c["model"] for c in chamadas] == ["gemini-3.8-flash", "gemini-3.5-flash"]
    assert body["modelo_utilizado"] == "gemini-3.5-flash"

    # Sanitização anti-aspas (CFP 06/2019) garantida deterministicamente
    redacao = body["campos_sugeridos"]["redacao_texto"]
    assert all(q not in redacao for q in ('"', "“", "”", "«", "»"))
    assert "muita pressão" in redacao

    # Anonimização LGPD: dados identificadores diretos nunca foram enviados no prompt
    prompt_enviado = chamadas[1]["input"]
    assert "12345678909" not in prompt_enviado
    assert "79999998888" not in prompt_enviado
    assert "Rua Sigilosa 999" not in prompt_enviado
    assert "Carlos Eduardo Silva" not in prompt_enviado
    assert "C.E.S." in prompt_enviado
    assert chamadas[1]["store"] is False

    # Trilha de auditoria LGPD registrada
    with Session(engine) as s:
        logs = s.exec(select(LogAuditoria).where(LogAuditoria.acao == "CONSULTA_ASSISTENTE_IA")).all()
        assert len(logs) == 1
        assert logs[0].registro_id == ids["psi_id"]


def test_transcrever_audio_odonto_e_validacao_formato(ia_client, monkeypatch):
    client, engine, ids = ia_client
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "chave-falsa-para-teste")

    class FakeInteractions:
        def create(self, **kwargs):
            assert isinstance(kwargs["input"], list)
            assert kwargs["input"][1]["type"] == "audio"
            assert kwargs["input"][1]["mime_type"] == "audio/webm"
            return SimpleNamespace(
                output_text="Restauração em resina composta classe II MOD no dente 36 sob isolamento absoluto."
            )

    monkeypatch.setattr(
        "app.services.gemini_service.genai.Client",
        lambda api_key: SimpleNamespace(interactions=FakeInteractions()),
    )

    headers_odo = _auth("est.odo@unicare.test")

    # Formato não suportado -> 415
    r_bad = client.post(
        "/api/v1/ia/transcrever",
        headers=headers_odo,
        data={"curso": "odontologia", "campo_alvo": "evolucao"},
        files={"audio": ("fala.txt", b"nao-eh-audio", "text/plain")},
    )
    assert r_bad.status_code == 415

    # Áudio válido -> 200 + log
    r_ok = client.post(
        "/api/v1/ia/transcrever",
        headers=headers_odo,
        data={"curso": "odontologia", "campo_alvo": "evolucao", "paciente_id": str(ids["odo_id"])},
        files={"audio": ("fala.webm", b"\x1a\x45\xdf\xa3fake-webm", "audio/webm;codecs=opus")},
    )
    assert r_ok.status_code == 200
    assert "dente 36" in r_ok.json()["texto"]

    with Session(engine) as s:
        logs = s.exec(select(LogAuditoria).where(LogAuditoria.acao == "DITADO_VOZ_IA")).all()
        assert len(logs) == 1
