import base64
import json
import logging
import re
from datetime import date, datetime
from typing import Any, Optional, Sequence, Tuple, Type

from fastapi import HTTPException, status
from google import genai
from pydantic import BaseModel
from sqlmodel import Session, or_, select

from app.config import settings
from app.models.anamnese import Anamnese
from app.models.paciente import Paciente
from app.models.prontuario import (
    DocumentoFichaOdonto,
    FichaOdonto,
    ProntuarioPsico,
    RadiografiaOdonto,
)
from app.models.usuario import PerfilUsuario, Usuario
from app.routers.prontuarios import (
    _matriculas_supervisionadas,
    _pode_ver_documento,
    _validar_paciente_do_curso,
    _validar_vinculo_estagiario,
)
from app.schemas.ia import (
    AssistenteCurso,
    AssistenteModo,
    AssistenteResponse,
    HistoricoMensagemIA,
    SaidaOdontologiaLLM,
    SaidaPsicologiaLLM,
    TranscricaoResponse,
)

logger = logging.getLogger(__name__)

_ASPAS_PROIBIDAS = re.compile(r'["“”«»]')
_TIPOS_AUDIO_PERMITIDOS = {
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
    "audio/flac",
}
TAMANHO_MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB

_INSTRUCAO_BASE = (
    "Você é o Assistente Clínico Inteligente do sistema UniCare (Clínicas-Escola "
    "UNINASSAU), atuando em apoio a profissionais, estagiários e supervisores de saúde.\n"
    "PRINCÍPIOS INVIOLÁVEIS:\n"
    "1. Idioma: português do Brasil, tom técnico, claro, ético e objetivo.\n"
    "2. Veracidade clínica: NUNCA invente achados, sinais vitais, alergias, medicações, "
    "dentes/regiões ou relatos que não estejam nos dados do paciente nem na mensagem/áudio "
    "enviado agora. Quando faltar informação, aponte explicitamente o que precisa ser verificado.\n"
    "3. Apoio à decisão: suas sugestões NÃO substituem a avaliação presencial nem a "
    "homologação docente; deixe claro quando houver necessidade de conferência.\n"
    "4. Privacidade LGPD: trabalhe estritamente com o contexto clínico anonimizado fornecido."
)

_INSTRUCAO_PSICOLOGIA = (
    _INSTRUCAO_BASE
    + "\n\nESPECIALIDADE: PSICOLOGIA (Resolução CFP nº 06/2019 e padrão UniCare)\n"
    "- REGRA ABSOLUTA ANTI-ASPAS (CFP 06/2019): JAMAIS utilize aspas duplas ou angulares "
    "(\" “ ” « ») nem transcreva falas literais do paciente em nenhum campo.\n"
    "- Redija em 3ª pessoa, linguagem técnica impessoal e objetiva (ex.: 'O paciente "
    "relatou...', 'Durante o acolhimento, observou-se...').\n"
    "- Na aba 'registro' (SESSAO): estruture a síntese em parágrafos cronológicos do "
    "acolhimento ao fechamento para o campo `redacao_texto`.\n"
    "- Na aba 'demanda' (DEMANDA): preencha `avaliacao_demanda`, "
    "`objetivos_intervencao` e `hipotese_diagnostica` com linguagem clínica cautelosa.\n"
    "- Na aba 'encerramento' (ENCERRAMENTO): preencha `avaliacao_final` e "
    "`informacoes_adicionais`.\n"
    "- Se o pedido for apenas consulta/resumo do caso (`modo=resumo` ou pergunta geral sem "
    "pedido de redação), deixe os campos de rascunho como `null` e responda em `resposta`."
)

