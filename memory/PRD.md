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
- Tema escuro padrão (bg-[#141414], border-[#2A2A2A], text-white)

---

# CHANGELOG

## 2025-01-XX - Correções na Tela de Monofásicos

### Bug Fix 1: Tela branca com texto invisível
**Issue**: A página de Gestão de Monofásicos aparecia com fundo branco e texto branco/claro, tornando impossível a leitura.

**Root Cause**: O componente usava classes CSS de tema claro (bg-white, text-gray-900) enquanto o app usa tema escuro.

**Fix Applied**:
- Migrado todo o componente para tema escuro consistente
- bg-white → bg-[#141414]
- border → border-[#2A2A2A]
- text-gray-900 → text-white
- text-gray-500 → text-gray-400
- Badges e botões com cores apropriadas para tema escuro

### Bug Fix 2: Erro "body stream already read" ao reprocessar
**Issue**: Ao clicar em "Reprocessar Cálculo", aparecia erro "Failed to execute 'json' on 'Response': body stream already read".

**Root Cause**: O código chamava `response.json()` duas vezes - uma vez no `if (!response.ok)` e outra após verificação.

**Fix Applied**:
- Corrigido para chamar `response.json()` apenas uma vez, antes da verificação de `response.ok`

**Files Changed**:
- `/app/frontend/src/pages/MonofasicosManager.js`

---

## 2025-01-XX - Correções de Alíquotas PIS/COFINS e NFS-e

### Bug Fix 1: Alíquotas PIS/COFINS incorretas para Lucro Presumido
- Corrigido para usar 0.65%/3.0% em vez de 1.65%/7.6% para empresas Lucro Presumido
- RET e Reforma Tributária não afetados

### Bug Fix 2: NFS-e com cliente "CONSUMIDOR"
- Parser melhorado para buscar nome do tomador em mais campos do XML
- Quando há CNPJ sem nome, mostra "CLIENTE CNPJ XXXXX"

### Bug Fix 3: Data de competência em NFS-e
- Priorizada competência do XML sobre data de emissão para NFS-e retroativas

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
