# AURION - Sistema de Fechamento Fiscal

## Original Problem Statement
Sistema de gestão fiscal brasileiro com funcionalidades para importação de documentos (NFe, NFCe, CTe, NFS-e), apuração de impostos (ICMS, PIS/COFINS, ISS, IPI, Simples Nacional), integração com SIEG para automação fiscal, e análises tributárias.

## User Personas
- Contadores e escritórios de contabilidade
- Gestores fiscais de empresas
- Analistas tributários

## Core Requirements
1. Importação de documentos fiscais (XML)
2. Apuração de impostos por regime tributário
3. Integração com SIEG para sincronização automática
4. Dashboard com indicadores fiscais
5. Gestão de empresas e competências

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) - Monolítico em server.py
- **Database**: MongoDB
- **Integração**: SIEG (plataforma de automação fiscal)

## Key Technical Decisions
- Backend monolítico (server.py ~47.000 linhas) - NECESSITA REFATORAÇÃO
- Autenticação via JWT
- Contexto global React para estado da aplicação

---

# CHANGELOG

## 2025-01-XX - Correções de Alíquotas PIS/COFINS e NFS-e

### Bug Fix 1: Alíquotas PIS/COFINS incorretas para Lucro Presumido
**Issue**: Na tela do Validador PIS/COFINS, empresas do Lucro Presumido estavam mostrando alíquotas de 1.65%/7.6% (Lucro Real) em vez de 0.65%/3.0% (Lucro Presumido).

**Root Cause**: Os endpoints do validador (`/validador-pis-cofins/{company_id}/dados` e `/validador-pis-cofins/{company_id}/por-ncm`) usavam valores fixos de 1.65/7.6 como default, ignorando o regime tributário da empresa.

**Fix Applied**:
- Adicionada verificação do regime tributário (`lucro_presumido` vs `lucro_real`) nos endpoints
- Default de alíquotas agora respeitam o regime: 
  - Lucro Presumido: PIS 0.65%, COFINS 3.0%
  - Lucro Real: PIS 1.65%, COFINS 7.6%
- Mantido funcionamento do RET e Reforma Tributária que usam comparações com Lucro Real

**Files Changed**:
- `/app/backend/server.py` (endpoints validador-pis-cofins)

### Bug Fix 2: NFS-e com cliente como "CONSUMIDOR"
**Issue**: Ao importar NFS-e de serviços prestados, o sistema estava mostrando "CONSUMIDOR" como destinatário mesmo quando havia cliente informado no XML.

**Fix Applied**:
- Melhorado parser de NFS-e para buscar nome do tomador em mais campos
- Quando há CNPJ mas não há nome, agora mostra "CLIENTE CNPJ XXXXXXXX" em vez de "CONSUMIDOR"
- Mantido "CONSUMIDOR FINAL" apenas quando realmente não há informação de tomador

### Bug Fix 3: Data de competência em NFS-e
**Issue**: Sistema usava data de emissão em vez de data de competência para NFS-e retroativas.

**Fix Applied**:
- Priorizada competência do XML (`competencia_nfse`) sobre data de emissão
- Melhorado parsing para suportar múltiplos formatos (ISO, MM/YYYY)
- Fallback para data de emissão apenas quando competência não está disponível

**Files Changed**:
- `/app/backend/server.py` (parsers de NFS-e e importação)

---

## 2025-01-XX - Bug Fix: Tela de Monofásicos travando
**Issue**: A página de gestão de monofásicos ficava permanentemente em "Carregando...".

**Fix Applied**:
- MonofasicosManager.js: Token obtido do localStorage em vez do contexto
- SimplesNacionalDashboard.js: Usar navigate() do React Router

---

# ROADMAP

## P0 - Blockers
- [IN PROGRESS] Falha silenciosa na importação SIEG para algumas empresas
- [IN PROGRESS] Upload de arquivos grandes trava (erro postMessage)

## P1 - High Priority  
- [ ] Bug de CFOPs de transferência (5152) - processamento incorreto
- [ ] Verificar colunas NFS-e (Descrição do Serviço, Retenções)

## P2 - Medium Priority
- [ ] Totalizador por CST nos detalhamentos PIS/COFINS
- [ ] Modal de seleção de empresa sobrepondo UI

## Backlog - Refatoração
- [ ] **CRÍTICO**: Refatorar server.py (+47.000 linhas) em módulos:
  - services/ - Lógica de negócio fiscal
  - routes/ - Endpoints da API
  - utils/ - Funções auxiliares
  - parsers/ - Parsers de XML