_INSTRUCAO_ODONTOLOGIA = (
    _INSTRUCAO_BASE
    + "\n\nESPECIALIDADE: ODONTOLOGIA (Normas CFO, CLI-FOR-45 Adulto e Odontopediatria)\n"
    "- ANTES de sugerir conduta, medicação ou anestésico, verifique SEMPRE alergias, "
    "comorbidades (hipertensão, diabetes, cardiopatias, coagulopatias, gestação), "
    "medicações em uso e sinais vitais no contexto e liste riscos críticos em `alertas_clinicos`.\n"
    "- Utilize nomenclatura odontológica padrão e notação dental FDI quando informada "
    "(ex.: dente 16, face MO, dentina profunda).\n"
    "- Na aba 'anamnese': ajude a organizar queixa e história da doença atual em `historia_doenca`.\n"
    "- Na aba 'plano': organize etapas claras e sequenciais em `plano_tratamento`.\n"
    "- Na aba 'evolucao': estruture registro técnico da sessão em `evolucao_procedimento` "
    "(procedimento, dente/região, materiais, anestésico quando ditados).\n"
    "- Na aba 'exame' ou 'exames': estruture achados em `observacoes_exame`.\n"
    "- Se o pedido for apenas dúvida/resumo sem pedido de texto para a ficha, deixe os "
    "campos de rascunho como `null` e responda em `resposta`."
)


def _sanitizar_erro(texto: str) -> str:
    chave = settings.GEMINI_API_KEY.strip()
    if chave:
        texto = texto.replace(chave, "[CHAVE_OCULTA]")
    return texto


def _normalizar_mime_audio(mime: Optional[str]) -> str:
    base = (mime or "audio/webm").split(";")[0].strip().lower()
    if base not in _TIPOS_AUDIO_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Formato de áudio não suportado ({base or 'desconhecido'}). "
                "Envie áudio em WebM, OGG, WAV, MP3 ou MP4/M4A."
            ),
        )
    if base == "audio/x-wav":
        return "audio/wav"
    if base == "audio/mp3":
        return "audio/mpeg"
    return base


def _remover_aspas_psico(texto: Optional[str]) -> Optional[str]:
    if texto is None:
        return None
    limpo = _ASPAS_PROIBIDAS.sub("", texto)
    return re.sub(r"[ \t]{2,}", " ", limpo).strip()


def _calcular_idade_texto(data_nasc: Optional[str]) -> str:
    if not data_nasc:
        return "não informada"
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            nasc = datetime.strptime(data_nasc.strip()[:10], fmt).date()
            hoje = date.today()
            anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
            if 0 <= anos <= 125:
                return f"{anos} anos"
        except ValueError:
            continue
    return "não informada"


def _iniciais_paciente(nome: str) -> str:
    partes = [p for p in (nome or "").strip().split() if p]
    if not partes:
        return "Paciente"
    return ".".join(p[0].upper() for p in partes[:3]) + "."


def _extrair_resumo_documento_odonto(conteudo: Optional[dict]) -> dict[str, Any]:
    if not isinstance(conteudo, dict):
        return {}
    anamnese = conteudo.get("anamnese")
    if not isinstance(anamnese, dict):
        return {}

    resumo: dict[str, Any] = {}
    for chave in (
        "historiaMedica",
        "historiaOdontologica",
        "habitos",
        "avaliacaoPsicologica",
        "posNatalSaude",
        "antecedentesHereditarios",
        "planoTratamento",
    ):
        if chave in anamnese and anamnese[chave]:
            resumo[chave] = anamnese[chave]

    exame_dental = anamnese.get("exameDental")
    if isinstance(exame_dental, dict):
        resumo["exameDental"] = {
            "planejamento": exame_dental.get("planejamento", [])[:12],
            "evolucao_recente": exame_dental.get("evolucao", [])[-6:],
            "exames": exame_dental.get("exames", {}),
        }
    evolucao_infantil = anamnese.get("evolucao")
    if isinstance(evolucao_infantil, list) and evolucao_infantil:
        resumo["evolucao_infantil_recente"] = evolucao_infantil[-6:]
    return resumo


