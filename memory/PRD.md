# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Processamento em Background**: Celery + Redis
- **Principais Bibliotecas**: JSZip (extração ZIP no cliente), PyMuPDF (extração PDF)

## Funcionalidades Implementadas

### Sistema de Upload de XMLs
- Upload streaming para grandes volumes
- Upload de arquivos ZIP com extração no cliente (JSZip)
- Processamento em background via Celery para 500+ arquivos
- Opção de "Importação Rápida" (sem classificação por IA)
- Bulk insert otimizado no MongoDB
- Índices otimizados para verificação de duplicatas

### Módulo Simples Nacional
- Dashboard específico com cálculo de alíquota efetiva
- Suporte a ISS retido (aliquota_sem_iss)
- Importação de PGDAS (PDF)
- Integração com Análise Horizontal

### Outros Módulos
- Dashboard principal multi-regime
- Apuração de ICMS, IPI, PIS/COFINS
- Central de Alertas
- Classificação Inteligente
- Análise Horizontal (Evolução Fiscal)

## Correções Recentes (12/02/2026)

### Bug P0 - Importação em Background (Celery) ✅ CORRIGIDO
**Problema**: A tarefa Celery não era executada após o upload de ZIP.

**Causas identificadas e corrigidas**:
1. Redis-server não estava instalado no sistema
2. Task routes direcionavam para queue `xml_processing` inexistente
3. DB_NAME tinha fallback incorreto (`business_conta` → `test_database`)
4. Parser de CNPJ não extraia corretamente de XMLs com namespace

**Arquivos modificados**:
- `/app/backend/celery_config.py` - Removido task_routes
- `/app/backend/celery_tasks.py` - Corrigido DB_NAME e parser CNPJ

## Bugs Pendentes

### P1 - NF de fevereiro aparecendo em janeiro
- Bug recorrente na alocação de competência fiscal
- Verificar campo de data usado (`dhEmi` vs `dhSaiEnt`)

### P2 - Discrepância Dashboard vs SPED
- Valores totais não batem entre dashboard e registro E110

### P2 - Botão de Login travado em "Processando..."
- Estado `isLoading` não sendo desativado no bloco `finally()`

## Tarefas Próximas

### P0 - Visualização agrupada por dia
- Agrupar documentos de saída por dia na página Documents.js
- Incluir subtotais por dia

### P1 - Refatoração do server.py
- Mover endpoints para estrutura de routers/
- Separar lógica de negócio em services/

## Backlog

- Integração de CT-e (Conhecimentos de Transporte)
- Testes automatizados de frontend (Cypress/Playwright)
- Refatoração do WizardEmpresa.js
- Melhorar feedback visual durante uploads grandes

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Endpoints Principais
- `POST /api/xml/upload-stream` - Upload streaming
- `POST /api/xml/upload-background` - Upload para Celery
- `GET /api/xml/jobs` - Lista jobs em background
- `GET /api/xml/job-status/{job_id}` - Status de um job
- `GET /api/dashboard/stats/{company_id}` - Estatísticas do dashboard
