# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Última Atualização: 14/02/2026

### Lógica de Classificação com IA (Hierarquia de 6 Regras)
A classificação de produtos segue uma hierarquia estrita:
1. **CFOP de Devolução** - Automático para CFOPs de devolução
2. **Regras Aprendidas (learned_rules)** - Cache de classificações anteriores (manuais ou IA)
3. **NCM de Vendas** - Match com produtos vendidos pelo mesmo NCM
4. **Palavras-chave de Vendas** - Match com descrições de produtos vendidos
5. **Palavras-chave da Empresa** - Cadastradas no perfil da empresa
6. **IA Gemini** - Último recurso, usa LLM para classificar

**IMPORTANTE**: Classificações manuais SEMPRE sobrepõem regras anteriores e são salvas em `learned_rules` para uso futuro.

### Paleta de Cores
- **Azul** - Entradas/Compras
- **Verde/Emerald** - Saídas/Créditos
- **Amber/Orange** - Alertas/Pendências
- **Cyan/Teal** - Devoluções, Jobs em Background
- **Slate** - Contribuições (CSLL, PIS, COFINS)
- **Vermelho** - Valores a Pagar/Erros

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

### Sessão Atual (Fevereiro/2026)
15. ✅ **CORREÇÃO CRÍTICA - Dashboard travando com 14.000+ documentos**:
    - **Problema**: Ao clicar no menu Dashboard, o sistema caía quando havia muitos documentos (ex: 14.000 cupons da Republic)
    - **Causa Raiz**: O endpoint `/api/dashboard/stats` carregava todos os documentos e seus produtos na memória, iterando em Python por cada produto para calcular estatísticas
    - **Correção**: 
      - Implementada função `_get_dashboard_stats_aggregated` usando agregação do MongoDB
      - Para volumes > 5.000 documentos, os cálculos são feitos diretamente no banco de dados
      - Tempo de resposta: de timeout para ~1 segundo
    - **Arquivos Modificados**: `/app/backend/server.py`
    - **Verificação**: Testado com empresa Republic (14.700 docs) - resposta em 1 segundo

16. ✅ **CORREÇÃO - Histórico de importações inconsistente**:
    - **Problema**: Os dados do card de histórico de importação não batiam com o relatório exibido ao término de cada importação
    - **Causa Raiz**: A estrutura de dados `progress["results"]` nem sempre continha os campos esperados no momento do salvamento
    - **Correção**:
      - Adicionada lógica de fallback para calcular totais a partir das listas (`success`, `errors`, `duplicadas`) quando o `resumo` estiver incompleto
      - Adicionado campo `tipo_operacao` para compatibilidade com frontend
      - Melhorados os logs de debug
    - **Arquivos Modificados**: `/app/backend/server.py`
    - **Observação**: Importações anteriores podem ter dados inconsistentes, mas novas importações serão salvas corretamente

14. ✅ **CORREÇÃO CRÍTICA - SPED com destaque de ICMS incorreto em Despesas e ST**:
    - **Problema**: Ao gerar o SPED Fiscal, as despesas e notas de ST estavam sendo geradas com destaque de ICMS mesmo com as opções marcadas para excluí-los
    - **Causa Raiz**: Frontend (`ExportSPED.js`) enviava parâmetros com nomes incorretos (`zerarIcmsSt`, `incluirDespesas`) que não correspondiam aos nomes esperados pelo backend (`excluir_creditos_despesa_st`, `aplicar_beneficio_fiscal`)
    - **Correção**:
      - Frontend: Corrigidos os nomes dos parâmetros em `ExportSPED.js` para `excluir_creditos_despesa_st` e `aplicar_beneficio_fiscal`
      - Backend: Expandidas as listas de CFOPs de despesas e ST para incluir mais casos (1551, 2551, 1653, 2653, 1407, 2407, etc.)
      - Backend: Sincronizadas as listas `CFOPS_DESPESAS`, `CFOPS_ST` e `CFOPS_SEM_CREDITO_SPED` em todas as partes do código
    - **Arquivos Modificados**: `/app/frontend/src/pages/ExportSPED.js`, `/app/backend/server.py`
    - **Verificação**: Testado com empresa COMERCIAL RS LTDA, competência 01/2026 - 333 itens de despesa/ST verificados, todos com ICMS=0 quando flag ativa

