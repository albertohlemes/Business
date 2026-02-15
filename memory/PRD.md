# PRD - Sistema de Classificação Fiscal

## Problema Original
Sistema de classificação fiscal inteligente para notas fiscais eletrônicas, com "Memória IA" para automatizar classificações de CFOP e produtos.

## Requisitos Principais
1. **Memória IA para Edições Manuais**: Edições manuais de CFOP devem criar/atualizar regras permanentes na coleção `learned_rules`
2. **Fluxo de Edição de CFOP**: Layout compacto, seleção de CFOP destino no header, edição individual para exceções
3. **UI - Tags em Maiúsculas**: Todas as tags de categoria em maiúsculas
4. **Consistência de UI**: Fluxo idêntico entre `ClassificacaoInteligente.js` e `WizardFechamento.js`

## Status Atual (Dezembro 2025)

### Implementado
- Nova UI de edição de CFOP em `ClassificacaoInteligente.js`
- Layout compacto de uma linha para alertas
- Botão "Manter Natureza" 
- Backend da "Memória IA" funcional

### Bugs Críticos Pendentes (P0)
1. **Bug: Exceções de CFOP salvas com código errado** - Investigação iniciada, lógica do frontend parece correta. Necessário debug do payload enviado ao backend.
2. **UI do WizardFechamento.js inconsistente** - Precisa replicar nova UI da ClassificacaoInteligente

### Backlog (P1-P2)
- Tags de categoria em maiúsculas
- NF de fevereiro aparecendo em janeiro
- Discrepância de valores Dashboard vs SPED
- Botão Login travado em "Processando..."
- Visualização agrupada por dia
- Relatórios por email
- Refatoração do `server.py` monolítico
- Integração CT-e
- Testes automatizados

## Arquivos Principais
- `/app/frontend/src/pages/ClassificacaoInteligente.js`
- `/app/frontend/src/pages/WizardFechamento.js`
- `/app/backend/server.py`

## Credenciais de Teste
- Super Admin: `alberto.lemes@businessconta.com.br` / `Business@2026`
