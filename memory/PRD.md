# AURION - Sistema de Fechamento Fiscal

## Original Problem Statement
Sistema de gestão fiscal brasileiro com funcionalidades para importação de documentos (NFe, NFCe, CTe, NFS-e), apuração de impostos (ICMS, PIS/COFINS, ISS, IPI, Simples Nacional), integração com SIEG para automação fiscal, e análises tributárias.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) - Monolítico em server.py
- **Database**: MongoDB
- **Integração**: SIEG (plataforma de automação fiscal)

## Design System
- Fundo principal: `#0A0A0A` (preto)
- Cards/containers: `bg-[#141414]`
- Bordas: `border-[#2A2A2A]`
- Texto principal: `text-white`
- Texto secundário: `text-gray-400`
- Cor de destaque: `#C8A951` (dourado)

---

# CHANGELOG

## 2025-01-XX - Correção Completa da Tela de Monofásicos

### Bug Fix 1: Erro "body stream already read"
**Root Cause**: O código tentava chamar `response.json()` duas vezes em alguns cenários de erro.
**Fix**: Componente completamente reescrito com tratamento de erro correto - chama `response.json()` apenas uma vez antes de verificar `response.ok`.

### Bug Fix 2: Cores fora do padrão (azuladas)
**Root Cause**: Componente usava cores diferentes do design system do app.
**Fix**: Todas as cores ajustadas para seguir o padrão:
- `bg-[#141414]` para cards (estava usando azulado)
- `border-[#2A2A2A]` para bordas
- `#C8A951` (dourado) para botões de ação e elementos de destaque
- `text-white` / `text-gray-400` para textos

### Melhoria: Reprocessamento Automático
- Após excluir/restaurar NCM ou produto, o sistema agora **reprocessa automaticamente** o cálculo
- Usuário não precisa mais clicar em "Reprocessar Cálculo" manualmente

**Files Changed**:
- `/app/frontend/src/pages/MonofasicosManager.js` (reescrito completamente)

---

## 2025-01-XX - Bug Fix: Menu PIS/COFINS zerado
- Corrigido `NameError` por variável `is_presumido` não definida na função `calcular_pis_cofins_por_cst()`

## 2025-01-XX - Correções de Alíquotas PIS/COFINS
- Alíquotas Lucro Presumido: 0.65%/3.0% corrigidas nos endpoints do validador

---

# ROADMAP

## P0 - Blockers
- [RESOLVED] Tela de Monofásicos com erro de reprocessamento
- [RESOLVED] Menu PIS/COFINS retornando erro 500
- [IN PROGRESS] Falha silenciosa na importação SIEG
- [IN PROGRESS] Upload de arquivos grandes trava

## P1 - High Priority  
- [ ] Bug de CFOPs de transferência (5152)
- [ ] Verificar colunas NFS-e

## P2 - Medium Priority
- [ ] Totalizador por CST nos detalhamentos PIS/COFINS
- [ ] Modal de seleção de empresa sobrepondo UI

## Backlog - Refatoração
- [ ] **CRÍTICO**: Refatorar server.py (+47.000 linhas) em módulos