11. ✅ **CORREÇÃO CRÍTICA - Dashboard e Apuração ICMS mostrando dados incorretos de vendas/débitos**:
    - **Problema**: Dashboard e tela de Apuração ICMS mostravam valores de vendas/débitos mesmo quando a empresa não tinha notas de saída importadas
    - **Causa Raiz**: Múltiplos endpoints usavam CFOP do produto para determinar se era entrada ou saída, ignorando o campo `tipo` do documento (que é a fonte da verdade, baseada no CNPJ do emitente)
    - **Correção**: Modificados os seguintes endpoints no `server.py` para usar o campo `tipo` do documento:
      - `/api/apuracao-icms/{company_id}` - Apuração de ICMS próprio
      - `/api/apuracao-ipi/{company_id}` - Apuração de IPI
      - `/api/apuracao-pis-cofins/{company_id}` - Apuração de PIS/COFINS
    - **Regra Correta**: Usar `doc.get('tipo')` como fonte da verdade, nunca inferir pelo CFOP do produto

12. ✅ **Flags de ICMS não persistiam ao trocar de tela**:
    - **Problema**: Os checkboxes (Desconsiderar ICMS Despesas, Desconsiderar ICMS ST, Benefício Fiscal) perdiam a seleção ao navegar para outra tela e voltar
    - **Causa Raiz**: Os states eram inicializados com `useState(false)` e só carregavam os valores corretos após o useEffect executar, causando um flash de valores incorretos
    - **Correção**: Implementada lazy initialization nos estados usando função callback no `useState()` que lê do localStorage imediatamente
    - **Arquivo**: `/app/frontend/src/pages/ApuracaoICMS.js`

13. ✅ **Menu ICMS ST página em branco**:
    - **Problema**: A aba ICMS ST aparecia em branco quando não havia dados
    - **Correção**: Adicionada mensagem informativa quando não há movimentação de ICMS ST, explicando que o ICMS ST é cobrado apenas em operações com mercadorias sujeitas à substituição tributária
    - **Arquivo**: `/app/frontend/src/pages/ApuracaoICMS.js`

### Sessão Anterior (Dezembro/2025)
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
- ~~Precisa investigar caso específico~~ **CORRIGIDO em 14/02/2026** - Melhorado polling de fallback com detecção de erros e stale progress

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

### Fevereiro/2026 (Sessão 14/02 - Melhorias Wizard)
- ✅ **NOVA FUNCIONALIDADE - CFOP Individual por Produto (Step 3)**:
  - Ao expandir a listagem de produtos no Alertas de CFOP, cada produto agora possui input para CFOP individual
  - Permite definir CFOP específico para cada produto, sobrepondo a ação em lote
  - Estado gerenciado via `cfopsPorProduto` no componente
  - Backend processa `cfops_individuais` no formato `cfop_docId_prodIdx`
  - Arquivos: `WizardFechamento.js` (lines 907-1010), `server.py` (lines 31597-31652)

- ✅ **NOVA FUNCIONALIDADE - Alerta de Divergência em Devoluções (Step 2)**:
  - Quando uma nota de devolução tem valor diferente da nota original referenciada, exibe alerta visual
  - Alerta mostra: Valor Devolução vs Valor Original vs Diferença
  - Botões "Manter Original" e "Excluir Original" para decisão do usuário
  - Estado gerenciado via `decisoesOriginais` no componente
  - Arquivo: `WizardFechamento.js` (lines 497-690)

- ✅ **NOVA FUNCIONALIDADE - Clareza em Notas Canceladas (Step 1)**:
  - Notas canceladas agora são separadas visualmente em "ENTRADAS" e "SAÍDAS"
  - Entradas: borda azul (`border-l-4 border-blue-500`) + badge azul
  - Saídas: borda verde (`border-l-4 border-emerald-500`) + badge verde
  - Contadores separados no topo da tela
  - Arquivo: `WizardFechamento.js` (lines 397-495)

- ✅ **VERIFICADO - Classificação IA com Hierarquia de 6 Regras**:
  - Hierarquia confirmada funcionando: CFOP Devolução → Learned Rules → NCM Vendas → Palavras-Chave Vendas → Palavras-Chave Empresa → IA Gemini
  - Código verificado em `server.py` (lines 31655-31750)

### Fevereiro/2026 (Sessão 14/02 - P0 Bugs Fix)
- ✅ **CORREÇÃO P0 - Relatório do Wizard**: Corrigida geração de dados para incluir TODAS as etapas (1-7)
  - Corrigido step_name de 'classificacao' para 'classificacao_cfop' na busca de dados da Etapa 4
  - Relatório agora mostra etapas mesmo quando não há dados (com mensagem informativa)
  - Etapa 7 (Reforma Tributária) adicionada ao relatório
  - PDF agora renderiza todas as etapas em sequência
