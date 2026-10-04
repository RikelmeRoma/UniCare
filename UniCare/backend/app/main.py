from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.config import settings
from app.database import init_db, engine
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.models.paciente import Paciente
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.prontuario import ProntuarioPsico, StatusProntuario
from app.services.crypto_service import get_password_hash
from app.routers import auth, pacientes, agendamentos, prontuarios, auditoria, relatorios

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa as tabelas do banco relacional
    init_db()

    # Seed automático dos usuários e dados clínicos caso a tabela de usuários esteja vazia
    with Session(engine) as session:
        primeiro = session.exec(select(Usuario)).first()
        if not primeiro:
            usuarios_seed = [
                Usuario(
                    nome="Rikelme Roma Santos",
                    email="rikelmeroma13@gmail.com",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.ESTAGIARIO,
                    curso=CursoUsuario.PSICOLOGIA,
                    matricula="16032935"
                ),
                Usuario(
                    nome="Augusto Cesar Farias Carvalho",
                    email="augustocsar97@gmail.com",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.ESTAGIARIO,
                    curso=CursoUsuario.ODONTOLOGIA,
                    matricula="16024402"
                ),
                Usuario(
                    nome="Prof. Dr. Robert Santos do Carmo",
                    email="robert.carmo@uninassau.edu.br",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.SUPERVISOR,
                    curso=CursoUsuario.PSICOLOGIA,
                    matricula="DOC-8821",
                    registro_profissional="CRP 19/0844"
                ),
                Usuario(
                    nome="Profa. Dra. Bianca Nubia",
                    email="bianca.silva@uninassau.edu.br",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.SUPERVISOR,
                    curso=CursoUsuario.ODONTOLOGIA,
                    matricula="DOC-9122",
                    registro_profissional="CRO-SE 4512"
                ),
                Usuario(
                    nome="Recepção Integrada Clínica",
                    email="recepcao@uninassau.edu.br",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.RECEPCAO,
                    curso=CursoUsuario.GERAL,
                    matricula="REC-001"
                ),
                Usuario(
                    nome="Dra. Camila (Referência Técnica RT)",
                    email="camila.rt@uninassau.edu.br",
                    senha_hash=get_password_hash("unicare123"),
                    perfil=PerfilUsuario.RT,
                    curso=CursoUsuario.GERAL,
                    matricula="RT-001",
                    registro_profissional="RT-GERAL"
                )
            ]
            for u in usuarios_seed:
                session.add(u)
            session.commit()

        # Seed de pacientes acadêmicos (RF-007, RN-004)
        if not session.exec(select(Paciente)).first():
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
            session.refresh(p1)
            session.refresh(p2)
            session.refresh(p3)
            session.refresh(p4)

            # Seed de Agendamentos (RF-002)
            ag1 = Agendamento(
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
            )
            ag2 = Agendamento(
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
            )
            ag3 = Agendamento(
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
            )
            ag4 = Agendamento(
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
            )
            session.add_all([ag1, ag2, ag3, ag4])
            session.commit()

            # Seed de Prontuários Psico (RF-004, RN-002)
            pr1 = ProntuarioPsico(
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
            )
            pr2 = ProntuarioPsico(
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
            )
            session.add_all([pr1, pr2])
            session.commit()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST do Sistema UniCare • Clínicas-Escola de Psicologia e Odontologia (UNINASSAU)",
    lifespan=lifespan
)

# Configuração de CORS permissivo para conexão com Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos Roteadores com prefixo v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(pacientes.router, prefix=settings.API_V1_STR)
app.include_router(agendamentos.router, prefix=settings.API_V1_STR)
app.include_router(prontuarios.router, prefix=settings.API_V1_STR)
app.include_router(auditoria.router, prefix=settings.API_V1_STR)
app.include_router(relatorios.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "sistema": "UniCare API",
        "versao": settings.VERSION,
        "documentacao": "/docs",
        "normas": ["CFP 06/2019", "CFO", "LGPD Art. 11"]
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
