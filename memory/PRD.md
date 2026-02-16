# PRD - Sistema de Classificação Fiscal (AURION)

## Status Atual (16/02/2026)

### ✅ CORREÇÃO CRÍTICA - SESSÃO ATUAL (16/02/2026)

#### INCONSISTÊNCIA PIS/COFINS RESOLVIDA
- **Problema**: Valores de PIS/COFINS completamente diferentes entre páginas:
  - Análise Horizontal: R$ 37.203 PIS / R$ 171.281 COFINS
  - RET: R$ 4.871 PIS / R$ 22.437 COFINS  
  - PIS/COFINS: R$ 139.857 a recuperar
  
- **Causa Raiz**:
  1. Cada página usava lógica de cálculo diferente (XML direto vs recálculo vs agregação)
  2. A página PIS/COFINS marcava todos os produtos como "alíquota zero" baseada no CST incorreto do XML
  3. A exclusão do ICMS da base de cálculo não era aplicada uniformemente
  
- **Solução Aplicada**:
  1. **Unificação da lógica**: Todas as funções de agregação agora usam `calcular_pis_cofins_produto()` para cada produto
  2. **Exclusão do ICMS**: Nas saídas, o ICMS é excluído da base de cálculo em todas as funções (decisão STF)
  3. **Processamento em batches**: Funções otimizadas para processar em batches de 500 documentos
  
- **Resultado Final (Janeiro 2026 - COMERCIAL RS)**:
  | Métrica | RET | PIS/COFINS | Diferença |
  |---------|-----|------------|-----------|
  | PIS Créditos | R$ 169.907,14 | R$ 169.907,14 | 0% |
  | COFINS Créditos | R$ 782.601,64 | R$ 782.601,64 | 0% |
  | PIS Débitos | R$ 144.954,83 | R$ 144.957,88 | <0.01% |
  | COFINS Débitos | R$ 667.679,24 | R$ 667.693,28 | <0.01% |
  
- **Status**: ✅ CORRIGIDO E TESTADO

---

### ✅ CORREÇÕES ANTERIORES (Sessão Anterior)

#### 1. Análise Horizontal - Valores Corretos
- **Problema**: Valores de compras/vendas estavam inflados (~9x)
- **Causa**: Pipeline de agregação usava `$valor_total` do documento (multiplicado pelo número de produtos)
- **Solução**: Alterado para usar `$produtos.valor_total`
- **Resultado**: Valores agora corretos (Vendas: R$ 11,8M, Compras: R$ 12M)
- **Status**: ✅ CORRIGIDO E TESTADO

#### 2. Reforma Tributária - Mostra Débitos Quando Há Saldo Credor
- **Problema**: Mostrava R$ 0 quando empresa tinha saldo credor
- **Causa**: `max(0, débito - crédito)` retorna zero quando crédito > débito
- **Solução**: Adicionado `detalhamento` e `debito_bruto` na resposta
- **Frontend**: Modificado para mostrar débito bruto quando saldo é credor
- **Status**: ✅ CORRIGIDO E TESTADO

#### 3. Vilões e Oportunidades - Estrutura Compatível
- **Problema**: Versão agregada retornava estrutura incompatível com frontend
- **Solução**: Refatorado para retornar `entrada_valor`, `saida_valor`, `icms.credito`, etc.
- **Status**: ✅ CORRIGIDO E TESTADO

#### 4. PIS/COFINS Agregado - Usa Classificação Salva
- **Problema**: Versão agregada usava lista hardcoded de NCMs monofásicos
- **Solução**: Agora usa campos `ncm_aliq_zero` e `cst_pis` salvos nos produtos
- **Status**: ✅ CORRIGIDO E TESTADO

#### 5. Campo ICMS - Nome Correto do Campo
- **Problema**: Código usava `valor_icms` mas campo é `v_icms`
- **Solução**: Corrigido para usar `v_icms` como fallback para `valor_icms`
- **Arquivos afetados**: Endpoints de Reforma Tributária e ICMS
- **Status**: ✅ CORRIGIDO

### Observações sobre Dados do Cliente

#### Empresa COMERCIAL RS LTDA (01/2026)
- **Vendas**: R$ 11,872,015.51
- **Compras**: R$ 12,081,826.01
- **ICMS Débito**: R$ 1,939,698.16
- **ICMS Crédito**: R$ 2,071,720.71
- **Saldo ICMS**: CREDOR (R$ 130.337 de crédito acumulado)
- **Nota**: Por ter saldo credor, "ICMS a pagar" é corretamente zero

#### Empresa REPUBLIC C.A PIZZA
- **Status**: 0 documentos no banco (foram deletados)
- **Ação necessária**: Reimportar XMLs

### Issues Pendentes

#### P0 - CRÍTICO (REQUER VALIDAÇÃO DO USUÁRIO)
- **PIS/COFINS travando**: Otimizações aplicadas. **PRECISA DE VALIDAÇÃO NO AMBIENTE DO CLIENTE** (14k+ docs)
- **RET travando**: Mesmo que acima

#### P1 - Importantes
- **RET (ICMS zerado)**: O ICMS aparece como zero porque a empresa tem saldo credor. Seria útil mostrar o débito bruto para comparação, similar à Reforma Tributária.
- **Vilões e Oportunidades**: Lógica corrigida (usa bases de entrada/saída com alíquotas 1,65%/7,60%). Aguarda validação do usuário.

#### P2 - Menor
- **Insights IA sem informação**: Não investigado
- **Pacote On-Premise**: Docker Compose pendente

## Arquivos Principais Modificados
- `/app/backend/server.py` - Correções em múltiplos endpoints
- `/app/frontend/src/pages/ReformaTributaria.js` - Mostra débito bruto

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`