- ✅ **CORREÇÃO P0 - Menu ICMS ST**: Confirmado funcionando corretamente
  - Aba ICMS ST exibe mensagem "Sem Movimentação de ICMS ST" quando não há dados
  - Navegação entre abas ICMS Próprio e ICMS ST funcionando
- ✅ **NOVO - Reclassificação com IA (Hierarquia de 6 Regras)**:
  - **Modal de Confirmação**: Ao clicar em "Classificar Produtos com IA", modal pergunta se usuário deseja reclassificar
  - **Hierarquia de 6 Regras** implementada no backend:
    1. CFOP de Devolução (automático)
    2. Cache de Regras Aprendidas (learned_rules)
    3. Aprendizado por NCM (match com vendas)
    4. Aprendizado por Palavras-Chave (match com vendas)
    5. Palavras-Chave Cadastradas pela Empresa
    6. Classificação por IA (Gemini) como último recurso
  - Estatísticas detalhadas de classificação por fonte
  - Parâmetro `forcar_reclassificacao` para reclassificar produtos já classificados
- ✅ **NOVO - Função `calcular_cfop_por_categoria()`**: Calcula CFOP adequado baseado na categoria e UF

### Fevereiro/2026 (Sessão Atual - 14/02)
- ✅ **CORREÇÃO P0**: Bug da barra de progresso do upload que travava
  - Melhorado `UploadContext.js` com polling mais robusto:
    - Detecção de erros consecutivos (máx. 5 tentativas)
    - Detecção de progresso estagnado (máx. 40 iterações = 60s)
    - Watchdog de SSE com timeout de 15s para forçar polling
  - Melhorado endpoint `/api/xml/upload-status/{upload_id}`:
    - Retorna `status: "not_found"` quando upload não existe
    - Correção automática de `completed` baseado em `results`
- ✅ **UX WIZARD**: Wizard de Fechamento mais dinâmico (Etapa 8 - Concluído)
  - Novo componente `WizardConcluidoStep` com:
    - Destaque visual na seção de download de relatório
    - Auto-redirect para Central de Fechamento após download (2.5s)
    - Botão "Voltar para Central de Fechamento"
    - Animações (`animate-bounce`, `animate-pulse-slow`)
  - Corrigido bug do `case 7` duplicado → agora é `case 8`
- ✅ Nova animação CSS `animate-pulse-slow` em `App.css`
- ✅ **UX WIZARD ETAPA 3 (Alertas de CFOP)**: Refatorada para seleção visual
  - Opções de CFOP agora são botões estilo **radio button** (Manter, Converter, Outro CFOP)
  - Opção selecionada fica destacada com borda colorida e indicador visual
  - Input de CFOP manual aparece apenas quando "Outro CFOP" está selecionado
  - **Resumo das alterações** exibido antes do botão Confirmar
  - Ao confirmar, todas as seleções são aplicadas em lote
  - Estados React (`cfopSelections`, `manualCfopInputs`) em vez de localStorage

### Fevereiro/2026 (Sessão 13/02)
- ✅ **CORREÇÃO CRÍTICA**: Dashboard e Apuração ICMS mostravam vendas/débitos incorretos
  - Corrigido endpoints `/api/apuracao-icms`, `/api/apuracao-ipi`, `/api/apuracao-pis-cofins`
  - Agora usam campo `tipo` do documento em vez de inferir por CFOP
- ✅ Flags de ICMS agora persistem ao trocar de tela (lazy initialization no useState)
- ✅ Menu ICMS ST exibe mensagem informativa quando não há dados
- ✅ **NOVA FUNCIONALIDADE**: Classificação em lote baseada no tipo de atividade da empresa
  - Endpoint: `POST /api/wizard-fechamento/classificar-pendentes/{company_id}`
  - Regras: Indústria→INSUMO, Comércio→REVENDA, Serviços→DESPESA
  - Adicionado botão "Classificar Todos com Padrão da Empresa" no Wizard etapa 4
- ✅ **CORREÇÃO**: Importação sem IA agora aplica classificação padrão (antes ficava sem categoria)
- ✅ Função utilitária `obter_categoria_padrao_por_atividade()` criada para centralizar regras

### Dezembro/2025 (Sessão Anterior)
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
