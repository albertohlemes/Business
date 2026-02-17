# PRD - Sistema AURION de Análise Fiscal

## Problema Original
Aplicação de análise fiscal com problemas críticos de performance e consistência de dados. As páginas de análise (PIS/COFINS, RET, Análise Horizontal, Indicadores) travavam ou exibiam valores fiscais inconsistentes.

## Requisitos de Produto (P0 - Críticos)
1. **Estabilidade e Performance**: Sistema não deve travar ao processar grandes volumes (+15.000 documentos)
2. **Correção e Consistência de Dados**: Todas as páginas devem exibir cálculos fiscais corretos e 100% consistentes
3. **Consistência de CST**: Os CSTs exibidos devem refletir a regra fiscal aplicada, não apenas o valor do XML
4. **Classificação Unificada**: A classificação de produtos deve ser aplicada em uma base única e refletir em todos os menus

## Arquitetura
```
/app/
├── backend/
│   └── server.py  # FastAPI monólito (~37.000 linhas)
└── frontend/
    └── src/
        └── pages/
            ├── ApuracaoICMS.js
            ├── PisCofins.js
            ├── FechamentoMensal.js
            ├── ReformaTributaria.js
            ├── ClassificacaoInteligente.js
            └── Dashboard.js
```

## O que foi implementado

### Data: 11/12/2025 - Sessão 3 (Fork)
**Funcionalidade: Unificação Completa do Sistema de Classificação**

**Problema Reportado**: 
- Quando o usuário classificava um produto no Wizard de Alerta de CFOP (ex: "ARLA" como "combustível" com CFOP 1652), o sistema ignorava o CFOP escolhido e aplicava uma conversão genérica.
- CFOPs de bonificação quando convertidos não mantinham a natureza correta.
- As regras salvas pelo Wizard não eram reconhecidas pela Classificação Inteligente e vice-versa.

**Solução Implementada**:

1. **Unificação dos campos em `learned_rules`**:
   - Agora TODOS os pontos de entrada de classificação (Wizard grupo, Wizard individual, Classificação Inteligente) salvam regras com os MESMOS campos padronizados:
     - Campos Wizard: `produto_descricao`, `cfop_correto`, `categoria_correta`
     - Campos Classificação Inteligente: `descricao_produto`, `padrao`, `cfop`, `categoria`
     - Campos compartilhados: `ncm`, `company_id`, `id`

2. **Inferência de categoria do CFOP DESTINO**:
   - A função `resolver_alerta_cfop_por_grupo()` agora infere a categoria a partir do `novo_cfop` (CFOP que o usuário escolheu), NÃO do `cfop_atual`
   - Exemplo: Se o usuário escolhe CFOP 1652, a categoria será "combustivel" (não uma conversão genérica)

3. **Mapeamento de bonificação corrigido**:
   - A função `obter_categoria_por_cfop()` agora reconhece CFOPs de bonificação tanto de ENTRADA quanto de SAÍDA:
     - 1910, 2910 → bonificação (entrada)
     - 5910, 6910 → bonificação (saída)
   - Idem para amostra grátis: 1911, 2911, 5911, 6911

4. **Busca de produtos melhorada no Wizard**:
   - A busca agora considera tanto o `cfop` atual quanto o `cfop_original_emissor`
   - Garante que produtos que tiveram CFOP convertido na importação sejam encontrados

5. **Testes automatizados**:
   - Criado `/app/backend/tests/test_classification_unification.py` com 19 testes cobrindo:
     - Categorias por CFOP (bonificação, combustível, amostra grátis, devolução)
     - Geração de CFOP por categoria
     - Normalização de descrições
     - Validação de campos padronizados

**Arquivos Modificados**:
- `/app/backend/server.py`: Funções `resolver_alerta_cfop_por_grupo`, `resolver_alerta_cfop_individual`, `obter_categoria_por_cfop`
- `/app/backend/tests/test_classification_unification.py` (novo)

