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

## 2025-01-XX - Bug Fix: Tela de Monofásicos travando no "Carregando..."
**Issue**: A página `/simples-nacional/{companyId}/monofasicos` ficava permanentemente em estado "Carregando..." sem mostrar erro.

**Root Cause**:
1. O `MonofasicosManager.js` tentava obter `token` do contexto (`useAppContext`), mas o contexto não exportava `token`
2. O código fazia `if (!companyId || !token) return;` sem definir `loading = false`, causando loop infinito de loading
3. O botão usava `window.location.href` que fazia navegação completa, perdendo o contexto React

**Fix Applied**:
- MonofasicosManager.js: Obter token diretamente do `localStorage.getItem('token')` 
- MonofasicosManager.js: Também obter competência do localStorage como fallback
- MonofasicosManager.js: Adicionar tratamento de erro adequado quando token/companyId não existe
- SimplesNacionalDashboard.js: Usar `navigate()` do React Router em vez de `window.location.href`

**Files Changed**:
- `/app/frontend/src/pages/MonofasicosManager.js`
- `/app/frontend/src/pages/SimplesNacionalDashboard.js`

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
