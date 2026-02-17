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

### P0 (Crítico)
- [x] Classificação Unificada (Alertas CFOP, Wizard, Classificação Inteligente)
- [x] Cálculo PIS/COFINS considerando categorias (devolução, bonificação)
- [x] CFOPs desconsiderados não geram crédito/débito

### P1 (Alta Prioridade)
- [ ] Testar fluxo completo de classificação em produção
- [ ] Validar cálculos após classificações

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