**Resultado**:
- ✅ Wizard e Classificação Inteligente usam a mesma base de regras
- ✅ CFOP escolhido pelo usuário é respeitado
- ✅ Categoria é inferida do CFOP destino
- ✅ CFOPs de bonificação de entrada e saída são reconhecidos
- ✅ Testes automatizados para evitar regressões

---

### Data: 10/12/2025 - Sessão 2
**Funcionalidade: Classificação Unificada e Cálculo de PIS/COFINS com Categorias**

**Problema**: Quando o usuário classificava produtos em Alertas de CFOP, Classificação Inteligente ou Wizard, as regras não eram aplicadas uniformemente nos cálculos de PIS/COFINS.

**Solução Implementada**:

1. **`calcular_pis_cofins_unificado()` atualizada**:
   - Agora considera a `categoria_classificada` do produto
   - Categorias como `devolucao`, `bonificacao`, `brinde`, `transferencia`, `remessa` NÃO geram crédito/débito
   - CFOPs específicos de devolução/remessa também são desconsiderados
   - Lista de CFOPs sem crédito: 1201-1209, 2201-2209, 1410, 2410, 1913, 2913, etc.
   - Lista de CFOPs sem débito: 5201-5209, 6201-6209, 5410, 6410, 5910, 6910, etc.

2. **`calcular_pis_cofins_por_cst()` atualizada**:
   - Mesma lógica de categorias e CFOPs
   - Produtos desconsiderados aparecem sob CST 98 (Desconsiderado)

3. **`classificar_produtos_pendentes_wizard()` atualizada**:
   - Agora salva regras em `learned_rules` para aplicação futura
   - Garante que novas importações apliquem as mesmas regras

4. **`resolver_alerta_cfop_por_grupo()` (já corrigida na sessão anterior)**:
   - Salva regras com `produto_descricao`, `produto_codigo`, `ncm`

**Resultado**:
- Classificação em qualquer menu é salva em base única (`learned_rules`) ✅
- Cálculos de PIS/COFINS consideram a categoria classificada ✅
- Devoluções e bonificações são desconsideradas automaticamente ✅

---

### Data: 10/12/2025 - Sessão 1
- Correção de CST 70/50 no PIS/COFINS
- Menu Divergências funcionando para grandes volumes
- Sincronização Alerta de CFOPs → Classificação Inteligente
- Correção economia na Reforma Tributária
- Detalhes por produto na Reforma Tributária
- IPI apenas para indústria no Fechamento Fiscal
- PIS/COFINS consistente com menu Apuração
- ICMS credor mostra "A Recuperar" no Dashboard
- Menu ICMS ST oculto para não contribuintes

## Backlog

### P0 (Crítico) - CONCLUÍDO
- [x] Classificação Unificada (Alertas CFOP, Wizard, Classificação Inteligente)
- [x] Cálculo PIS/COFINS considerando categorias (devolução, bonificação)
- [x] CFOPs desconsiderados não geram crédito/débito
- [x] CFOP escolhido pelo usuário é respeitado (não conversão automática)
- [x] Campos de regras padronizados entre Wizard e Classificação Inteligente

### P1 (Alta Prioridade)
- [ ] Testar fluxo completo de classificação em produção
- [ ] Validar cálculos após classificações
- [ ] Implementar totalizador por CST nas abas de CRÉDITOS/DÉBITOS do PIS/COFINS

### P2 (Média Prioridade)
- [ ] Pacote de instalação On-Premise (Docker Compose)
- [ ] Corrigir página Insights IA
- [ ] Implementar testes automatizados com pytest para todas as funções críticas
- [ ] Refatorar server.py (separar em módulos)

## Credenciais de Teste
- **Produção**: `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa**: COMERCIAL RS LTDA (ID: 6026)
- **Competência**: 01/2026

## 3rd Party Integrations
- Gemini (classificação de produtos)
