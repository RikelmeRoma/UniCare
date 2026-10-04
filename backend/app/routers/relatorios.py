from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.paciente import Paciente
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.auditoria import LogAuditoria
from app.models.usuario import Usuario, PerfilUsuario
from app.services.auth_service import require_roles

router = APIRouter(prefix="/relatorios", tags=["Relatórios & Indicadores Gerenciais (RF-006)"])

# Relatórios estatísticos globais são restritos à Referência Técnica (RT) e Supervisores (RN-003)
autorizado_gestao = require_roles([PerfilUsuario.RT, PerfilUsuario.SUPERVISOR])

@router.get("/estatisticas")
def obter_estatisticas_gerenciais(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
) -> Dict[str, Any]:
    # 1. Indicadores de Pacientes (RF-007)
    pacientes = session.exec(select(Paciente)).all()
    total_pacientes = len(pacientes)
    pacientes_psico = sum(1 for p in pacientes if p.curso in ("psicologia", "ambos"))
    pacientes_odonto = sum(1 for p in pacientes if p.curso in ("odontologia", "ambos"))
    pacientes_menores = sum(1 for p in pacientes if p.eh_menor)

    # 2. Indicadores de Agendamentos & Absenteísmo (RF-006)
    agendamentos = session.exec(select(Agendamento)).all()
    total_agendamentos = len(agendamentos)

    status_counts = {
        "AGENDADO": sum(1 for a in agendamentos if a.status == StatusAgendamento.AGENDADO),
        "PRESENTE": sum(1 for a in agendamentos if a.status == StatusAgendamento.PRESENTE),
        "EM_ATENDIMENTO": sum(1 for a in agendamentos if a.status == StatusAgendamento.EM_ATENDIMENTO),
        "CONCLUIDO": sum(1 for a in agendamentos if a.status == StatusAgendamento.CONCLUIDO),
        "FALTOU": sum(1 for a in agendamentos if a.status == StatusAgendamento.FALTOU),
        "CANCELADO": sum(1 for a in agendamentos if a.status == StatusAgendamento.CANCELADO),
    }

    atendidos_ou_presentes = status_counts["PRESENTE"] + status_counts["EM_ATENDIMENTO"] + status_counts["CONCLUIDO"]
    faltas = status_counts["FALTOU"]
    finalizados_total = atendidos_ou_presentes + faltas

    taxa_absenteismo = round((faltas / finalizados_total * 100), 1) if finalizados_total > 0 else 0.0
    taxa_comparecimento = round((atendidos_ou_presentes / finalizados_total * 100), 1) if finalizados_total > 0 else 100.0

    agendamentos_psico = sum(1 for a in agendamentos if a.curso == "psicologia")
    agendamentos_odonto = sum(1 for a in agendamentos if a.curso == "odontologia")

    # 3. Indicadores de Prontuários & Homologação Docente (RF-004)
    prontuarios_psico = session.exec(select(ProntuarioPsico)).all()
    fichas_odonto = session.exec(select(FichaOdonto)).all()

    psico_aguardando = sum(1 for pr in prontuarios_psico if pr.status == StatusProntuario.AGUARDANDO_VALIDACAO)
    psico_validados = sum(1 for pr in prontuarios_psico if pr.status == StatusProntuario.VALIDADO)
    psico_devolvidos = sum(1 for pr in prontuarios_psico if pr.status == StatusProntuario.DEVOLVIDO_PARA_AJUSTE)

    # 4. Indicadores de Segurança e Auditoria LGPD (Art. 11)
    total_logs_auditoria = len(session.exec(select(LogAuditoria)).all())

    return {
        "resumo_executivo": {
            "instituicao": "UNINASSAU Aracaju",
            "unidade": "Clínicas Integradas de Saúde (SPA & Odontologia)",
            "total_pacientes": total_pacientes,
            "total_agendamentos": total_agendamentos,
            "taxa_comparecimento_pct": taxa_comparecimento,
            "taxa_absenteismo_pct": taxa_absenteismo,
        },
        "distribuicao_cursos": {
            "psicologia": {
                "pacientes_ativos": pacientes_psico,
                "agendamentos_totais": agendamentos_psico,
                "prontuarios_submetidos": len(prontuarios_psico),
                "prontuarios_aguardando_visto": psico_aguardando,
                "prontuarios_validados": psico_validados,
                "prontuarios_devolvidos": psico_devolvidos,
            },
            "odontologia": {
                "pacientes_ativos": pacientes_odonto,
                "agendamentos_totais": agendamentos_odonto,
                "fichas_clinicas_totais": len(fichas_odonto),
            },
        },
        "agendamentos_por_status": status_counts,
        "conformidade_legal": {
            "pacientes_menores_com_responsavel": pacientes_menores,
            "total_logs_rastreados_lgpd": total_logs_auditoria,
            "normas_atendidas": [
                "CFP Resolução 06/2019 (Síntese Clínica)",
                "CFO / Odontologia Supervisionada",
                "LGPD Art. 11 (Dados Sensíveis de Saúde)"
            ]
        }
    }
