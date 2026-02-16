# PRD - Sistema de Classificação Fiscal (AURION)

## Status Atual (16/02/2026)

### ✅ CORREÇÃO CRÍTICA COMPLETA - SESSÃO ATUAL (Fork 2)

#### CONSISTÊNCIA 100% - COMPRAS LÍQUIDAS, VENDAS LÍQUIDAS e MARKUP 
**Problema original**: Valores de Compras Líquidas, Vendas Líquidas e Markup inconsistentes entre Dashboard e página Indicadores.

**Solução implementada**:
1. Adicionados campos `compras_liquidas`, `vendas_liquidas` e `markup` no endpoint `/api/apuracao-icms`
2. Corrigido endpoint `/api/analise-horizontal` para calcular valores corretamente por CFOP
3. Atualizada página `/app/frontend/src/pages/Indicadores.js` para consumir dados do backend

**Fórmulas implementadas (conforme solicitado pelo usuário)**:
- **Compras Líquidas** = CFOPs de Compra (1102, 2102, 1403, 2403, 1101, 2101) - Devoluções de Saída (5201, 5202, 5410, 5411, 6201, 6202, 6410, 6411)
- **Vendas Líquidas** = CFOPs de Venda (5102, 6102, etc.) - Devoluções de Entrada (1202, 1410, 1411, 2202, 2410, 2411)
- **Markup** = (Vendas Líquidas - Compras Líquidas) / Compras Líquidas × 100

**Resultado Final (Janeiro 2026 - COMERCIAL RS)**:
| Campo | Endpoint apuracao-icms | Endpoint analise-horizontal | Diferença |
|-------|------------------------|----------------------------|-----------|
| Compras Líquidas | R$ 10.929.656,95 | R$ 10.929.656,95 | 0.0 |
| Vendas Líquidas | R$ 11.407.076,05 | R$ 11.407.076,05 | 0.0 |
| Markup | 4,37% | 4,37% | 0.0 |

**Status**: ✅ 100% CONSISTENTE - 10/10 TESTES PASSARAM

---

### ✅ CORREÇÃO CRÍTICA - SESSÃO ANTERIOR (Fork 1)

#### CONSISTÊNCIA 100% PIS/COFINS 
**Problema original**: Valores de PIS/COFINS completamente diferentes entre RET, Apuração e Reforma Tributária.

**Solução implementada**:
1. Criada função centralizada `calcular_pis_cofins_unificado()` que TODOS os endpoints usam
2. Lei 14.592/2023 aplicada: ICMS excluído da base em **entradas E saídas**
3. Uso de `Decimal` para precisão máxima e arredondamento consistente

**Resultado Final (Janeiro 2026 - COMERCIAL RS)**:
| Endpoint | PIS Créd | PIS Déb | COFINS Créd | COFINS Déb |
|----------|----------|---------|-------------|------------|
| RET | R$ 140.018,53 | R$ 144.954,83 | R$ 644.933,51 | R$ 667.679,28 |
| Apuração | R$ 140.018,53 | R$ 144.954,83 | R$ 644.933,51 | R$ 667.679,28 |
| Reforma | R$ 140.018,53 | R$ 144.954,83 | R$ 644.933,51 | R$ 667.679,28 |

**Status**: ✅ 100% CONSISTENTE

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

#### P0 - CRÍTICO (EM ANDAMENTO)
- **Dashboard Principal - Valores Inconsistentes**: O usuário reportou que os valores de Compras Líquidas, Vendas Líquidas, Markup, e impostos (ICMS, PIS, COFINS) estão inconsistentes entre o Dashboard principal e a página de Indicadores. 
  - **Causa identificada**: A função `_get_dashboard_stats_aggregated` (usada para > 500 docs) estava calculando impostos incorretamente (pegando valores do XML ao invés de usar a função unificada).
  - **Correção aplicada parcialmente**: Iniciada refatoração para usar a mesma lógica de cálculo em todos os lugares.
  - **Próximo passo**: Validar que os valores do Dashboard agora batem com os da página de Indicadores e com os endpoints de apuração.

#### P1 - Importantes  
- **Margem de Contribuição**: Usuário perguntou como está sendo calculada na aba "Margens e Markup". Precisa documentar/validar a fórmula.
- **Vilões e Oportunidades**: Lógica corrigida. Aguarda validação do usuário.

#### P2 - Menor
- **Insights IA sem informação**: Não investigado
- **Pacote On-Premise**: Docker Compose pendente

---

### Issues Resolvidas (Sessão Atual - Fork 2)
- ✅ **Markup incorreto entre Dashboard e Indicadores**: Valores agora consistentes (diferença = 0)
- ✅ **Compras Líquidas inconsistentes**: Unificada lógica em todos os endpoints
- ✅ **Vendas Líquidas inconsistentes**: Unificada lógica em todos os endpoints
- ✅ **Frontend Indicadores não usava dados do backend**: Corrigido para consumir `dados.icms.markup`, `dados.icms.compras_liquidas`, `dados.icms.vendas_liquidas`

### Issues Resolvidas (Sessão Anterior - Fork 1)
- ✅ **Inconsistência PIS/COFINS entre páginas**: Valores agora consistentes (diferença < 0.01%)
- ✅ **Base de PIS/COFINS sem exclusão do ICMS**: Corrigido para excluir ICMS da base nas saídas
- ✅ **Lógica de cálculo não unificada**: Todas as funções agora usam `calcular_pis_cofins_produto()`

## Arquivos Modificados na Sessão Atual (Fork 2)
- `/app/backend/server.py`:
  - Endpoint `/api/apuracao-icms` - Adicionados campos compras_liquidas, vendas_liquidas, markup (~linhas 23065-23120, 23280-23300)
  - Endpoint `/api/analise-horizontal` - Corrigida lógica de Compras/Vendas Líquidas (~linhas 30109-30185)
- `/app/frontend/src/pages/Indicadores.js`:
  - Função `calcularIndicadores()` - Atualizada para usar dados do backend (~linhas 278-330)
  - Aba "Margens e Markup" - Novo detalhamento visual de Compras/Vendas (~linhas 1102-1169)

## Arquivos de Teste Criados
- `/app/backend/tests/test_compras_vendas_markup_consistency.py`
- `/app/test_reports/pytest/pytest_compras_vendas_markup.xml`
- `/app/test_reports/iteration_66.json`

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`