def validar_e_construir_contexto_paciente(
    session: Session,
    usuario: Usuario,
    paciente_id: int,
    curso: AssistenteCurso,
) -> Tuple[Paciente, str]:
    """Valida RBAC/vínculo no servidor e monta resumo clínico anonimizado (LGPD)."""
    paciente = _validar_paciente_do_curso(session, paciente_id, curso)

    cabecalho = (
        f"Paciente (identificação anonimizada): {_iniciais_paciente(paciente.nome)} | "
        f"Faixa etária/idade: {_calcular_idade_texto(paciente.data_nascimento)} | "
        f"Menor de idade: {'Sim' if paciente.eh_menor else 'Não'} | "
        f"Clínica consultada: {curso}"
    )

    if curso == "psicologia":
        _validar_vinculo_estagiario(session, usuario, paciente_id)
        query = select(ProntuarioPsico).where(ProntuarioPsico.paciente_id == paciente_id)
        if usuario.perfil == PerfilUsuario.ESTAGIARIO:
            query = query.where(ProntuarioPsico.estagiario_matricula == usuario.matricula)
        registros = session.exec(query.order_by(ProntuarioPsico.id.desc()).limit(12)).all()

        linhas = [cabecalho]
        if not registros:
            linhas.append("Histórico psicológico registrado: nenhuma sessão ou folha anterior no banco.")
        else:
            linhas.append(f"Histórico psicológico recente ({len(registros)} registro(s), do mais recente ao mais antigo):")
            for reg in registros:
                texto_resumido = (reg.redacao_texto or "").strip()[:1200]
                linhas.append(
                    f"- [{reg.data_sessao}] {reg.tipo_registro} | {reg.numero_sessao} | "
                    f"Status: {reg.status.value}\n  Síntese: {texto_resumido}"
                )
                if reg.parecer_supervisor:
                    linhas.append(f"  Parecer do supervisor: {reg.parecer_supervisor[:400]}")
        return paciente, "\n".join(linhas)

    # Odontologia
    anamneses = session.exec(
        select(Anamnese)
        .where(Anamnese.paciente_id == paciente_id)
        .order_by(Anamnese.afetido_em.desc())
        .limit(5)
    ).all()

    fichas_query = select(FichaOdonto).where(FichaOdonto.paciente_id == paciente_id)
    if usuario.perfil == PerfilUsuario.ESTAGIARIO:
        fichas_query = fichas_query.where(
            or_(
                FichaOdonto.operador_matricula == usuario.matricula,
                FichaOdonto.auxiliar_matricula == usuario.matricula,
            )
        )
    elif usuario.perfil == PerfilUsuario.SUPERVISOR:
        matriculas = _matriculas_supervisionadas(session, usuario)
        fichas_query = fichas_query.where(
            or_(
                FichaOdonto.operador_matricula.in_(matriculas),
                FichaOdonto.auxiliar_matricula.in_(matriculas),
            )
        )
    fichas = session.exec(fichas_query.order_by(FichaOdonto.id.desc()).limit(10)).all()

    doc = session.exec(
        select(DocumentoFichaOdonto)
        .where(DocumentoFichaOdonto.paciente_id == paciente_id)
        .order_by(DocumentoFichaOdonto.atualizado_em.desc())
    ).first()
    doc_visivel = doc if (doc and _pode_ver_documento(session, usuario, doc)) else None

    radiografias = session.exec(
        select(RadiografiaOdonto)
        .where(RadiografiaOdonto.paciente_id == paciente_id)
        .order_by(RadiografiaOdonto.id.desc())
        .limit(6)
    ).all()

    linhas = [cabecalho]
    if anamneses:
        linhas.append("Sinais vitais e anamnese médica recente:")
        for a in anamneses[:3]:
            vitais = [
                f"PA={a.pressao_arterial}" if a.pressao_arterial else None,
                f"Glicemia={a.glicemia_capilar}" if a.glicemia_capilar is not None else None,
                f"FC={a.frequencia_cardiaca}" if a.frequencia_cardiaca is not None else None,
                f"Temp={a.temperatura}" if a.temperatura is not None else None,
            ]
            vitais_txt = ", ".join(v for v in vitais if v) or "sem sinais vitais aferidos"
            linhas.append(
                f"- [{a.afetido_em.strftime('%d/%m/%Y')}] Vitais: {vitais_txt} | "
                f"Alergias: {a.alergias or 'não relatadas'} | "
                f"Condições crônicas: {a.condicoes_cronicas or 'nenhuma relatada'} | "
                f"Medicações: {a.medicacoes_em_uso or 'nenhuma relatada'}"
            )
    else:
        linhas.append("Sinais vitais/Anamnese médica: nenhum registro salvo no servidor.")

    if doc_visivel:
        resumo_doc = _extrair_resumo_documento_odonto(doc_visivel.conteudo)
        linhas.append(
            f"Ficha clínica ({doc_visivel.tipo}, v{doc_visivel.versao}, status={doc_visivel.status.value}): "
            f"{json.dumps(resumo_doc, ensure_ascii=False)[:3500]}"
        )

    if fichas:
        linhas.append("Procedimentos registrados (Fichas Odonto):")
        for f in fichas:
            linhas.append(
                f"- [{f.criado_em.strftime('%d/%m/%Y')}] Dente/Região: {f.dente_regiao} | "
                f"Procedimento: {f.procedimento_realizado[:400]} | "
                f"Materiais: {f.materiais_utilizados[:250]} | "
                f"Anestésico: {f.anestesico or '—'} | Alerta alergia: {f.alerta_alergia or '—'}"
            )

    if radiografias:
        linhas.append("Exames radiográficos laudados:")
        for r in radiografias:
            linhas.append(f"- [{r.tipo}] {r.laudo[:350]}")

    return paciente, "\n".join(linhas)


