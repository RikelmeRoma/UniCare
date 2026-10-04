# UniCare — Backend API (FastAPI + PostgreSQL + Docker)

Backend RESTful desenvolvido para o sistema **UniCare** da Clínica-Escola (Psicologia e Odontologia) da **UNINASSAU Aracaju**, conforme os requisitos especificados em `DOC-EST-03` e a modelagem UML de `DOC-EST-09`.

---

## 🛠️ Stack Tecnológica
* **Framework:** FastAPI (Python 3.12)
* **ORM:** SQLModel (SQLAlchemy 2.0 core)
* **Banco de Dados:** PostgreSQL 16 (ou SQLite local para testes rápidos)
* **Autenticação:** JWT (OAuth2 Password Bearer) com RBAC
* **Containerização:** Docker e Docker Compose

---

## 🚀 Como Executar

### Opção 1: Via Docker Compose (Recomendado para Produção/Homologação)
```bash
cd backend
docker compose up -d
```
A API estará acessível em: `http://localhost:8000`  
Documentação Swagger Interativa: `http://localhost:8000/docs`

### Opção 2: Localmente via Python (Sem Docker)
1. Instale as dependências:
```powershell
pip install -r requirements.txt
```
2. Execute o servidor Uvicorn:
```powershell
uvicorn app.main:app --reload --port 8000
```
O banco SQLite `unicare.db` será criado automaticamente na raiz da pasta `backend`.

---

## 🔒 Controles de Segurança & Conformidade Normativa
* **RN-001 (Bloqueio de Recepção):** O endpoint `/api/v1/prontuarios` intercepta e proíbe qualquer requisição feita com token de perfil `recepcao` (HTTP 403 Forbidden).
* **RN-002 (Vedação de Aspas CFP):** O schema `ProntuarioPsicoCreate` analisa via regex `["“”«»]` e recusa a gravação de falas literais (HTTP 422 Unprocessable Entity).
* **RN-003 (Salvaguarda Institucional):** Usuários com perfil `RT` possuem bypass institucional irrestrito para auditoria legal.
* **RN-004 (Homologação Docente):** Apenas supervisores e RT podem alterar o status de prontuários para `VALIDADO`.
* **RNF-004 (Logs de Auditoria):** Cada login, cadastro de paciente e visto é registrado de forma indelével na tabela `logs_auditoria`.
