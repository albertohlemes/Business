# PRD - Sistema de Classificação Fiscal

## Problema Original
Sistema de classificação fiscal inteligente para notas fiscais eletrônicas, com "Memória IA" para automatizar classificações de CFOP e produtos.

## Status Atual (Dezembro 2025)

### CORREÇÕES CRÍTICAS DE PERFORMANCE (16/12)
Problemas com cliente de alto volume (14000+ XMLs) resolvidos:

1. **Função `is_documento_entrada()`**: Nova função robusta que determina se um documento é entrada ou saída usando múltiplos critérios (tipo, tipo_operacao, CFOP como fallback)

2. **ICMS Agregado**: Corrigido para usar CFOP como fallback quando campo `tipo` está vazio ou diferente

3. **PIS/COFINS Agregado**: Corrigido para usar is_entrada ao invés de comparação direta com string

4. **Vilões e Oportunidades**: Corrigido para usar normalização de tipo

5. **Reforma Tributária**: Corrigido pipeline de agregação para usar `$ifNull` entre tipo e tipo_operacao

6. **Exclusão de documentos**: Corrigido para buscar tanto em `tipo` quanto em `tipo_operacao`

### Módulo de Locação (16/12)
- Importação via IA com verificação de duplicidade
- Exclusão de locação das apurações ICMS/ISS/SPED
- ISS agrupado por município

### Bugs Pendentes
- Exceções CFOP (salvas com código errado)
- UI WizardFechamento inconsistente

## Arquivos Principais
- `/app/backend/server.py` - Backend principal
- `/app/frontend/src/pages/Documents.js`
- `/app/frontend/src/components/RecibosLocacaoList.js`

## Credenciais
- Super Admin: `alberto.lemes@businessconta.com.br` / `Business@2026`
- Cliente alto volume: REPUBLIC C.A PIZZA (6208)
