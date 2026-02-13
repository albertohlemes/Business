# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Diretriz Principal do Wizard de Fechamento
O **Wizard de Fechamento** é uma **réplica manual exata** da **Importação com IA**:
- **Se importou SEM IA**: O Wizard faz o trabalho que a IA faria manualmente
- **Se importou COM IA**: O Wizard serve como validador

| Etapa Wizard | O que a IA faz na Importação | O que o Wizard faz |
|--------------|------------------------------|-------------------|
| 1 - Canceladas | Detecta via cStat=101/151 | Confirma e marca canceladas |
| 2 - Devoluções | Desconsiderada CFOP devolução | Desconsiderada notas de terceiros |
| 3 - Alertas CFOP | Gera alertas pendentes | Resolve todos alertas CFOP |
| 4 - Classificação | Classifica com IA | Classifica com IA |
| 5 - PIS/COFINS Entrada | Calcula CST | Calcula/Corrige CST |
| 6 - PIS/COFINS Saída | Calcula CST | Calcula/Corrige CST |
| 7 - Reforma Tributária | Calcula IVA Dual | Visualiza cálculo |

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Processamento em Background**: Celery + Redis
- **Principais Bibliotecas**: JSZip (extração ZIP no cliente), PyMuPDF (extração PDF)

## Funcionalidades Implementadas

### Wizard de Fechamento Fiscal (8 Etapas)
1. **Notas Canceladas** - Confirmar e processar notas fiscais canceladas
2. **Devoluções de Fornecedores** - Identificar devoluções e excluir notas referenciadas
3. **Alertas de CFOP** - Revisar CFOPs de operações distintas pendentes de revisão
4. **Classificação de CFOPs** - Converter e classificar CFOPs dos produtos
5. **PIS/COFINS Entradas** - Corrigir CST de PIS e COFINS nas entradas
6. **PIS/COFINS Saídas** - Corrigir CST de PIS e COFINS nas saídas
7. **Reforma Tributária** - Calcular IVA Dual (CBS + IBS)
8. **Concluído** - Fechamento fiscal finalizado

### Devoluções com Correlação de Nota Original
- Detecta automaticamente notas de terceiros com CFOP de entrada
- Busca e correlaciona a nota original referenciada
- Permite excluir ambas as notas (devolução + original) da apuração
- CFOPs considerados: CFOPS_DEVOLUCAO_TERCEIROS_GLOBAL

### Alertas de CFOP (Etapa 3 - Sincronizada)
- Lista todos os CFOPs de operações não-comerciais
- Opções para cada CFOP: Manter, Converter para Compra, Digitar CFOP manual
- **SINCRONIZADO** com Classificação Inteligente via `pendente_revisao_cfop`
- Ao completar etapa: aplica ação padrão "manter" para CFOPs sem ação definida
- Sincronização final garante que nenhum produto fique pendente

### Importação Rápida (sem IA)
- Flag `skip_ai` em todas as portas de upload
- Quando ativo: pula classificação IA, mantém CFOPs originais
- Ainda aplica CST de PIS/COFINS

### Upload em Background (Celery + Redis)
- Redis instalado e rodando
- Celery worker ativo
- Fallback automático para streaming se Redis cair

## Endpoints Principais

### Wizard de Fechamento
- `GET /api/wizard-fechamento/status/{company_id}` - Status atual
- `GET /api/wizard-fechamento/step/{company_id}/{step_id}` - Dados de etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/complete` - Completar etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/go` - Navegar para etapa
- `GET /api/wizard-fechamento/relatorio/{company_id}` - **NOVO** Gerar relatório PDF/Excel

### Alertas CFOP (Classificação Inteligente)
- `GET /api/alertas-cfop/{company_id}` - Listar alertas
- `GET /api/alertas-cfop/{company_id}/agrupado` - Alertas agrupados por CFOP
- `POST /api/alertas-cfop/resolver-grupo` - Resolver todos de um CFOP
- `POST /api/alertas-cfop/resolver-individual` - Resolver individual

### Upload de XMLs
- `POST /api/upload-documents` - Upload direto
- `POST /api/upload-documents-streaming` - Upload streaming
- `POST /api/xml/upload-background` - Upload em background (Celery)
- `GET /api/xml/job-status/{job_id}` - Status do job

### Importação em Lote
- `POST /api/batch-import/upload-estrutura` - Upload de ZIP

## Bugs Corrigidos