def _eh_erro_transitorio(exc: Exception) -> bool:
    txt = str(exc).lower()
    indicadores = (
        "503",
        "429",
        "504",
        "service_unavailable",
        "unavailable",
        "high demand",
        "resource_exhausted",
        "rate limit",
        "timeout",
        "timed out",
    )
    return any(ind in txt for ind in indicadores)


def _criar_cliente() -> genai.Client:
    if not settings.gemini_configurado:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Assistente IA não configurado no servidor: defina GEMINI_API_KEY "
                "no arquivo backend/.env."
            ),
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY.strip())


def _executar_interaction_com_fallback(
    modelos: Sequence[str],
    input_payload: Any,
    system_instruction: Optional[str] = None,
    schema_cls: Optional[Type[BaseModel]] = None,
) -> Tuple[str, str]:
    client = _criar_cliente()
    ultimo_erro: Optional[Exception] = None

    for idx, modelo in enumerate(modelos):
        try:
            kwargs: dict[str, Any] = {
                "model": modelo,
                "input": input_payload,
                "store": False,
                "timeout": float(settings.GEMINI_TIMEOUT_SEGUNDOS),
            }
            if system_instruction:
                kwargs["system_instruction"] = system_instruction
            if schema_cls is not None:
                kwargs["response_format"] = {
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": schema_cls.model_json_schema(),
                }

            interaction = client.interactions.create(**kwargs)
            texto = (interaction.output_text or "").strip()
            if not texto:
                raise RuntimeError(f"Modelo {modelo} retornou resposta vazia.")
            return texto, modelo
        except HTTPException:
            raise
        except Exception as exc:
            ultimo_erro = exc
            msg = _sanitizar_erro(str(exc))
            logger.warning("Falha na chamada Gemini (modelo=%s, tentativa=%d): %s", modelo, idx + 1, msg)
            if idx < len(modelos) - 1 and _eh_erro_transitorio(exc):
                continue
            if _eh_erro_transitorio(exc):
                break
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível processar a solicitação com o Gemini no momento.",
            ) from exc

    logger.error("Todos os modelos Gemini falharam: %s", _sanitizar_erro(str(ultimo_erro)))
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "O serviço de IA está temporariamente sobrecarregado. "
            "Tente novamente em alguns segundos."
        ),
    )


