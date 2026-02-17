# PRD - Sistema AURION de Análise Fiscal

## Problema Original
Aplicação de análise fiscal com problemas críticos de performance e consistência de dados. As páginas de análise (PIS/COFINS, RET, Análise Horizontal, Indicadores) travavam ou exibiam valores fiscais inconsistentes.

## Requisitos de Produto (P0 - Críticos)
1. **Estabilidade e Performance**: Sistema não deve travar ao processar grandes volumes (+15.000 documentos)
2. **Correção e Consistência de Dados**: Todas as páginas devem exibir cálculos fiscais corretos e 100% consistentes
3. **Instalação On-Premise (P2)**: Possibilidade de instalar em servidor local

## Arquitetura
```
/app/
├── backend/
│   └── server.py  # FastAPI monólito (~30.000 linhas)
└── frontend/
    └── src/
        └── pages/
            ├── ApuracaoICMS.js
            └── Indicadores.js
```

## O que foi implementado

### Data: 17/02/2026
**Correção: Inconsistência nos Valores Desconsiderados de ICMS**

**Problema**: A soma dos valores de ICMS na tabela de CFOPs não batia com o Total de Crédito ICMS porque os CFOPs desconsiderados (Despesa/ST) ainda mostravam seus valores originais na tabela, mesmo que esses valores não fossem considerados no total.

**Solução Implementada**:
1. Modificado o endpoint `/api/apuracao-icms` em `server.py`
2. CFOPs desconsiderados agora mostram R$ 0,00 na coluna "Crédito ICMS" da tabela
3. O valor original é preservado em `valor_icms_original` para referência
4. Atualizado frontend `ApuracaoICMS.js` para mostrar valor original tachado e R$ 0,00 embaixo

**Resultado**:
- Soma da coluna 'Crédito ICMS' na tabela = Total Crédito ICMS ✅
- Diferença = R$ 0,00

### Correções Anteriores
- Unificação de lógica para Compras/Vendas Líquidas, Markup, Total de Entradas/Saídas
- Consistência de PIS/COFINS entre Dashboard e páginas de análise
- Ajustes de frontend na página Indicadores (banner "Vendas Líquidas")

## Backlog

### P0 (Crítico)
- [x] Correção de valores desconsiderados ICMS
- [ ] Validação de performance com alto volume (+14k documentos)

### P1 (Alta Prioridade)
- [ ] Validação da fórmula de Margem de Contribuição
- [ ] Validação de Vilões e Oportunidades

### P2 (Média Prioridade)
- [ ] Pacote de instalação On-Premise (Docker Compose)
- [ ] Corrigir página Insights IA
- [ ] Implementar testes automatizados com pytest
- [ ] Auditoria de Performance em server.py

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`

## 3rd Party Integrations
- Gemini (classificação de produtos)
