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

### Importação em Lote (NOVO - 12/02/2026)
- **3 formas de importação**:
  1. Upload via Interface Web (ZIP com estrutura de pastas)
  2. Script Python para servidor local (com cron)
  3. API para integração
- Mapeamento de empresas por código
- Relatórios de importação (histórico, estatísticas)
- **Arquivos**: `/app/backend/batch_import.py`, `/app/frontend/src/pages/BatchImport.js`

### Módulo Reforma Tributária - IVA Dual (NOVO - 12/02/2026)
- **Simulação CBS + IBS** para cenário 2027
- Classificação automática por CFOP e NCM
- **CST de Entradas** (Créditos): 50, 51, 52, 70
- **CST de Saídas** (Débitos): 00, 01, 02, 03, 04, 05
- Motor de exceções:
  - Cesta Básica Nacional (alíquota zero)
  - Imposto Seletivo (sobretaxa)
  - Redução 60% (medicamentos, equipamentos médicos)
  - Redução 30% (informática)
- Dashboard com:
  - Créditos x Débitos
  - Saldo a Pagar ou Crédito Acumulado
  - Comparativo com regime atual
  - Estatísticas por CST
- **Arquivos**: `/app/backend/services/reforma_tributaria.py`, `/app/frontend/src/pages/ReformaTributaria.js`

### Módulo Simples Nacional
- Dashboard específico com cálculo de alíquota efetiva
- Suporte a ISS retido (aliquota_sem_iss)
- Importação de PGDAS (PDF)

### Correções na Sessão (12/02/2026)
- ✅ Bug Celery corrigido (Redis instalado, task_routes removido, DB_NAME corrigido)
- ✅ CFOPs 1915/1949 adicionados à lista de desconsideração
- ✅ IA não reclassifica mais notas de terceiros com entrada
- ✅ Validação de CFOP corrigida (notas de compra com CFOP 5xxx aceitas como entrada)

## Endpoints da Reforma Tributária

- `GET /api/reforma-tributaria/config/{company_id}` - Configuração de alíquotas
- `POST /api/reforma-tributaria/config/{company_id}` - Salvar configuração
- `GET /api/reforma-tributaria/apuracao/{company_id}?competencia=MM/YYYY` - Apuração
- `GET /api/reforma-tributaria/tabelas` - Tabelas de domínio (NCM, CST)

## Endpoints de Importação em Lote

- `POST /api/batch-import/upload-estrutura` - Upload de ZIP
- `GET /api/batch-import/historico` - Histórico de importações
- `GET /api/batch-import/empresas-mapeamento` - Mapeamento de códigos
- `POST /api/batch-import/atualizar-codigo/{company_id}` - Atualizar código empresa
- `GET /api/batch-import/download-script` - Baixar script Python

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
- Notificações por email após importação em lote

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Alíquotas Reforma Tributária (Padrão 2027)
- CBS: 8,80%
- IBS: 17,70%
- Total: 26,50%