def consultar_assistente_clinico(
    *,
    session: Session,
    usuario: Usuario,
    paciente_id: int,
    curso: AssistenteCurso,
    modo: AssistenteModo,
    aba_atual: str,
    mensagem: str,
    rascunho_atual: str = "",
    ficha_resumo: Optional[dict[str, Any]] = None,
    historico: Sequence[HistoricoMensagemIA] = (),
    audio_bytes: Optional[bytes] = None,
    audio_mime_type: Optional[str] = None,
) -> AssistenteResponse:
    _, contexto_banco = validar_e_construir_contexto_paciente(
        session=session,
        usuario=usuario,
        paciente_id=paciente_id,
        curso=curso,
    )

    if not mensagem.strip() and not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Envie uma pergunta em texto ou grave um áudio para o assistente.",
        )

    partes_prompt: list[str] = [
        f"CONTEXTO CLÍNICO DO PRONTUÁRIO (ANONIMIZADO):\n{contexto_banco}",
        f"Aba/Etapa atual na tela: {aba_atual or 'geral'} | Modo solicitado: {modo}",
    ]

    if ficha_resumo:
        partes_prompt.append(
            "DADOS ATUALMENTE PREENCHIDOS NA TELA (ainda em edição):\n"
            + json.dumps(ficha_resumo, ensure_ascii=False)[:3500]
        )

    if rascunho_atual.strip():
        partes_prompt.append(f"RASCUNHO ATUAL NO FORMULÁRIO:\n{rascunho_atual.strip()[:3000]}")

    if historico:
        ultimas = historico[-8:]
        hist_txt = "\n".join(
            f"{'Profissional' if h.papel == 'user' else 'Assistente'}: {h.texto[:1000]}"
            for h in ultimas
        )
        partes_prompt.append(f"HISTÓRICO RECENTE DESTA CONVERSA:\n{hist_txt}")

    pedido_usuario = mensagem.strip() or (
        "Transcreva o áudio enviado pelo profissional, responda e estruture os "
        "campos correspondentes da ficha/aba atual para revisão."
    )
    partes_prompt.append(f"PEDIDO ATUAL DO PROFISSIONAL:\n{pedido_usuario}")

    prompt_texto = "\n\n".join(partes_prompt)
    conteudo_entrada: Any = prompt_texto

    if audio_bytes:
        if len(audio_bytes) > TAMANHO_MAX_AUDIO_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="O áudio excede o limite de 10 MB por envio.",
            )
        mime_ok = _normalizar_mime_audio(audio_mime_type)
        b64_audio = base64.b64encode(audio_bytes).decode("ascii")
        conteudo_entrada = [
            {"type": "text", "text": prompt_texto},
            {"type": "audio", "data": b64_audio, "mime_type": mime_ok},
        ]

    if curso == "psicologia":
        bruto, modelo_usado = _executar_interaction_com_fallback(
            modelos=settings.gemini_modelos_cadeia,
            input_payload=conteudo_entrada,
            system_instruction=_INSTRUCAO_PSICOLOGIA,
            schema_cls=SaidaPsicologiaLLM,
        )
        dados = SaidaPsicologiaLLM.model_validate_json(bruto)
        campos: dict[str, str] = {}
        mapa_psico = {
            "redacao_texto": _remover_aspas_psico(dados.redacao_texto),
            "avaliacao_demanda": _remover_aspas_psico(dados.avaliacao_demanda),
            "objetivos_intervencao": _remover_aspas_psico(dados.objetivos_intervencao),
            "hipotese_diagnostica": _remover_aspas_psico(dados.hipotese_diagnostica),
            "avaliacao_final": _remover_aspas_psico(dados.avaliacao_final),
            "informacoes_adicionais": _remover_aspas_psico(dados.informacoes_adicionais),
        }
        for k, v in mapa_psico.items():
            if v:
                campos[k] = v
        avisos = [
            "Conformidade CFP nº 06/2019: sugestões sanitizadas sem citações literais entre aspas.",
            "Revise e complemente o conteúdo antes de submeter para homologação docente.",
        ]
        return AssistenteResponse(
            transcricao=(dados.transcricao or "").strip() or None,
            resposta=(_remover_aspas_psico(dados.resposta) or dados.resposta).strip(),
            campos_sugeridos=campos,
            alertas_clinicos=[a.strip() for a in dados.alertas_clinicos if a.strip()],
            avisos_conformidade=avisos,
            modelo_utilizado=modelo_usado,
        )

    bruto, modelo_usado = _executar_interaction_com_fallback(
        modelos=settings.gemini_modelos_cadeia,
        input_payload=conteudo_entrada,
        system_instruction=_INSTRUCAO_ODONTOLOGIA,
        schema_cls=SaidaOdontologiaLLM,
    )
    dados_odonto = SaidaOdontologiaLLM.model_validate_json(bruto)
    campos_odonto: dict[str, str] = {}
    for k, v in {
        "historia_doenca": dados_odonto.historia_doenca,
        "plano_tratamento": dados_odonto.plano_tratamento,
        "evolucao_procedimento": dados_odonto.evolucao_procedimento,
        "observacoes_exame": dados_odonto.observacoes_exame,
    }.items():
        if v and v.strip():
            campos_odonto[k] = v.strip()

    return AssistenteResponse(
        transcricao=(dados_odonto.transcricao or "").strip() or None,
        resposta=dados_odonto.resposta.strip(),
        campos_sugeridos=campos_odonto,
        alertas_clinicos=[a.strip() for a in dados_odonto.alertas_clinicos if a.strip()],
        avisos_conformidade=[
            "Sugestão gerada para apoio clínico (CFO): confira alergias, doses e achados antes de salvar."
        ],
        modelo_utilizado=modelo_usado,
    )