### Sessão Atual (Dezembro/2025)
1. ✅ **Sincronização Wizard ↔ Classificação Inteligente** - Mesmos critérios de busca em ambos endpoints
2. ✅ **Etapa 2 - Devoluções**: Backend aceita formato correto enviado pelo frontend
3. ✅ **Etapa 3 - Alertas CFOP**: Aplica ação padrão "manter" para CFOPs sem ação definida
4. ✅ **Sincronização Final**: Garante que todos produtos pendentes sejam resolvidos
5. ✅ **Filtro de Canceladas/Desconsideradas**: Aplicado consistentemente em ambas as telas
6. ✅ **CORREÇÃO CRÍTICA - Classificação Entrada/Saída**: Adicionado `.strip()` na comparação de CNPJs para remover espaços/caracteres de controle que podem vir do XML, causando classificação incorreta
7. ✅ **Wizard Cancelamento (Etapa 1)**: Corrigido filtro para buscar APENAS notas com `cancelada: True` (cStat 101/151), removendo filtros amplos que incluíam notas incorretas
8. ✅ **CORREÇÃO CRÍTICA - Classificação por CNPJ vs CFOP**: Corrigido múltiplos endpoints que usavam CFOP para classificar entrada/saída ao invés do campo `tipo` (baseado em CNPJ do emitente):
   - `preview-delete` - Preview de exclusão de documentos
   - `pis-cofins/apuracao` - Apuração de PIS/COFINS  
   - `apuracao/relacao-notas` - Relação de notas fiscais
   - `apuracao/composicao-valor` - Composição de valor das notas
   - **A regra correta é**: CNPJ emitente == CNPJ empresa → SAÍDA; diferente → ENTRADA
9. ✅ **Etapa 2 - Devoluções (Critério Terceiro)**: Corrigido filtro para mostrar APENAS notas onde o terceiro emitiu ENTRADA (CFOP original 1xxx, 2xxx, 3xxx). Notas onde terceiro emitiu SAÍDA (5xxx, 6xxx) não aparecem mais.
10. ✅ **NOVA FUNCIONALIDADE - Relatório do Wizard**: Implementado sistema de geração de relatório consolidado ao final do wizard:
    - PDF com todas as alterações realizadas em cada etapa
    - Excel com abas separadas por etapa para análise detalhada
    - Inclui: data/hora, usuário responsável, estado anterior, ação aplicada, estado final
    - Finalidade: auditoria, histórico e segurança do usuário

### Sessões Anteriores
- ✅ Upload em Background (Redis/Celery)
- ✅ Limite de 200 documentos removido
- ✅ Discrepância Central vs Wizard
- ✅ Barra de Progresso 95%
- ✅ Modal de Seleção
- ✅ Importação em Lote
- ✅ Detecção de Cancelamento

## Bugs Pendentes

### P1 - Problema de Deploy
- Atualizações não aparecem em produção
- Usuário testa em produção, correções estão no preview
- **CRÍTICO**: Impede usuário de usar correções feitas

### P1 - NF de fevereiro aparecendo em janeiro
- Bug recorrente na alocação de competência fiscal
- Verificar campo de data usado (`dhEmi` vs `dhSaiEnt`)

### P1 - Barra de progresso de upload trava para empresa Sungroup
- Precisa investigar caso específico

### P2 - Discrepância Dashboard vs SPED
- Valores totais não batem entre dashboard e registro E110

### P2 - Botão de Login travado
- Botão fica em "Processando..." indefinidamente

### P2 - Botão de Login fica travado em "Processando..."
- Comportamento intermitente

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Arquivos de Referência
- `/app/backend/server.py` - Lógica principal do backend (>31k linhas - precisa refatoração)
- `/app/backend/celery_tasks.py` - Processamento em background
- `/app/frontend/src/pages/WizardFechamento.js` - UI do Wizard
- `/app/frontend/src/pages/ClassificacaoInteligente.js` - UI da Classificação

## Próximas Tarefas (Backlog)

### P0 - Urgente
- Refatoração do `server.py` (muito grande, >31k linhas)
- Resolver problema de deploy em produção

### P1 - Importante
- Implementar visualização agrupada por dia na página de documentos
- Implementar relatórios por email para importação em lote
- Integração de CT-e (Conhecimento de Transporte Eletrônico)
- Refatoração do `Documents.js` (>4k linhas)

### P2 - Futuro
- Implementação de testes automatizados (Playwright)
- Melhorias na UI de classificação

## Changelog

### Dezembro/2025 (Sessão Atual)
- ✅ Sincronização Wizard ↔ Classificação Inteligente
- ✅ Correção do formato de dados da Etapa 2 (Devoluções)
- ✅ Etapa 3 aplica ação padrão "manter" automaticamente
- ✅ Filtro de canceladas/desconsideradas em todos endpoints de alertas
- ✅ **CORREÇÃO CRÍTICA**: Adicionado `.strip()` na comparação de CNPJs para classificação entrada/saída - espaços ou caracteres extras no XML causavam classificação incorreta

### 13/02/2026 (Sessão Anterior)
- ✅ Adicionada nova etapa no Wizard: "Alertas de CFOP"
- ✅ Devoluções agora correlacionam e excluem nota original
- ✅ Validada importação rápida sem IA
- ✅ Redis e Celery configurados e funcionando
- ✅ Fallback automático para streaming quando background falha
- ✅ Limite de 200 removido nos steps do Wizard
- ✅ Atualizado WIZARD_STEPS para 8 etapas
