import json
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlmodel import Session

from app.config import settings
from app.database import get_session
from app.models.usuario import Usuario
from app.schemas.ia import (
    AssistenteCurso,
    AssistenteModo,
    AssistenteResponse,
    HistoricoMensagemIA,
    IaStatusResponse,
    TranscricaoResponse,
)
from app.services.auditoria_service import ip_do_cliente, registrar_log
from app.services.auth_service import autorizado_clinico
from app.services.gemini_service import (
    TAMANHO_MAX_AUDIO_BYTES,
    consultar_assistente_clinico,
    transcrever_ditado_clinico,
)

router = APIRouter(prefix="/ia", tags=["Assistente Clínico IA (Gemini)"])


def _exigir_curso_clinico(usuario: Usuario, curso_solicitado: AssistenteCurso) -> None:
    curso_usuario = usuario.curso.value
    if curso_usuario != curso_solicitado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado: assistente de {curso_solicitado} restrito a usuários "
                f"desse curso. Seu cadastro é '{curso_usuario}'."
            ),
        )


async def _ler_audio_limitado(audio: Optional[UploadFile]) -> tuple[Optional[bytes], Optional[str]]:
    if audio is None:
        return None, None
    bruto = await audio.read(TAMANHO_MAX_AUDIO_BYTES + 1)
    if len(bruto) > TAMANHO_MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="O áudio excede o limite de 10 MB por envio.",
        )
    if not bruto:
        return None, None
    return bruto, audio.content_type


@router.get("/status", response_model=IaStatusResponse)
def status_assistente(
    _current_user: Usuario = Depends(autorizado_clinico),
):
    return IaStatusResponse(
        configurado=settings.gemini_configurado,
        modelo_padrao=settings.GEMINI_MODEL_PRIMARY,
        modelos_fallback=[
            m.strip() for m in settings.GEMINI_MODEL_FALLBACK.split(",") if m.strip()
        ],
        modelo_transcricao=settings.GEMINI_MODEL_TRANSCRIBE,
    )


@router.post("/assistente", response_model=AssistenteResponse)
async def consultar_assistente(
    http_request: Request,
    paciente_id: int = Form(...),
    curso: AssistenteCurso = Form(...),
    modo: AssistenteModo = Form("chat"),
    aba_atual: str = Form("geral"),
    mensagem: str = Form(""),
    rascunho_atual: str = Form(""),
    historico_json: str = Form("[]"),
    ficha_resumo_json: str = Form("{}"),
    audio: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico),
):
    _exigir_curso_clinico(current_user, curso)

    try:
        historico_bruto = json.loads(historico_json or "[]")
        historico = [
            HistoricoMensagemIA.model_validate(item) for item in historico_bruto
        ]
    except (json.JSONDecodeError, TypeError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato inválido em historico_json.",
        ) from exc

    try:
        ficha_resumo = json.loads(ficha_resumo_json or "{}")
        if not isinstance(ficha_resumo, dict):
            raise ValueError("ficha_resumo_json deve ser um objeto JSON.")
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato inválido em ficha_resumo_json.",
        ) from exc

    audio_bytes, audio_mime = await _ler_audio_limitado(audio)

    resposta = consultar_assistente_clinico(
        session=session,
        usuario=current_user,
        paciente_id=paciente_id,
        curso=curso,
        modo=modo,
        aba_atual=aba_atual,
        mensagem=mensagem,
        rascunho_atual=rascunho_atual,
        ficha_resumo=ficha_resumo,
        historico=historico,
        audio_bytes=audio_bytes,
        audio_mime_type=audio_mime,
    )

    registrar_log(
        session,
        current_user,
        "CONSULTA_ASSISTENTE_IA",
        "pacientes",
        paciente_id,
        endereco_ip=ip_do_cliente(http_request),
    )

    return resposta


@router.post("/transcrever", response_model=TranscricaoResponse)
async def transcrever_ditado(
    http_request: Request,
    curso: AssistenteCurso = Form(...),
    campo_alvo: str = Form("prontuario"),
    paciente_id: Optional[int] = Form(None),
    audio: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico),
):
    _exigir_curso_clinico(current_user, curso)
    audio_bytes, audio_mime = await _ler_audio_limitado(audio)
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Envie um áudio válido para transcrição.",
        )

    resposta = transcrever_ditado_clinico(
        curso=curso,
        campo_alvo=campo_alvo,
        audio_bytes=audio_bytes,
        audio_mime_type=audio_mime,
    )

    registrar_log(
        session,
        current_user,
        "DITADO_VOZ_IA",
        "pacientes" if paciente_id else f"ia_{curso}",
        paciente_id,
        endereco_ip=ip_do_cliente(http_request),
    )

    return resposta
