# PRD - Sistema AURION de Análise Fiscal

## Problema Original
Aplicação de análise fiscal com problemas críticos de performance e consistência de dados. As páginas de análise (PIS/COFINS, RET, Análise Horizontal, Indicadores) travavam ou exibiam valores fiscais inconsistentes.

## Requisitos de Produto (P0 - Críticos)
1. **Estabilidade e Performance**: Sistema não deve travar ao processar grandes volumes (+15.000 documentos)
2. **Correção e Consistência de Dados**: Todas as páginas devem exibir cálculos fiscais corretos e 100% consistentes
3. **Consistência de CST**: Os CSTs exibidos devem refletir a regra fiscal aplicada, não apenas o valor do XML

## Arquitetura
```
/app/
├── backend/
│   └── server.py  # FastAPI monólito (~36.000 linhas)
└── frontend/
    └── src/
        └── pages/
            ├── ApuracaoICMS.js
            ├── PisCofins.js
            ├── ClassificacaoInteligente.js
            └── Indicadores.js
```

## O que foi implementado

### Data: 10/12/2025
**Correção: Confusão de CST 70/50 no PIS/COFINS**

**Problema**: A tabela "Resumo por CST (Créditos)" mostrava grandes bases de cálculo sob CST 70 ("Operação sem direito a crédito") com valores de PIS/COFINS zerados, enquanto os créditos apareciam calculados separadamente. Os CSTs exibidos vinham do XML original, não refletindo a regra fiscal aplicada pelo sistema.

**Solução Implementada**:
1. Reescrita da função `calcular_pis_cofins_por_cst()` em `server.py`
2. Agora usa a mesma lógica de `calcular_pis_cofins_unificado()` para determinar CST
3. Entradas com crédito calculado aparecem sob CST 50 (Com direito a crédito)
4. Entradas sem crédito aparecem sob CST 70 ou 73 conforme tipo
5. Valores de PIS/COFINS são os calculados, não os do XML

**Resultado**:
- Resumo por CST agora mostra classificação fiscal correta ✅
- Valores de crédito agrupados sob CST 50 quando há direito a crédito ✅

---

### Data: 10/12/2025
**Correção: Menu Divergências sempre zerado**

**Problema**: O endpoint `/api/pis-cofins/divergencias/{company_id}` retornava lista vazia quando havia mais de 500 documentos, para evitar problemas de performance. Isso tornava a funcionalidade inútil no ambiente de produção.

**Solução Implementada**:
1. Removido o retorno vazio para grandes volumes
2. Implementado processamento em batches com cursor
3. Limitação de detalhamento (200 divergências) mantendo contagem total correta
4. Adicionado campo `_info` nos totais para indicar limitação

**Resultado**:
- Divergências agora são analisadas para qualquer volume ✅
- Totais são sempre corretos ✅
- Detalhamento limitado para performance em grandes volumes ✅

---

### Data: 10/12/2025
**Correção: Classificação de Alerta de CFOPs não reflete na Classificação Inteligente**

**Problema**: Quando o usuário classificava produtos em "Alerta de CFOPs" usando `salvar_regra=True`, a regra era salva com campos genéricos que não eram usados para fazer match na Classificação Inteligente.

**Solução Implementada**:
1. Função `resolver_alerta_cfop_por_grupo()` agora salva regras completas
2. Cada produto único recebe uma regra com: `produto_descricao`, `produto_codigo`, `ncm`
3. Verifica e atualiza regras existentes em vez de sempre criar novas
4. Regras agora são encontradas pela função `get_classification_suggestions_v2()`

**Resultado**:
- Classificações feitas em Alerta de CFOPs sincronizam com Classificação Inteligente ✅
- Regras são aplicadas automaticamente em novas importações ✅

---

### Data: 17/02/2026 (correções anteriores)
- Correção de inconsistência nos valores desconsiderados de ICMS
- Unificação de lógica para Compras/Vendas Líquidas, Markup
- Consistência de PIS/COFINS entre Dashboard e páginas de análise

## Backlog

### P0 (Crítico)
- [x] Correção de CST 70/50 no PIS/COFINS
- [x] Menu Divergências funcionando para grandes volumes
- [x] Sincronização Alerta de CFOPs → Classificação Inteligente

### P1 (Alta Prioridade)
- [ ] Remover menu ICMS ST e integrar ao menu ICMS (condicional por contribuinte ST)
- [ ] Totalizador por CST nos detalhamentos de CRÉDITOS/DÉBITOS do PIS/COFINS no frontend

### P2 (Média Prioridade)
- [ ] Pacote de instalação On-Premise (Docker Compose)
- [ ] Corrigir página Insights IA
- [ ] Implementar testes automatizados com pytest
- [ ] Refatorar server.py (separar em módulos)

## Credenciais de Teste
- **Produção**: `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa**: COMERCIAL RS LTDA (ID: 6026)
- **Competência**: 01/2026

## 3rd Party Integrations
- Gemini (classificação de produtos)
