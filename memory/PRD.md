# PRD - Sistema de Classificação Fiscal (AURION)

## Status Atual (16/02/2026)

### ✅ CORREÇÕES IMPLEMENTADAS NESTA SESSÃO

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

#### P1 - Importantes
- **RET (ICMS zerado)**: O ICMS aparece como zero porque a empresa tem saldo credor. Seria útil mostrar o débito bruto para comparação, similar à Reforma Tributária.
- **Discrepância Dashboard vs ICMS**: Não investigado nesta sessão

#### P2 - Menor
- **Insights IA sem informação**: Não investigado
- **Pacote On-Premise**: Docker Compose pendente

## Arquivos Principais Modificados
- `/app/backend/server.py` - Correções em múltiplos endpoints
- `/app/frontend/src/pages/ReformaTributaria.js` - Mostra débito bruto

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`