def transcrever_ditado_clinico(
    *,
    curso: AssistenteCurso,
    campo_alvo: str,
    audio_bytes: bytes,
    audio_mime_type: Optional[str],
) -> TranscricaoResponse:
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nenhum dado de áudio foi recebido para transcrição.",
        )
    if len(audio_bytes) > TAMANHO_MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="O áudio excede o limite de 10 MB por envio.",
        )

    mime_ok = _normalizar_mime_audio(audio_mime_type)
    b64_audio = base64.b64encode(audio_bytes).decode("ascii")

    regra_curso = (
        "Redija o ditado em 3ª pessoa, linguagem técnica de Psicologia e SEM nenhuma aspa "
        "(\" “ ” « »), conforme CFP 06/2019."
        if curso == "psicologia"
        else "Formate o ditado em linguagem técnica odontológica clara, preservando termos clínicos e numeração FDI."
    )
    instrucao = (
        "Converta o áudio falado pelo profissional de saúde em texto clínico pronto para o "
        f"campo '{campo_alvo or 'prontuário'}' em português do Brasil.\n{regra_curso}\n"
        "Remova vícios de linguagem ('éé', 'tipo assim', repetições) sem inventar informações. "
        "Retorne APENAS o texto final limpo."
    )

    texto, modelo_usado = _executar_interaction_com_fallback(
        modelos=settings.gemini_modelos_cadeia,
        input_payload=[
            {"type": "text", "text": instrucao},
            {"type": "audio", "data": b64_audio, "mime_type": mime_ok},
        ],
    )

    if curso == "psicologia":
        texto = _remover_aspas_psico(texto) or ""
        avisos = ["Ditado formatado sem aspas conforme CFP nº 06/2019. Revise antes de enviar."]
    else:
        avisos = ["Ditado transcrito por IA. Confira termos e numeração dentária antes de salvar."]

    return TranscricaoResponse(
        texto=texto.strip(),
        modelo_utilizado=modelo_usado,
        avisos_conformidade=avisos,
    )
