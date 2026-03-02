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

## 2025-01-XX - Bug Fix: Menu PIS/COFINS zerado (Erro 500)

### Problema
O menu PIS/COFINS para empresa ROGER CESAR DE OLIVEIRA (Lucro Presumido) estava completamente vazio, retornando erro 500 no endpoint `/api/pis-cofins/apuracao/{company_id}`.

### Root Cause
Na função `calcular_pis_cofins_por_cst()` (linha 1924), a variável `is_presumido` era usada (linha 2049) mas nunca definida na função. Isso causava um `NameError: name 'is_presumido' is not defined`.

### Fix Applied
Adicionada a definição de `is_presumido = regime == 'lucro_presumido'` na função `calcular_pis_cofins_por_cst()`, alinhando com a mesma definição existente em `calcular_pis_cofins_unificado()`.

### Files Changed
- `/app/backend/server.py` (linha 1963)

---

## 2025-01-XX - Correções na Tela de Monofásicos
- Tema escuro aplicado (bg-[#141414])
- Corrigido erro "body stream already read"

## 2025-01-XX - Correções de Alíquotas PIS/COFINS
- Alíquotas Lucro Presumido: 0.65%/3.0% corrigidas no backend

---

# NOTA IMPORTANTE: Validador PIS/COFINS

O Validador PIS/COFINS mostra "Divergente" para várias NCMs porque:

1. **As alíquotas praticadas** nas notas (1.65%/7.6%) são do Lucro Real
2. **O sistema espera** alíquotas de Lucro Presumido (0.65%/3.0%)
3. **O real problema**: Para Lucro Presumido, **entradas NÃO geram crédito**!

O validador está correto ao apontar divergência - as notas de entrada foram emitidas com tributação de Lucro Real pelo fornecedor, mas para a empresa que é Lucro Presumido, não deveria haver direito a crédito (CST 70/73 com alíquotas 0%).

**Ação recomendada**: Criar regras de NCM para a empresa indicando que entradas não geram crédito (tipo_regra='sem_credito').

---

# ROADMAP

## P0 - Blockers
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
