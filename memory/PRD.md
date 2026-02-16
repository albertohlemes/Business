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
- **NOVO (15/12)**: Otimização do endpoint RET/Inteligência Tributária para alto volume de documentos (15000+)
- **NOVO (16/12)**: Módulo completo de Faturas/Recibos de Locação
  - Importação via IA (PDF/Imagem) com extração automática de dados
  - Listagem com filtros (Todos, Ativos, Cancelados)
  - Funcionalidade de marcar como Cancelado com motivo
  - Resumo de totais e valores
  - Tributação correta: PIS, COFINS, IRPJ, CSLL (sem ISS/ICMS)
  - Aparece apenas para empresas com `atividade_locacao: true`
  - **FIX**: Verificação de duplicidade por número do recibo
  - **FIX**: Exclusão de recibos de locação das apurações de ICMS/ISS e SPED

### Bugs Críticos Pendentes (P0)
1. **Bug: Exceções de CFOP salvas com código errado** - Investigação iniciada
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
- `/app/frontend/src/pages/RET.js`
- `/app/frontend/src/pages/Documents.js`
- `/app/frontend/src/components/RecibosLocacaoList.js`
- `/app/backend/server.py`
- `/app/backend/services/document_ai.py`

## Credenciais de Teste
- Super Admin: `alberto.lemes@businessconta.com.br` / `Business@2026`
- Empresa com locação: COMERCIAL RS LTDA (#6026)
