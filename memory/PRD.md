# AURION - Sistema de Fechamento Fiscal

## Original Problem Statement
Sistema de gestão fiscal brasileiro com funcionalidades para importação de documentos (NFe, NFCe, CTe, NFS-e), apuração de impostos (ICMS, PIS/COFINS, ISS, IPI, Simples Nacional), integração com SIEG para automação fiscal, e análises tributárias.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) - Monolítico em server.py
- **Database**: MongoDB
- **Integração**: SIEG (plataforma de automação fiscal)

## Design System
- Fundo principal: `#0A0A0A`
- Cards/containers: `bg-[#141414]`
- Bordas: `border-[#2A2A2A]`
- Cor de destaque: `#C8A951` (dourado)

---

# CHANGELOG

## 2025-03-02 - Correção Frontend MonofasicosManager e PisCofins

### Monofásicos - Erro "Objects are not valid as React child"
- **Problema**: Ao clicar em "Gerir Monofásicos" a tela dava erro porque `data.empresa` era um objeto `{id, razao_social, regime}` e estava sendo renderizado diretamente como filho de React
- **Solução**: 
  - Alterado `{data?.empresa || 'Empresa'}` para `{data?.empresa?.razao_social || 'Empresa'}`
  - Corrigido mapeamento de campos da API (`agrupamento_ncm`, `agrupamento_produtos`, `resumo`) para estrutura esperada pelo frontend
- **Files**: `/app/frontend/src/pages/MonofasicosManager.js`
- **Testado**: ✅ Tela agora abre e exibe corretamente

### PIS/COFINS - Aba Apuração
- **Status**: Funcionando corretamente
- **Verificado**: Alíquotas dinâmicas por regime (0.65%/3% para Lucro Presumido, 1.65%/7.6% para Lucro Real)

---

## 2025-12-XX - Correções Múltiplas

### 1. Monofásicos - UI e Erro de Reprocessamento
- **Problema**: Fundo branco fora do padrão + erro "body stream already read"
- **Solução**: 
  - Adicionado `min-h-screen bg-[#0A0A0A]` no container principal
  - Implementado clone da response antes de ler (evita dupla leitura)
- **Files**: `/app/frontend/src/pages/MonofasicosManager.js`

### 2. PIS/COFINS Lucro Presumido - Correção Definitiva
- **Problema**: Gerando créditos indevidos e usando alíquotas de Lucro Real (1.65%/7.6%)
- **Solução**:
  - Função `calcular_pis_cofins_produto` em `pis_cofins_calculator.py` corrigida
  - Lucro Presumido NUNCA gera créditos em entradas (regime cumulativo)
  - Alíquotas corretas: 0.65% PIS / 3.00% COFINS
- **Testes**: 9/9 passaram em `/app/backend/tests/test_lucro_presumido_pis_cofins.py`

### 3. SIEG - Verificação de Cancelamentos
- **Problema**: Notas canceladas após importação não eram atualizadas
- **Solução**:
  - Função `verificar_e_processar_cancelamentos_sieg` atualizada para verificar:
    - Eventos de cancelamento na collection
    - Eventos de cancelamento embutidos nos XMLs do SIEG (cStat 101, 135, 151, 155)
  - Adicionada função `detectar_notas_excluidas_para_reimportar`
- **Files**: `/app/backend/server.py`, `/app/backend/services/sieg_smart_sync.py`

### 4. Filtro por CFOP na Busca de Documentos
- **Solução**:
  - Adicionado parâmetro `cfop` no endpoint `/api/xml/documents`
  - Adicionado campo de filtro CFOP na UI de documentos
- **Files**: `/app/backend/server.py`, `/app/frontend/src/pages/Documents.js`

---

## Correções Anteriores (sessão passada):
- Tela de Monofásicos: cores e erro body stream
- Menu PIS/COFINS: erro 500 por `is_presumido` não definido
- Alíquotas nos endpoints do Validador

---

# ROADMAP

## P0 - Blockers
- [RESOLVED] Apuração PIS/COFINS Lucro Presumido com créditos indevidos
- [RESOLVED] Monofásicos - UI e erro de reprocessamento
- [RESOLVED] Menu PIS/COFINS retornando erro 500
- [IN PROGRESS] Falha silenciosa na importação SIEG para certas empresas
- [IN PROGRESS] Upload de arquivos grandes trava

## P1 - High Priority  
- [ ] Bug de CFOPs de transferência (5152) - processamento incorreto
- [ ] Verificar colunas NFS-e (descrição serviço, retenções)
- [ ] Validar importação NFS-e (cliente "consumidor final", data competência)
- [ ] Investigar CFOP 5123 na empresa Inova Brands mês 02 (usar endpoint de diagnóstico)

## P2 - Backlog
- [ ] Refatorar server.py (+47.000 linhas) - CRÍTICO para estabilidade
- [ ] Totalizador por CST nos detalhamentos de PIS/COFINS
- [ ] Modal de seleção de empresa sobrepondo UI
