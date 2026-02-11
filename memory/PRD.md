# AURION - Sistema de Fechamento Fiscal Premium

## Visão Geral
Sistema completo de contabilidade fiscal brasileira para empresas de diferentes regimes tributários (Simples Nacional, Lucro Presumido, Lucro Real).

## Funcionalidades Principais

### 1. Gestão de Empresas
- Cadastro com busca automática na Receita Federal
- Múltiplos regimes tributários
- **Upload de logo da empresa** ✅
- Configuração de CNAE, tipo de atividade
- Perfis comerciais (indústria, distribuidor, varejo)
- **Menu Empresas removido do sidebar** ✅ (disponível apenas no header)

### 2. Importação de Documentos
- Upload de XMLs (NF-e, NFC-e, CT-e, NFS-e)
- Importação via IA (PDFs, imagens)
- Integração com SIEG (BLOQUEADO - chave inválida)
- **Barra de progresso flutuante global** ✅ (visível em todas as telas)
- **Botão X para fechar barra de progresso** ✅
- **Timeout automático de 120 segundos** ✅ (notifica erro se travada)
- Validação automática de CFOP por operação
- **Filtro de divergências** ✅ (Todos/Divergente/OK)
- **Filtro de status** ✅ (Ativas/Canceladas/Todas)
- **Relatório de importação expandido** ✅ (inclui devoluções de fornecedor)
- **Exibição de notas canceladas** ✅ (vermelho e riscadas)
- **Histórico de Importações** ✅ (modal com lista de importações anteriores e relatórios detalhados)

### 3. Dashboard - Cards de Navegação
- **Cards clicáveis** ✅ que navegam para tipo específico de documento
- NF-e Entrada → `/documents?operacao=entrada&tipo=nfe`
- CT-e Entrada → `/documents?operacao=entrada&tipo=cte`
- NFS-e Tomados → `/documents?operacao=entrada&tipo=servicos_tomados`
- NF-e Saída → `/documents?operacao=saida&tipo=nfe`
- NFC-e (Cupons) → `/documents?operacao=saida&tipo=nfce`
- NFS-e Prestados → `/documents?operacao=saida&tipo=servicos_prestados`

### 4. Visualização de NF-e
- **Modal detalhado de documento** ✅
- Comparativo Capa NF × Produtos
- Indicadores visuais de divergência (verde/vermelho)
- Tabela completa de produtos com CFOP, CST, NCM, bases, impostos

### 5. Alertas de CFOP
- **Agrupamento por CFOP** para ação em lote ✅
- Botões de ação: Manter, Converter, Editar manualmente
- **Atualização de CFOP ao classificar via IA** ✅
- Ação individual ou em lote
- Lista de NFs por produto

### 6. Apurações Fiscais
- ICMS, PIS/COFINS, ISS, IPI
- DIFAL para Simples Nacional
- Cálculo de Fator R
- **DAS corrigido** ✅ (cálculo de descontos ST/monofásico)
- **Indicadores para Lucro Presumido** ✅

### 7. RET - Comparativo de Regimes
- Comparação entre Simples, Presumido e Real
- DRE para Lucro Real
- Aviso de dados incompletos
- Projeção anual

### 8. Classificação Inteligente
- **Modal de edição de produto** ✅
- **Links para NFs do produto** ✅
- Classificação atualiza CFOP automaticamente
- Comandos de IA com atualização de CFOP
- **Categoria "Devolução"** ✅ para CFOPs de devolução (1201-1210, 2201-2210, 5201-5210, 6201-6210)

### 9. Divergências PIS/COFINS
- **Filtra apenas notas de SAÍDA** ✅
- **Bebidas alcoólicas (NCMs 2204-2208) tratadas como TRIBUTADAS** ✅
- CST correto: 01 (saída) / 50 (entrada) para bebidas alcoólicas
- **Abas NCM e Produto padronizadas** ✅ (mesmas colunas da aba Notas Fiscais)

### 10. Notas Canceladas
- **Importação automática** ✅ com status "cancelada"
- **Valores zerados** ✅ (valor_total, produtos, impostos = 0)
- **Exibição visual** ✅ em vermelho com texto riscado na listagem

### 11. Relatórios
- **Seções organizadas por categoria** ✅ (Resumo, Apurações, Documentos, Análises)
- **Multi-seleção com botão "Selecionar Todos"** ✅
- **Exportação para Word, Excel e PDF** ✅
- SPED Fiscal
- Relatórios por alíquota (ICMS, PIS, COFINS)
- CSV de entradas/saídas

### 12. Gestão de Usuários
- **Seção de Atividades Autorizadas** ✅ (selecionar permissões por funcionalidade)
- **Botões Todos/Nenhum** ✅ para seleção rápida
- **Botão "Limpar Inativos"** ✅ para excluir usuários teste/inativos
- **Exclusão permanente de usuários** ✅

## Arquitetura

### Backend (FastAPI)
- `/app/backend/server.py` - Monólito principal
- `/app/backend/services/` - Serviços auxiliares
  - `document_ai.py` - Processamento com IA
  - `simples_nacional_calculator.py` - Cálculos Simples
  - `pis_cofins_calculator.py` - Cálculos PIS/COFINS (CORRIGIDO!)

### Frontend (React)
- `/app/frontend/src/pages/` - Páginas principais
- `/app/frontend/src/components/` - Componentes reutilizáveis
  - `DocumentDetailModal.js` - Modal de detalhes NF ✅ (NOVO)
  - `SortableTable.js` - Componente de ordenação ✅ (NOVO)
- `/app/frontend/src/context/` - Contextos (App, Upload)

## Changelog

### 2026-02-12 (Sessão 22 - TODAS AS 7 FASES COMPLETAS + MELHORIAS)

**FASE 7 - Grupos Empresariais (Multi-estabelecimento):**

**Funcionalidade Implementada:**
- ✅ **Página Grupos Empresariais** (`/grupos-empresariais`): Gestão de holdings
  - Criar grupos com matriz + filiais
  - Visualizar/editar/excluir grupos
  - Expandir para ver detalhes de cada empresa
  - Dashboard consolidado com totais do grupo

- ✅ **Backend Grupos:** 8 novos endpoints:
  - `GET /api/grupos-empresariais` - Listar grupos
  - `POST /api/grupos-empresariais` - Criar grupo
  - `GET /api/grupos-empresariais/{id}` - Detalhes do grupo
  - `PUT /api/grupos-empresariais/{id}` - Atualizar grupo
  - `DELETE /api/grupos-empresariais/{id}` - Excluir grupo
  - `POST /api/grupos-empresariais/{id}/filiais/{company_id}` - Adicionar filial
  - `DELETE /api/grupos-empresariais/{id}/filiais/{company_id}` - Remover filial
  - `GET /api/grupos-empresariais/{id}/consolidado` - Dashboard consolidado

- ✅ **Collection MongoDB:** `grupos_empresariais`
- ✅ **Menu Lateral:** Link "Grupos Empresariais" (admin)

**Arquivos criados:**
- `/app/frontend/src/pages/GruposEmpresariais.js` - Página completa
- `/app/backend/server.py` - Modelos e endpoints

---

**Melhorias de UX (A):**

- ✅ **Componentes de Loading:** `/app/frontend/src/components/ui/LoadingComponents.jsx`
  - `LoadingSpinner` - Spinner animado
  - `SkeletonCard`, `SkeletonTable`, `SkeletonPage` - Placeholders de loading
  - `Toast` - Notificações
  - `Badge` - Badges estilizados
  - `EmptyState` - Estados vazios
  - `StatCard` - Cards de estatísticas

- ✅ **Animações CSS:** `/app/frontend/src/App.css`
  - `animate-fade-in`, `animate-slide-in-*` - Transições suaves
  - `animate-shimmer` - Efeito de loading
  - `animate-glow` - Destaque
  - `card-interactive` - Hover effects
  - Scrollbar customizada
  - Focus visible para acessibilidade

---

**Melhorias de Relatórios (C):**

- ✅ **Gerador de PDF:** `/app/backend/services/pdf_generator.py`
  - Suporte a logo da empresa
  - Cabeçalho personalizado
  - Tabelas estilizadas com zebra stripes
  - Rodapé com paginação
  - Funções auxiliares para formatação

---

**FASE 4 - Histórico de Alterações (Audit Log):**

**Funcionalidade Implementada:**
- ✅ **Página Histórico de Alterações** (`/audit-log`): Auditoria completa de ações
  - Cards de resumo: Total (30 dias), Logins, Usuários Ativos, Fechamentos
  - Filtros: Tipo de ação, Data inicial/final, Status (sucesso/falha)
  - Tabela de logs: Data/Hora, Ação, Usuário, Empresa, Status, Detalhes
  - Paginação com navegação (50 registros por página)
  - Acesso restrito a admin/super_admin

- ✅ **Backend Audit Log:** 
  - Função `log_audit()` para registrar qualquer ação
  - Constantes `AuditAction` para padronizar tipos de ações
  - `GET /api/audit-logs` - Listar logs com filtros
  - `GET /api/audit-logs/actions` - Tipos de ações disponíveis
  - `GET /api/audit-logs/summary` - Resumo por período

- ✅ **Collection MongoDB:** `audit_logs` para armazenar registros

- ✅ **Integração nos endpoints críticos:**
  - Login (sucesso e falha)
  - Criação de usuários
  - Fechamento de competência
  - Reabertura de competência

- ✅ **Menu Lateral:** Link "Histórico de Alterações" (apenas admin)

**Arquivos criados/modificados:**
- `/app/frontend/src/pages/AuditLog.js` - Nova página completa
- `/app/backend/server.py` - Função `log_audit`, `AuditAction`, 3 endpoints
- `/app/frontend/src/App.js` - Rota `/audit-log`
- `/app/frontend/src/components/Layout.js` - Link condicional no menu

---

**FASE 6 - Apuração Automática Mensal (Fechamento Mensal):**

**Funcionalidade Implementada:**
- ✅ **Página Fechamento Mensal** (`/fechamento-mensal`): Dashboard consolidado de impostos
  - Cards de resumo: Total Documentos, Entradas, Saídas, Total Impostos
  - Cards individuais por imposto: ICMS, PIS, COFINS, ISS, IPI
  - Cálculo automático de débito, crédito e saldo por imposto
  - Total consolidado de impostos a pagar
  - Campo de observações para o fechamento
  - Histórico de fechamentos anteriores

- ✅ **Backend Fechamento:** 4 novos endpoints:
  - `GET /api/fechamento-mensal/{company_id}` - Apuração consolidada
  - `POST /api/fechamento-mensal/{company_id}` - Fechar competência
  - `DELETE /api/fechamento-mensal/{company_id}/{competencia}` - Reabrir competência (admin)
  - `GET /api/fechamento-mensal/{company_id}/historico` - Histórico de fechamentos

- ✅ **Collection MongoDB:** `fechamentos_mensais` para armazenar fechamentos

- ✅ **Menu Lateral:** Link "Fechamento Mensal" com ícone de cadeado

**Arquivos criados/modificados:**
- `/app/frontend/src/pages/FechamentoMensal.js` - Nova página completa
- `/app/backend/server.py` - 4 novos endpoints + model `FechamentoMensalRequest`
- `/app/frontend/src/App.js` - Rota `/fechamento-mensal`
- `/app/frontend/src/components/Layout.js` - Link no menu

---

**FASE 5 - Geração de SPED Fiscal:**

**Funcionalidade Implementada:**
- ✅ **Página SPED Fiscal** (`/sped`): Interface completa para exportação do arquivo SPED
  - Seletor de empresa e competência
  - Exibição de competências disponíveis (2 períodos)
  - Informações da empresa (Razão Social, CNPJ, IE)
  - Descrição dos blocos gerados (0, C, E, H, 9)
  - Botão de exportação com download do arquivo .txt

- ✅ **Backend SPED:** Endpoint `GET /api/sped/export/{company_id}` funcional
  - Layout versão 019 (válido para 2025/2026)
  - Registros 0000, 0001, 0005, 0100, 0150 (participantes)
  - Bloco C com documentos fiscais
  - Bloco E com apuração ICMS

- ✅ **Menu Lateral:** Link "SPED Fiscal" adicionado na seção de Exportações

- ✅ **Correção de Bug:** Ajustado parser de resposta da API para carregar competências corretamente

**Arquivos modificados:**
- `/app/frontend/src/pages/ExportSPED.js` - Correção do parser de competências
- `/app/frontend/src/App.js` - Importação e rota `/sped`
- `/app/frontend/src/components/Layout.js` - Link no menu lateral

---

**FASE 2 - Documentação e Preparação para Refatoração:**

**Análise do Backend:**
- ✅ **Análise completa do server.py:** Identificados 26.374 linhas com 150+ endpoints
- ✅ **Documentação da API:** Criado `/app/backend/API_DOCUMENTATION.md` com índice completo de todos os endpoints organizados por módulo
- ✅ **Mapeamento de Serviços:** Identificada estrutura existente em `/app/backend/services/`:
  - `auth.py` - Autenticação JWT
  - `database.py` - Conexão MongoDB
  - `difal_calculator.py` - Cálculos DIFAL
  - `pis_cofins_calculator.py` - Cálculos PIS/COFINS
  - `simples_nacional_calculator.py` - Cálculos Simples Nacional
  - `tax_utils.py` - Utilitários fiscais
  - `document_ai.py` - IA para documentos
  - `pgdas_extractor.py` - Extração PGDAS

**Estrutura de Routers:**
- ✅ **Routers existentes identificados** em `/app/backend/routers/`:
  - `auth.py` - Autenticação (parcial)
  - `companies.py` - Empresas (parcial)
  - `cnpj.py` - Consulta CNPJ
  - `dashboard.py` - Dashboard (placeholder criado)

**Plano de Migração Documentado:**
- Prioridade 1: Dashboard, Auth, Companies
- Prioridade 2: Upload XMLs, Apurações, Relatórios
- Prioridade 3: SPED, Simples Nacional, Análises

**Conclusão FASE 2:**
- A refatoração completa do server.py é um trabalho de longo prazo (estimativa: 40+ horas)
- A documentação criada facilita navegação e manutenção
- Recomendação: Migração incremental por módulo, um de cada vez, com testes extensivos

---

**FASE 1 - Sistema de Permissões e Controle de Acesso (P0 - SEGURANÇA):**

**Correção Crítica de Segurança:**
- ✅ **Reativação do `check_company_access`:** Função restaurada com lógica completa de verificação
  - Super Admin e Admin têm acesso total a todas as empresas
  - Master tem acesso via permissão `ALL_COMPANIES`
  - Operacional e Client só acessam empresas em seu `company_ids`
  - Verificação adicional por `responsavel_id` e `created_by`

- ✅ **Função auxiliar `require_company_access`:** Nova função para verificar permissão + acesso em uma única chamada

- ✅ **Correção no endpoint `/companies`:** Query atualizada para verificar por ID além de CNPJ

**Testado e Validado:**
- Usuário operacional vê apenas empresas atribuídas
- Acesso a empresas não autorizadas retorna HTTP 403 "Acesso negado"
- Super Admin/Admin mantêm acesso total

---

**FASE 3 - Wizard de Configuração e Dashboard de Inconsistências:**

**Novas Funcionalidades:**
- ✅ **Central de Alertas (Dashboard de Inconsistências):**
  - Nova página `/alertas` com análise de inconsistências fiscais
  - Cards de resumo: Total de Alertas, Críticos, Avisos, Informações
  - Filtros clicáveis por severidade
  - Categorias de alertas: Classificação de Produtos, CFOPs Divergentes, Cálculos Fiscais, Prazos e Obrigações
  - Ações rápidas: Classificar Produtos, Revisar Documentos, Apuração ICMS, PIS/COFINS
  - Status "Tudo em ordem!" quando não há inconsistências
  - Link no menu lateral com ícone de sino

- ✅ **Wizard de Configuração de Empresa:**
  - Nova página `/wizard-empresa` e `/wizard-empresa/:companyId`
  - 6 etapas de configuração: Dados Básicos → Atividade → Tributação → Classificação → Benefícios → Finalizar
  - Indicadores visuais de progresso com checkmarks
  - Formulário completo com validação
  - Palavras-chave para classificação automática
  - Configuração de benefícios fiscais

**Backend:**
- ✅ **Endpoint de Inconsistências:** `GET /api/inconsistencias/{company_id}?competencia=MM/YYYY`
  - Detecta produtos sem classificação
  - Identifica CFOPs divergentes da categoria
  - Verifica notas de saída com ICMS zerado
  - Monitora prazos de entrega do SPED

**Arquivos criados/modificados:**
- `/app/backend/server.py` - `check_company_access`, `require_company_access`, endpoint companies
- `/app/frontend/src/pages/WizardEmpresa.js` - Componente wizard completo
- `/app/frontend/src/pages/WizardEmpresaPage.js` - Página wrapper com Layout
- `/app/frontend/src/pages/DashboardInconsistencias.js` - Dashboard de alertas
- `/app/frontend/src/pages/AlertasPage.js` - Página wrapper com Layout
- `/app/frontend/src/App.js` - Novas rotas adicionadas
- `/app/frontend/src/components/Layout.js` - Link "Central de Alertas" no menu

### 2026-02-11 (Sessão 21 - Correções e Melhorias Diversas)

**Novas Funcionalidades:**
- ✅ **Exportação de documentos por categoria:** Novo endpoint `/api/xml/exportar-categoria/{company_id}` permite exportar todos os documentos de uma categoria específica (NF-e, NFC-e, CT-e, NFS-e) para Excel ou PDF
- ✅ **Botões de exportação no menu Documentos:** Adicionados botões "Excel" e "PDF" na tela de listagem de documentos por tipo
- ✅ **Competência baseada em data de saída para entradas:** Para notas de ENTRADA, a competência é determinada pela data de saída (dhSaiEnt) quando disponível, com fallback para data de emissão

**Correções de Bugs:**
- ✅ **Botão "olho" não abria modal:** Corrigido problema de controle de acesso - roles `super_admin`, `admin` e `master` agora têm acesso total aos documentos
- ✅ **Atualização de regras na Memória IA:** Ao alterar a categoria de uma regra, o CFOP é agora calculado automaticamente baseado na categoria (revenda → 1102/2102, insumo → 1101/2101, despesa → 1556/2556, etc.)
- ✅ **Consistência de valores Dashboard vs ICMS:** Frontend da Apuração ICMS agora usa `valores_por_documento.total_entradas` para garantir consistência com o Dashboard
- ✅ **Erro de validação `codigo_empresa`:** Campo alterado para `Optional[str]` para evitar erros quando é `None` no banco de dados

**Melhorias de Segurança:**
- ✅ **Unificação de verificação de roles:** Criados métodos `UserRole.is_admin()` e `UserRole.has_full_access()` para padronizar verificações de permissão em toda a aplicação
- ✅ **Suporte a `super_admin`:** Role `super_admin` agora é tratado corretamente em todos os endpoints de documentos

**Arquivos modificados:**
- `/app/backend/server.py`: Novo endpoint de exportação, correções de controle de acesso, melhoria na atualização de regras, lógica de competência por data de saída
- `/app/frontend/src/pages/Documents.js`: Botões de exportação e import de toast
- `/app/frontend/src/pages/ApuracaoICMS.js`: Uso de `valores_por_documento` para totais
- `/app/frontend/src/pages/ClassificacaoInteligente.js`: Toast mostra novo CFOP calculado

### 2026-02-11 (Sessão 20 - Correção Duplicidade por Série)

**Correção na detecção de documentos duplicados:**
- ✅ **Cache duplo de duplicados:** 
  - Cache primário: `chave_nfe` (44 dígitos - já inclui série)
  - Cache secundário: `numero|serie|cnpj_emitente` (para documentos sem chave de acesso)
- ✅ **Verificação em duas etapas:**
  1. Primeiro verifica pela chave de acesso completa
  2. Se não tiver chave, verifica por número + série + CNPJ emitente
- ✅ **Motivo detalhado:** Duplicados agora mostram o motivo específico
- ✅ **Série salva no histórico:** Campo `serie` incluído no registro de duplicados

**Impacto:** Documentos com mesmo número mas séries diferentes (ex: Nº 123 Série 1 vs Nº 123 Série 2) não serão mais marcados erroneamente como duplicados.

**Arquivo modificado:**
- `/app/backend/server.py`: Lógica de upload de XMLs melhorada

### 2026-02-11 (Sessão 20 - Melhorias Histórico, Documentos e Vilões)

**Histórico de Importações (Documents.js):**
- ✅ Reestruturado igual à tela pós-upload
- ✅ Tags de tipo: SAÍDA (azul), ENTRADA (verde)
- ✅ Tag de modelo: NF-e, NFC-e, CT-e, NFS-e
- ✅ Data e hora da importação
- ✅ Cards de resumo: Total e Importados (com cores)
- ✅ Valor Total destacado em card dourado
- ✅ Preview de documentos importados: Modelo, Número, Emitente, Valor
- ✅ Backend atualizado para buscar dados reais dos documentos (xml_documents)

**Menu Documentos (Documents.js):**
- ✅ Cards ENTRADAS e SAÍDAS alinhados lado a lado
- ✅ Botões de ação (Apagar Todas Entradas/Saídas, Verificar Notas Ausentes) em linha separada

**Vilões e Oportunidades (ViloesOportunidades.js):**
- ✅ Linha do NCM/Categoria com grid detalhado:
  - Total Entradas e Total Saídas
  - ICMS: Créditos | Débitos | Diferença | % s/ venda
  - PIS: Créditos | Débitos | Diferença | % s/ venda
  - COFINS: Créditos | Débitos | Diferença | % s/ venda
  - Impacto Total | % s/ venda
  - Margem | Quantidade de produtos

**Arquivos modificados:**
- `/app/backend/server.py`: Endpoint `get_historico_importacoes` melhorado para buscar dados reais
- `/app/frontend/src/pages/Documents.js`: Histórico reestruturado e cards alinhados
- `/app/frontend/src/pages/ViloesOportunidades.js`: Grid detalhado na linha do NCM

### 2026-02-11 (Sessão 20 - Correções na Memória IA / Classificação Inteligente)

**Bugs corrigidos:**
- ✅ **"Produto sem descrição":** Corrigido mapeamento de campos - frontend agora usa `produto_descricao` (campo correto do backend) em vez de `descricao_produto`
- ✅ **Regras não aplicadas após alteração:** Corrigido endpoint de update para salvar tanto `categoria` quanto `categoria_correta` (e `cfop`/`cfop_correto`) para compatibilidade com o sistema de cache
- ✅ **Função de cache mais robusta:** `get_cached_classification_from_memory` agora aceita ambos os formatos de campos

**Novas funcionalidades:**
- ✅ **Seleção em lote:** Checkbox individual em cada regra + "Selecionar todas" no topo
- ✅ **Alteração de categoria em lote:** Dropdown para alterar categoria de múltiplas regras de uma vez
- ✅ **Exclusão em lote:** Botão vermelho "Excluir (N)" para remover múltiplas regras selecionadas
- ✅ **Destaque visual:** Regras selecionadas têm borda roxa e fundo suave

**Arquivos modificados:**
- `/app/backend/server.py`: Corrigido endpoint PUT `/ai/learned-rules/{rule_id}` e função `get_cached_classification_from_memory`
- `/app/frontend/src/pages/ClassificacaoInteligente.js`: Adicionada lógica de seleção em lote e correção de campos

### 2026-02-11 (Sessão 20 - Melhorias em Vilões e Oportunidades)

**Melhorias na página Vilões e Oportunidades:**
- ✅ **Descrição detalhada do motivo de classificação:** Cada item agora mostra "Por que este NCM é vilão/oportunidade?" com explicação clara dos valores de débito/crédito e análise de precificação
- ✅ **Análise Inteligente:** Nova seção expansível com:
  - Conclusão geral do balanço tributário
  - Saldo Tributário calculado automaticamente
  - Pontos de Atenção (NCMs críticos, margens baixas, desequilíbrio entrada/saída)
  - Recomendações práticas (benefícios fiscais, precificação, PIS/COFINS monofásico)
- ✅ **Ordenação por colunas:** Cabeçalhos clicáveis para ordenar por NCM, Descrição, Impacto, Entrada, Saída e Margem (crescente/decrescente)
- ✅ **Ordenação de produtos:** Tabela de produtos dentro do detalhe também tem ordenação por colunas
- ✅ **Margem percentual:** Nova coluna mostrando a margem de cada NCM com cores indicativas (vermelho < 15%, amarelo < 30%, verde >= 30%)
- ✅ **Análise de precificação:** Cada vilão/oportunidade mostra uma análise automática sobre margem e risco de prejuízo
- ✅ **Compatibilidade de dados:** Ajustada query para suportar tanto 'tipo' quanto 'tipo_operacao' nos documentos

**Arquivos modificados:**
- `/app/backend/server.py`: Adicionado motivo_classificacao, analise_preco, margem_percentual, análise geral com pontos de atenção e recomendações
- `/app/frontend/src/pages/ViloesOportunidades.js`: Reescrito com ordenação, análise inteligente expansível e detalhamento aprimorado

### 2026-02-11 (Sessão 20 - Detalhamento do Benefício Fiscal ICMS)

**Modal de Detalhamento do Benefício Fiscal:**
- ✅ **Novo endpoint `/api/beneficio-fiscal-detalhes/{company_id}`:** Retorna detalhamento dos créditos desconsiderados por produto e NCM
- ✅ **Novo endpoint `/api/beneficio-fiscal-detalhes/{company_id}/exportar`:** Exporta detalhamento para Excel ou PDF
- ✅ **Modal interativo em ApuracaoICMS.js:**
  - Abas "Por Produto" e "Por NCM" com tabelas detalhadas
  - Cards de resumo: Total de Produtos, Valor Total, ICMS Desconsiderado
  - Botões de exportação: Excel (verde) e PDF (vermelho)
  - Exibição da regra aplicada (ex: "carne, bebida")
- ✅ **Card clicável na página de Apuração ICMS:** Mostra valor total de crédito desconsiderado e "Clique para ver detalhes"
- ✅ **Correção de compatibilidade:** Suporte para campos `itens`/`produtos` e `valor_icms`/`v_icms` nos documentos

**Arquivos modificados:**
- `/app/backend/server.py`: Novos endpoints de detalhamento e exportação
- `/app/frontend/src/pages/ApuracaoICMS.js`: Modal de detalhamento já existia, funcionando com os novos endpoints

### 2026-02-11 (Sessão 19 - Padronização UI PIS/COFINS, Relatórios e Usuários)

**Padronização das Abas NCM e Produto em PIS/COFINS:**
- ✅ **Problema identificado:** Abas NCM e Produto mostravam colunas diferentes da aba "Notas Fiscais"
- ✅ **Solução implementada:**
  - Backend retorna dados detalhados (cst_xml, cst_calc, aliq_pis_xml, aliq_pis_calc, etc.) para todos os agrupamentos
  - Frontend renderiza mesmas colunas: NF, Tipo, Emitente/Dest., Produto, NCM, CFOP, CST XML, CST Calc., Alíq. PIS, Alíq. COFINS, Impacto
- ✅ **Arquivos modificados:** `/app/backend/server.py`, `/app/frontend/src/pages/PisCofins.js`

**Menu Empresas Removido do Sidebar:**
- ✅ Menu "Empresas" removido do menu lateral (disponível apenas no header)
- ✅ **Arquivo modificado:** `/app/frontend/src/components/Layout.js`

**Página de Relatórios Aprimorada:**
- ✅ **Seções organizadas por categoria:** Resumo, Apurações, Documentos, Análises
- ✅ **Novas seções adicionadas:** ICMS ST, IPI, ISS, DIFAL, Impostos Retidos, Indicadores, Evolução, Vilões
- ✅ **Exportação PDF:** Botão PDF adicionado junto com Excel e Word
- ✅ **Arquivo modificado:** `/app/frontend/src/pages/Reports.js`

**Gestão de Permissões de Usuários:**
- ✅ **Seção "Atividades Autorizadas":** Lista de checkboxes para cada funcionalidade
- ✅ **Botões "Todos" e "Nenhum":** Seleção rápida de todas ou nenhuma atividade
- ✅ **Endpoint de atividades:** Backend atualizado para persistir atividades no usuário
- ✅ **Arquivo modificado:** `/app/frontend/src/pages/UsersPage.js`, `/app/backend/server.py`

**Limpeza de Usuários Inativos/Teste:**
- ✅ **Botão "Limpar Inativos":** Exclui usuários inativos e de teste em lote
- ✅ **Endpoint `/api/auth/users/cleanup-inactive`:** Remove usuários não-admin inativos ou com email contendo "test"
- ✅ **Endpoint `/api/auth/users/{user_id}/permanent`:** Exclusão permanente individual
- ✅ **Arquivos modificados:** `/app/backend/server.py`, `/app/frontend/src/pages/UsersPage.js`

**IA de Classificação Inteligente com Aprendizado de Vendas:**
- ✅ **Análise de NCMs vendidos:** Sistema coleta NCMs dos produtos de saída (primeiros 4-6 dígitos)
- ✅ **Match por NCM:** Se produto de entrada tem NCM similar aos vendidos, classifica automaticamente como REVENDA
- ✅ **Análise de palavras-chave:** Coleta palavras significativas dos produtos vendidos para inferência
- ✅ **Match por palavras:** Se 2+ palavras do produto de entrada aparecem em vendidos, classifica como REVENDA
- ✅ **Cache automático:** Classificações inferidas são salvas no cache para acelerar futuras classificações
- ✅ **Nova estatística:** `from_sales_inference` conta quantos produtos foram classificados por aprendizado
- ✅ **Arquivo modificado:** `/app/backend/server.py` (função `classify_products_with_cache`)

**Arquivo Removido:**
- ✅ `/app/frontend/src/pages/UploadXML.js` - Arquivo obsoleto já havia sido removido anteriormente

**Correção do Modal de Relatório de Upload que "Aparece e Some":**
- ✅ **Problema identificado:** Race condition entre SSE e polling causava múltiplas atualizações do estado
- ✅ **Solução implementada:**
  - Adicionado `resultDisplayedRef` (useRef) para evitar múltiplas atualizações
  - Flag verificada antes de chamar `setUploadResult` e `setShowUploadResult`
  - Flag resetada no início de cada novo upload
- ✅ **Arquivo modificado:** `/app/frontend/src/pages/Documents.js`

**Correção da Barra de Progresso Congelada no Upload:**
- ✅ **Problema identificado:** O progresso não era atualizado no MongoDB durante o processamento dos arquivos
- ✅ **Solução implementada:**
  - Backend agora salva o progresso no MongoDB a cada 5 arquivos processados
  - Adicionado `upload_progress_store[upload_id] = progress` para atualização imediata em memória
  - Logs de debug adicionados para monitoramento
- ✅ **Arquivo modificado:** `/app/backend/server.py`

**Correção da Classificação de Produtos com CFOP de Devolução:**
- ✅ **Problema identificado:** Documentos importados antes da correção não tinham `categoria_classificada` definida
- ✅ **Solução implementada:** Script de correção em massa no banco de dados
  - Corrigidos 6 documentos com CFOPs de devolução (1201, 1202, 2201, 2202, etc.)
  - Todos os 38 produtos com CFOP de devolução agora têm `categoria_classificada: 'devolucao'`
- ✅ **Verificação:** Empresa COMERCIAL RS LTDA, competência 01/2026, mostra 33 produtos na categoria "Devolução"

**Adição de Cor Orange no Frontend:**
- ✅ **Problema identificado:** Categoria "devolucao" usava `color: 'orange'`, mas não havia mapeamento
- ✅ **Solução implementada:** Adicionado `orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400'`
- ✅ **Arquivo modificado:** `/app/frontend/src/pages/ClassificacaoInteligente.js`

### 2026-02-11 (Sessão 17 - Agrupamento Devolução e Notas Canceladas)

**Categoria "Devolução" na Classificação:**
- ✅ CFOPs de devolução de ENTRADA expandidos: 1201-1210, 2201-2210, 1411, 2411, etc.
- ✅ CFOPs de devolução de SAÍDA adicionados: 5201-5210, 6201-6210, 5411, 6411, 3201, 7201, etc.
- ✅ Função `obter_categoria_por_cfop` retorna 'devolucao' para todos os CFOPs de devolução
- ✅ **PRÉ-PROCESSAMENTO DE DEVOLUÇÕES**: Produtos com CFOP de devolução são classificados ANTES da IA
- ✅ Isso evita que produtos com CFOP 1202, 2202, etc. fiquem como "pendente"

**Importação de Notas Canceladas:**
- ✅ Parser de NF-e detecta cStat 101/151 (nota cancelada)
- ✅ Parser de NFC-e atualizado com mesma lógica de cancelamento
- ✅ Valores da nota e produtos zerados automaticamente quando cancelada
- ✅ Campo `status: 'cancelada'` adicionado ao documento

**Timeout de Upload:**
- ✅ Aumentado para 5 minutos (300 segundos) para suportar volumes grandes (4000+ arquivos)

### 2026-02-11 (Sessão 17 - Correção SPED e Notas Ausentes)

**CORREÇÃO CRÍTICA: Exportação SPED Fiscal:**
- ✅ **Problema identificado:** Erro 520 (Internal Server Error) ao exportar SPED
- ✅ **Causa raiz:** Inconsistências no banco de dados MongoDB onde alguns documentos XML usavam campos diferentes:
  - `tipo_operacao` em vez de `tipo`
  - `chave_acesso` em vez de `chave_nfe`
  - `modelo: "55"` em vez de `modelo: "nfe"`
- ✅ **Solução implementada:** Adicionado `model_validator` no modelo Pydantic `XMLDocument` para normalizar campos automaticamente
- ✅ **Frontend corrigido:** `ExportMenu.js` ajustado para aceitar resposta da API em ambos os formatos (array ou objeto com chave `documents`)
- ✅ **Arquivos modificados:** `/app/backend/server.py`, `/app/frontend/src/pages/ExportMenu.js`

**NOVA FUNCIONALIDADE: Alerta de Notas Fiscais Ausentes:**
- ✅ **Detecção de gaps na sequência numérica** de notas fiscais de saída
- ✅ **Integrado na página de Documentos:** Botão "Verificar Notas Ausentes" abaixo do card de Saídas
- ✅ **Análise por modelo de documento:** Automático com base no tipo de atividade da empresa
  - NF-e (Modelo 55) - Todos os tipos
  - NFC-e (Modelo 65) - Comércio e varejo
  - CT-e (Modelo 57) - Transportadoras
  - NFS-e - Serviços
- ✅ **Modal com resumo visual:**
  - Total de notas emitidas
  - Total de notas ausentes (vermelho se > 0, verde se = 0)
  - Tipo de atividade da empresa
  - Status: "OK" ou "Gaps Detectados"
- ✅ **Detalhamento por série:** Primeiro nº, último nº, emitidas vs esperadas
- ✅ **Lista de números faltantes** com indicação visual
- ✅ **Exportação Excel:** Arquivo .xlsx com múltiplas abas (uma por modelo)
- ✅ **Exportação PDF:** Relatório formatado com tabelas estilizadas
- ✅ **Removido do menu lateral** conforme solicitação do usuário
- ✅ **Arquivos modificados:**
  - `/app/backend/server.py` - Endpoints atualizados para análise multi-modelo
  - `/app/frontend/src/pages/Documents.js` - Botão e modal integrados
  - `/app/frontend/src/components/Layout.js` - Removido link do menu
  - `/app/frontend/src/pages/NotasAusentes.js` - Mantido como página standalone (rota ainda ativa)

### 2026-02-11 (Sessão 16 - Correção CST Bebidas Alcoólicas e Timeout Upload)

**CORREÇÃO CRÍTICA: CST de PIS/COFINS para Bebidas Alcoólicas:**
- ✅ **Problema identificado:** NCMs de bebidas alcoólicas (2204-2208) estavam sendo classificados como monofásicos (CST 04)
- ✅ **Causa raiz:** Lista `NCMS_MONOFASICOS` no `pis_cofins_calculator.py` continha NCMs 22071000, 22072010, 22089000 incorretamente
- ✅ **Solução implementada:**
  - Removidos NCMs de bebidas alcoólicas da lista de monofásicos
  - Criada lista `NCMS_BEBIDAS_ALCOOLICAS` com todos os NCMs 2204-2208
  - Função `is_ncm_bebida_alcoolica()` criada para identificar bebidas alcoólicas
  - Função `classificar_ncm_comercio()` modificada para verificar bebidas alcoólicas ANTES de monofásicos
- ✅ **Resultado:**
  - NCMs 2204 (Vinhos): CST 01 (saída) / 50 (entrada)
  - NCMs 2205 (Vermutes): CST 01 (saída) / 50 (entrada)
  - NCMs 2206 (Sidra, Saquê, Fermentados): CST 01 (saída) / 50 (entrada)
  - NCMs 2207 (Álcool Etílico): CST 01 (saída) / 50 (entrada)
  - NCMs 2208 (Destilados - Whisky, Vodka, Gin, Rum, etc.): CST 01 (saída) / 50 (entrada)
  - NCMs 2201-2203 (Água, Refrigerantes, Cerveja): Continuam CST 04 (monofásico)

**Barra de Progresso Global com Timeout:**
- ✅ **Timeout de 60 segundos:** Se não houver progresso por 60s, o upload é marcado como erro
- ✅ **Botão X funcional:** Permite fechar a barra de progresso a qualquer momento
- ✅ **Erro visível globalmente:** `setUploadError()` atualiza estado global para mostrar erro em todas as telas
- ✅ **Limpeza automática:** Timeouts e intervalos são limpos corretamente ao finalizar ou em caso de erro

### 2026-02-10 (Sessão 15 - Finalização CT-e, Permissões e Barra de Progresso)

**Implementação Completa de CT-e (Conhecimento de Transporte Eletrônico):**
- ✅ **Parser XML de CT-e** - Função `parse_xml_cte` criada para extrair dados do modelo 57
- ✅ **Validação de CNPJ específica para CT-e:**
  - Entrada: Empresa deve ser remetente ou destinatário (quem paga o frete)
  - Saída: Empresa deve ser a transportadora (emitente)
- ✅ **Integração no fluxo de upload** - `upload_xml_with_progress` agora processa CT-e corretamente
- ✅ **Tela de CT-e na interface** - Disponível em Entradas > CT-e

**Sistema de Permissões Finalizado:**
- ✅ **Menu de Usuários restrito** - Apenas Master/Admin/Super Admin podem ver
- ✅ **Proteção em Layout.js** - Ícone de usuários oculto no menu desktop e mobile
- ✅ **Proteção em UsersPage.js** - Acesso direto à URL `/usuarios` é bloqueado
- ✅ **Mensagem de acesso negado** - Exibida para usuários operacionais

**Correção da Barra de Progresso de Upload:**
- ✅ **Layout melhorado** - Barra centralizada com contador de café
- ✅ **Design moderno** - Card fixo no canto inferior direito
- ✅ **Informações claras** - Porcentagem, nome da empresa, arquivos processados

**Correção de Bug - Criação de Usuário:**
- ✅ **Campo de senha corrigido** - `password_hash` → `hashed_password` para consistência

**Nova Funcionalidade: Vilões e Oportunidades (UI Completa):**
- ✅ **Página `/viloes-oportunidades`** - Nova página criada
- ✅ **Cards de resumo** - Total de vilões/oportunidades e valores de impacto/benefício
- ✅ **Duas abas de agrupamento** - "Por NCM" e "Por Categoria"
- ✅ **Filtros dinâmicos** - Botões para alternar entre "Vilões" e "Oportunidades"
- ✅ **Exibição compacta em linha única** - Mostra ICMS, PIS, COFINS e impacto total
- ✅ **Expansão com detalhes** - Ao clicar, exibe entradas, saídas, diferenças e lista de produtos
- ✅ **Campo de busca** - Filtrar por NCM ou categoria
- ✅ **Menu lateral atualizado** - Link "Vilões e Oportunidades" adicionado

**Correções na Classificação Inteligente:**
- ✅ **Eliminação de Pendentes** - Lista de categorias válidas expandida
- ✅ **Botão "Resolver todos"** - Classifica todos os pendentes como revenda
- ✅ **Fix: button dentro de button** - Corrigido erro de aninhamento HTML
- ✅ **Novas categorias adicionadas** - `outras_entradas`, `servico_aplicacao`, `aplicacao_servico`
- ✅ **Select de categoria manual expandido** - Mais opções no dropdown de CFOP

**Correção no Upload de XML (Network Error):**
- ✅ **Batch size aumentado** - De 50 para 100 arquivos por lote
- ✅ **Timeout aumentado** - 2 minutos por lote
- ✅ **Retry automático** - 3 tentativas para buscar resultado final
- ✅ **Tolerância a erros de lote** - Continua processando mesmo com falhas individuais

**Remoção de Abas Duplicadas:**
- ✅ **Indicadores** - Removidas abas "Vilões" e "Oportunidades" 
- ✅ **Menu separado** - "Vilões e Oportunidades" agora é item próprio no menu lateral

**Categoria Devolução Adicionada:**
- ✅ **CFOPs de devolução mapeados** - 1201-1210, 1411, 2201-2210, 2411, etc.
- ✅ **Categoria no frontend** - "Devolução" com ícone ↩️ e cor laranja

**Barra de Progresso Global:**
- ✅ **Movida para Layout.js** - Visível em todas as telas durante upload
- ✅ **Estado no AppContext** - `uploadProgress`, `startUpload`, `updateUploadProgress`, `finishUpload`
- ✅ **Documents.js atualizado** - Usa funções globais de progresso

### 2026-02-10 (Sessão 14 - Melhorias Extensivas na Classificação e Cadastro)

**Correção do Relatório de Upload:**
- ✅ **Problema:** Relatório pós-importação não aparecia
- ✅ **Solução:** Adicionado fallback manual que busca o status após 2 segundos se SSE/polling não retornar
- ✅ **Garantia:** Resultado sempre exibido mesmo com problemas de conexão

**Redesign da Classificação Inteligente:**
- ✅ **Tabela estruturada com ordenação** por colunas (Descrição, NCM, CFOP, Qtd, Valor)
- ✅ **Filtros clicáveis** (↑↓) em cada coluna para ordenação crescente/decrescente
- ✅ **Checkbox de seleção** em cada produto e cabeçalho (selecionar todos)
- ✅ **Barra de ações em lote** aparece quando produtos são selecionados
- ✅ **Reclassificação em lote** para múltiplos produtos de uma vez
- ✅ **Coluna de NFs** mostrando onde cada produto aparece
- ✅ **Botão de ação individual** (ícone de lápis) para reclassificar produto específico

**Gerador de Palavras-Chave com IA (Cadastro de Empresas):**
- ✅ **Campo de descrição livre** para descrever o negócio em linguagem natural
- ✅ **IA analisa e sugere** palavras-chave automaticamente
- ✅ **Categorias geradas:** produtos comercializados, insumos, despesas, aplicação em serviços
- ✅ **Revisão e edição** antes de aplicar as sugestões
- ✅ **Novo endpoint:** `POST /api/companies/gerar-keywords-ia`

### 2026-02-10 (Sessão 13 - Melhorias Classificação Inteligente)

**Barra de Progresso da IA na Classificação:**
- ✅ **Adicionada barra de progresso animada** quando a IA está processando comandos
- ✅ **Feedback visual** com ícone de loading e mensagem explicativa

**Correção CFOP de ST (Substituição Tributária):**
- ✅ **Problema:** Produtos ST estavam recebendo CFOP de tributados (ex: 1102 ao invés de 1403)
- ✅ **Solução:** Lógica agora detecta ST tanto pelo CST quanto pelo CFOP original do XML
- ✅ **CFOPs ST detectados:** 5403, 5405, 6403, 6404, 1403, 2403, etc.
- ✅ **Aplicado em:** cache, regras e classificação por IA

**Correção da Classificação ao Resolver Grupos de CFOP:**
- ✅ **Problema:** Ao resolver grupo de CFOP, produtos ficavam "pendentes" em vez de classificados
- ✅ **Causa:** Campo `categoria_classificada` não era atualizado, apenas `categoria`
- ✅ **Solução:** Ambos os campos agora são atualizados em `resolver-grupo` e `resolver-individual`

### 2026-02-10 (Sessão 12 - Barra de Progresso e Permissões)

**Correção da Barra de Progresso de Upload:**
- ✅ **Problema:** Barra de progresso congelava durante importação de XMLs
- ✅ **Causa raiz:** SSE (Server-Sent Events) sendo bloqueado pelo proxy/ingress do Kubernetes
- ✅ **Solução:** Sistema híbrido SSE + Polling como fallback
  - SSE tenta conectar primeiro (mais eficiente)
  - Se não receber eventos em 3 segundos, ativa polling via `/api/xml/upload-status/{upload_id}`
  - Polling verifica status a cada 500ms
- ✅ **Novo endpoint:** `GET /api/xml/upload-status/{upload_id}` - Retorna status atual do upload

**Melhoria de UX - Seletor de Competência:**
- ✅ **Enter rápido:** Digitar apenas o mês (ex: "01") e pressionar Enter completa automaticamente com o ano atual
- ✅ **Confirma e fecha:** O modal fecha automaticamente ao pressionar Enter

**Permissões de Usuários (Master/Operacional):**
- ✅ **Funções auxiliares criadas:**
  - `check_company_access(company, user)` - Verifica se usuário tem acesso à empresa
  - `verify_company_access(company_id, user)` - Busca empresa e verifica acesso
- ✅ **Regra:** Operacional pode acessar empresas onde é responsável, criou, ou tem no company_ids

### 2026-02-10 (Sessão 11 - Correção Bug de Upload "Sessão não encontrada")

**Bug Fix Crítico - Importação de NF-e (P0 - RESOLVIDO):**
- ✅ **Problema:** Erro "Sessão de upload não encontrada" ao importar NF-e de entrada (138 arquivos rejeitados)
- ✅ **Causa raiz:** Sessões de upload armazenadas apenas em memória (dict Python) eram perdidas no hot reload
- ✅ **Solução:** Sessões agora persistidas no MongoDB (collection `upload_sessions`) com fallback automático
- ✅ **Novas funções:**
  - `get_upload_session(upload_id)` - Busca primeiro em memória, depois no MongoDB
  - `save_upload_session(upload_id, session_data)` - Salva em memória e MongoDB
  - `delete_upload_session(upload_id)` - Remove de ambos
- ✅ **Retry logic no SSE** - `stream_upload_progress` aguarda até 3s para sessão aparecer (race condition)
- ✅ **Testes:** 8/8 testes passaram (100% sucesso)

### 2026-02-10 (Sessão 10 - Melhorias IA, Vilões/Oportunidades, Permissões e Alertas NCM)

**Melhorias na IA de Classificação:**
- ✅ **Análise de produtos vendidos** - A IA busca até 50 produtos das notas de saída para inferir padrões de comercialização
- ✅ **Palavras-chave semânticas** - "construção" → classifica cimento, argamassa, tijolo como revenda
- ✅ **Prompt enriquecido** - Inclui contexto de produtos vendidos + keywords cadastradas

**Análise de Vilões/Oportunidades com PIS/COFINS:**
- ✅ **Novos tipos de vilões:**
  - `PIS_COFINS_SEM_CREDITO` - Débito PIS/COFINS alto sem crédito na entrada
  - `PIS_COFINS_DIFERENCA_ALTA` - Grande diferença entre débito e crédito
  - `CARGA_TRIBUTARIA_TOTAL_ALTA` - Carga total (ICMS + PIS/COFINS) > 15%
- ✅ **Novas oportunidades:**
  - `PIS_COFINS_CREDITO_MAIOR` - Crédito maior que débito
  - `CARGA_TRIBUTARIA_BAIXA` - Carga total < 5%

**Sistema de Permissões (Master vs. Operacional):**
- ✅ **Promover para Master** - Botão na página de usuários (coroa)
- ✅ **Rebaixar para Operacional** - Botão na página de usuários
- ✅ **Filtro de empresas por role** - Operacional só vê empresas atribuídas
- ✅ **Endpoints backend funcionando** - `/auth/users/{id}/promote-master` e `/demote-operacional`

**Alertas Automáticos de NCMs Vilões na Importação:**
- ✅ **Função `identificar_ncms_viloes_importacao`** - Verifica NCMs com histórico de alta carga tributária
- ✅ **Retorno na importação** - Campo `alertas_viloes_ncm` no resultado do upload
- ✅ **Severidade** - Alta (>20%) ou Média (>15%)
- ✅ **Informações detalhadas** - NCM, descrição, NF, carga histórica, débito acumulado

**Evolução Fiscal - Melhorias:**
- ✅ **Dados corretos exibidos** - Compras, Vendas, Impostos funcionando
- ✅ **Formulário de digitação manual** - Permite inserir dados de anos anteriores (2025, 2024, etc.)
- ✅ **Campos desmembrados** - Compras, Vendas, ICMS, PIS, COFINS, ISS, DAS
- ✅ **Seletor de ano** - Dropdown para escolher qual ano digitar
- ✅ **Persistência local** - Dados salvos no localStorage

**Verificação de CFOPs de Substituição Tributária:**
- ✅ **Conversão correta** - 5403 → 1403, 6403 → 2403 (ST interna e interestadual)

### 2026-02-10 (Sessão 9 - Correções de Evolução Fiscal e DIFAL)

**Correção do Endpoint de Análise Horizontal (P0 - RESOLVIDO):**
- ✅ **Endpoint `/api/analise-horizontal/{company_id}`** - Criado e funcionando
- ✅ **Retorna dados mensais** - Compras, vendas, impostos (ICMS, PIS, COFINS, IPI, ISS)
- ✅ **Comparativo ano atual vs anterior** - mensal e mensal_ano_anterior
- ✅ **Endpoint de insights IA** - `/api/analise-horizontal/insights/{company_id}`

**Correção do DIFAL para Simples Nacional:**
- ✅ **Filtro de documentos corrigido** - Usa ambos campos `emitente_uf` e `uf_emitente`
- ✅ **Endpoint de apuração** - `POST /api/simples-nacional/difal/apuracao` funcionando
- ✅ **Cálculo correto** - Alíquota interna (SP: 18%) menos alíquota interestadual (7% ou 12%)
- ✅ **Fundamentação legal** - LC 123/2006, Art. 13, §1º, XIII

**Digitação Manual na Evolução Fiscal:**
- ✅ **Restrição de edição** - Apenas períodos anteriores ao mês atual podem ser editados
- ✅ **Tooltip informativo** - "Período atual/futuro - não editável manualmente"
- ✅ **Texto de ajuda atualizado** - "Edição manual disponível apenas para períodos anteriores"

**Bug Fix - Menu Duplicado:**
- ✅ **Removida duplicação** - "Impostos Retidos" aparecia duas vezes para Lucro Presumido

### 2026-02-10 (Sessão 8 - Melhorias de Menu, CST e Análise Horizontal)

**Modal de Visualização de Notas (Reorganizado):**
- ✅ **Linha 1 - CAPA DA NOTA FISCAL** - Totalizadores da capa do XML
- ✅ **Linha 2 - SOMA DOS PRODUTOS** - Totalizadores calculados dos produtos + BC PIS/COFINS
- ✅ **Linha 3 - DIFERENÇAS** - Validação OK (verde) ou Divergências (vermelho)
- ✅ **Rodapé** - Data emissão, qtd produtos, alertas de CST/CFOP divergentes

**Nova Funcionalidade - Análise Horizontal (Evolução Fiscal):**
- ✅ **Menu dedicado** - "Evolução Fiscal" no menu lateral
- ✅ **Gráfico de evolução** - Compras, Vendas, Impostos (ano atual vs ano anterior)
- ✅ **Saldo credor negativo** - Crédito aparece como valor negativo no gráfico
- ✅ **Impostos unificados/desmembrados** - Seletor para alternar visualização
- ✅ **Comparativo ano a ano** - Linhas do ano atual vs tracejadas do ano anterior
- ✅ **Edição manual** - Clique nos valores para inserir dados manualmente
- ✅ **Análise IA** - Botão para gerar insights comparativos com Gemini
- ✅ **Variação percentual** - Mostra crescimento ou retração por campo

**Menu Lateral Reorganizado:**
- ✅ **Menu sem títulos de seção** - Itens exibidos diretamente (Dashboard, Empresas, Documentos, etc.)
- ✅ **Menu dinâmico por regime tributário:**
  - Simples Nacional: Apuração, Simples Nacional, DIFAL, Impostos Retidos, Indicadores, Evolução Fiscal, RET
  - Lucro Presumido/Real: Apuração, PIS/COFINS, IPI, ICMS, ICMS ST, ISS, Impostos Retidos, Indicadores, Evolução Fiscal, RET
- ✅ **Impostos Retidos** movido para seção de Apurações

**Filtro de Divergência Corrigido:**
- ✅ **Critério unificado** - Mesmo critério da barra de validação (soma produtos vs valor total)
- ✅ **Contador "X de Y"** - Exibe "9 de 166" quando filtro está ativo
- ✅ **Funcionamento correto** - Clicando em "Divergente" mostra apenas notas com divergência

**Importação de NFS-e via IA:**
- ✅ **Serviços Tomados e Prestados** - Aceita XML ou PDF/Imagem
- ✅ **Botão "Importar XML ou PDF"** - Exibido para tipos com importType: 'both'
- ✅ **Processamento via IA** - Extrai dados de PDFs/imagens de NFS-e automaticamente

**Importação de Relatório de Canceladas (Aprimorado):**
- ✅ **Suporta múltiplos formatos** - CSV, TXT, XLSX, XML, PDF
- ✅ **Extração automática de números** - Identifica números de notas canceladas
- ✅ **Marcação automática** - Flega notas com base no relatório enviado

**NCMs de Bebidas Alcoólicas (Completo):**
- ✅ **Posição 2204** - Vinhos de uvas frescas (espumantes, <= 2L, > 2L)
- ✅ **Posição 2205** - Vermutes e vinhos aromatizados
- ✅ **Posição 2206** - Sidra, saquê, cooler, catuaba (fermentados)
- ✅ **Posição 2207** - Álcool etílico
- ✅ **Posição 2208** - Destilados (whisky, vodka, rum, cachaça, gin, licores, tequila)

**Análise de Divergências CST PIS/COFINS:**
- ✅ **Endpoint `/api/relatorio-divergencias-saida`** - Sugere CST 01 para saídas tributadas com CFOP de débito
- ✅ **Endpoint `/api/relatorio-divergencias-entrada`** (NOVO) - Sugere CST 50 para entradas com direito a crédito (Lucro Real)
- ✅ **CSTs corretos:**
  - Saídas tributadas: CST 01 (débito)
  - Entradas com crédito (Lucro Real): CST 50
  - Monofásicos: CST 04
  - Alíquota zero saída: CST 06
  - Alíquota zero entrada: CST 73

**UI/UX Melhorias:**
- ✅ **Header fixo na Auditoria PIS/COFINS** - Cards e filtros fixos, lista com scroll independente

### 2026-02-10 (Sessão 7 - Cancelamento NFS-e e Melhorias)

**Fluxo de Cancelamento de NFS-e (NOVO):**
- ✅ **Modal de Cancelamento de NFS-e** - Ao importar NFS-e prestadas:
  - Preview de todas as notas antes de importar
  - Marcação manual de notas canceladas (checkbox)
  - Upload de relatório (Excel/CSV/TXT/**XML**) com números cancelados
  - Notas canceladas importadas com valor zerado e status "cancelada"
  - Relatório de conclusão mostra notas ativas vs canceladas
- ✅ **Endpoints novos no backend:**
  - `POST /api/nfse/preview` - Pré-visualiza NFS-e para marcação
  - `POST /api/nfse/import-with-cancellations` - Importa com cancelamentos
  - `POST /api/nfse/import-cancellation-report` - Processa relatório de cancelados

**Correções e Melhorias:**
- ✅ **Arquivo UploadXML.js removido** - Rota `/upload` agora redireciona para `/documents`
- ✅ **Agrupamento automático de CFOPs** - Produtos com CFOPs especiais recebem categoria específica
- ✅ **Categorias de Classificação Inteligente expandidas** - 28 categorias com ícones e cores distintas
- ✅ **DIFAL corrigido** - Campo `emitente_uf`/`uf_emitente` agora suportados ambos
- ✅ **Entradas sem filtro de atividade** - Todas empresas veem todos os tipos de entrada
- ✅ **Saídas dinâmicas** - Filtradas por atividade da empresa (comércio, serviços, mista)
- ✅ **Relatório de conclusão** - Fallback para calcular totais quando campos zerados

**Cadastro de Empresa (NOVOS CAMPOS):**
- ✅ **Campo "Aplicação em Serviços"**:
  - Empresas SÓ de serviços: informativo (substitui conceito de revenda)
  - Empresas mistas: toggle adicional junto com perfis comerciais
- ✅ **Saldo Credor Inicial:**
  - Flag "Possui saldo credor?"
  - Campos para ICMS, PIS, COFINS
  - Competência inicial definida
- ✅ **Transportadora (Atividades Especiais):**
  - Flag "É transportadora?"
  - Tipo de transporte (carga/passageiros)
  - Crédito presumido ICMS configurável (padrão 20% RICMS/SP)

**Dashboard Fator R (Melhorado):**
- ✅ **Comparativo Visual Anexo V vs Anexo III** - Cards lado a lado com destaque visual
- ✅ **Economia Real/Potencial** - Card destacado com valor anual e mensal
- ✅ **Barra de progresso do Fator R** - Visualização percentual até 28%
- ✅ **Dica de Otimização** - Orientação para aumentar folha e migrar de anexo

**Transportadoras - CT-e e Crédito Presumido:**
- ✅ **Cálculo de Crédito Presumido ICMS** - Integrado à apuração de ICMS
- ✅ **Demonstrativo atualizado** - Mostra crédito presumido quando aplicável
- ✅ **Base legal** - Art. 70, XI do RICMS/SP (20% sobre débito)

**Saldo Credor - Transporte Automático:**
- ✅ **Endpoints para gerenciamento:**
  - `GET /api/saldo-credor/{company_id}` - Retorna saldos disponíveis
  - `POST /api/saldo-credor/{company_id}/fechar-competencia` - Fecha e transporta saldos
  - `GET /api/saldo-credor/{company_id}/historico` - Histórico de saldos
- ✅ **Lógica de transporte**: Saldos negativos (credores) são automaticamente transportados

**Impostos Retidos:**
- ✅ **Endpoint de Apuração:**
  - `GET /api/impostos-retidos/{company_id}` - Retorna impostos retidos
- ✅ **Impostos identificados**: ISS, IR, PIS, COFINS, CSLL, INSS
- ✅ **Separa por tipo**: Serviços tomados vs prestados
- ✅ **Detalhes por documento**: NF, prestador/tomador, valores retidos
- ✅ **Resumo com orientação**: Obrigações de recolhimento identificadas

### 2026-02-09 (Sessão 6 - FASE 1 e FASE 2)

**FASE 1 - Correções Críticas:**
- ✅ **Relatório de Importação corrigido** - Mapeamento de campos ajustado
- ✅ **CFOP 5933 em NFS-e Prestadas** - Todas notas de serviços prestados
- ✅ **CFOPs de natureza distinta** - 50+ categorias automáticas:
  - 1910/2910 → Bonificação/Doação
  - 1911/2911 → Amostra Grátis  
  - 1949/2949 → Outras Operações
- ✅ **Contador de café restaurado** - Animação flutuante durante upload
- ✅ **Filtro de divergência corrigido** - Inclui `servicos` além de `produtos`

**FASE 2 - Funcionais:**
- ✅ **Cálculo Presumido RET por atividade**:
  - Serviços: 32% IRPJ, 32% CSLL
  - Comércio: 8% IRPJ, 12% CSLL
  - Mista: Separa faturamento automaticamente
  - Transportadora e Revenda Combustível: Presunções especiais
- ✅ **Card ICMS nos Indicadores** - Mostra saldo credor em verde
- ✅ **Classificação IA melhorada**:
  - Analisa produtos de SAÍDA para entender o que a empresa vende
  - Compara NCM e descrições para classificar como REVENDA
  - Em caso de dúvida para comércio → REVENDA
- ✅ **Categorias de classificação expandidas** - 14 categorias com ícones
- ✅ **Barra de pesquisa na Classificação** - Já existia, verificada

### 2026-02-09 (Sessão 5)
- ✅ **Nova Página de Apuração - Resumo do Movimento**
  - Endpoint `/apuracao-movimento/{company_id}` criado
  - Agrupamento por CFOP com descrição automática
  - Totais de documentos, produtos, valores, ICMS, PIS, COFINS, IPI, ICMS-ST
  - Abas separadas para Entradas e Saídas
  - **Todas as colunas ordenáveis** (CFOP, descrição, qtd, valores, impostos)
  - Cards de resumo com totais por categoria
  - Exportação para Excel
  - Menu "Apuração" adicionado ao layout
- ✅ **CORRIGIDO: Divergência do Simples Nacional entre Dashboard e RET**
  - RET agora usa a **mesma função** `calcular_aliquota_efetiva` e `calcular_das_periodo` do Dashboard
  - RBT12 usa PGDAS se disponível (igual ao Dashboard)
  - Descontos de ST, monofásicos e alíquota zero calculados **independentemente** do CST
  - **Dashboard e RET agora mostram o mesmo valor de DAS** (R$ 6.173,67 para E.L.M. 01/2026)
- ✅ **Adaptação da página Indicadores para Simples Nacional**
  - Corrigida chamada do endpoint (POST em vez de GET)
  - Mapeamento correto dos campos `das_mes_atual`, `enquadramento`, `faturamento`
  - Card DAS com composição por tributo (IRPJ, CSLL, COFINS, PIS, CPP, ICMS)
  - Exibição do Anexo, Faixa e RBT12

### 2026-02-12 (Sessão 4)
- ✅ **Nova Página de Relatórios Gerenciais completa**
  - 3 abas: Consolidado, Por Alíquota PIS/COFINS, Por Produto
  - Seleção de seções via flags (Resumo, ICMS, PIS/COFINS Unificado, Documentos, Produtos)
  - Botões "Selecionar Todos" e "Nenhum"
  - Exportação em Excel (.xlsx) com formatação profissional
  - Preview dos dados antes de exportar
  - PIS/COFINS unificados em uma única tabela
- ✅ **Endpoint /relatorio-consolidado/{company_id}/exportar**
  - Gera Excel com múltiplas abas (Resumo, ICMS, PIS-COFINS, Documentos, Produtos)
  - Formatação com cores, bordas e valores monetários
  - Logo placeholder no cabeçalho
- ✅ **Logo da empresa já aparece no menu de navegação** (implementado anteriormente)

### 2026-02-12 (Sessão 3)
- ✅ **Corrigido modal de visualização de NF** - Erro "Objects are not valid as React child" corrigido com função `formatEndereco`
- ✅ **Corrigido cálculo do RET - Proporcionalização 12 meses** 
  - Alíquota Simples agora usa RBT12 proporcionalizado (ex: 1 mês de R$ 149k → 12 meses R$ 1.79M → alíquota 10.7%)
  - Novos campos: `rbt12`, `rbt12_proporcionalizado`, `meses_com_dados`
- ✅ **Corrigido card Lucro Real no PIS/COFINS Comparativo**
  - Adicionados campos `debitos_comercio.total` e `debitos_servicos.total`
  - Exibindo linha de "Débitos Total" e mensagem de "Crédito acumulado" quando imposto a pagar é zero
- ✅ **Melhorada aba Divergências PIS/COFINS**
  - Nova visualização em tabela compacta (sem accordion)
  - Colunas: NF, Tipo, Emitente, Produto, NCM, CFOP, CST XML, CST Calc., Alíq. PIS, Alíq. COFINS, Impacto
- ✅ **Barra de pesquisa no modal Memória IA**
  - Filtro por produto, NCM, categoria ou CFOP
  - Contador mostra "X de Y regra(s)"
- ✅ **Filtro de Integridade já existia** - Botões "Todos / Divergentes / Validadas" na página Documents

### 2026-02-12 (Sessão 2)
- ✅ **Ordenação de colunas em TODAS as tabelas**
  - ICMS: CFOP, Status, Qtd, Valor Total, BC ICMS, Valor ICMS
  - IPI: CFOP, Qtd, Valor Total, BC IPI, Valor IPI
  - Usuários: Usuário, Email, Perfil, Status
  - Documentos: já tinha ordenação completa
  - Indicadores visuais: ↑ (ascendente), ↕ (ordenável)
- ✅ **Filtro de modelos fiscais por atividade da empresa**
  - Menu Saídas filtra tipos de documento pela atividade cadastrada
  - COMERCIO: vê NF-e e NFC-e (não vê CT-e ou Serviços Prestados)
  - SERVICOS: vê Serviços Prestados
  - TRANSPORTE: vê CT-e
  - Mensagem "Exibindo opções para: [ATIVIDADE]" exibida
- ✅ **Classificação padrão "compra para revenda"**
  - Quando IA não consegue classificar, usa categoria "revenda" (CFOP 1102/2102)
  - Fallback implementado no servidor (linhas 13087-13093)
- ✅ 100% testes passaram (iteration 42)

### 2026-02-12 (Sessão 1)
- ✅ **Classificação baseada no regime da empresa**
  - Divergências PIS/COFINS usam regime_tributario da empresa (não mais LUCRO_REAL fixo)
  - Detalhamento PIS/COFINS usa regime_para_calculo correto
  - Lucro Real agora é APENAS para comparação no RET e cards comparativos
- ✅ **RET - Dados do Lucro Real corrigidos**
  - Novos campos: pis_debitos, cofins_debitos, pis_creditos, cofins_creditos
  - Teknolink: Débitos PIS R$ 2.397,58 | Débitos COFINS R$ 11.043,73
  - Nota explicativa sobre créditos de PIS/COFINS
- ✅ **Botão "Memória IA" na Classificação Inteligente**
  - Modal exibe 108 regras aprendidas para Teknolink
  - Funcionalidades: listar, editar categoria, excluir regra
  - Endpoints: GET /learned-rules/{company_id}, PUT/DELETE /ai/learned-rules/{rule_id}
- ✅ **Ordenação de colunas na página ICMS**
  - CFOP em ordem crescente por padrão
- ✅ 100% testes passaram (iteration 41)

### 2026-02-11 (Sessão 2)
- ✅ **Novo componente DocumentDetailModal** - visualização detalhada de NF
  - Comparativo Capa NF × Produtos
  - Indicadores verde (OK) / vermelho (divergência)
  - Tabela completa: NCM, CFOP, CST, bases, impostos
- ✅ **Barra de progresso flutuante** - não bloqueia navegação durante importação
- ✅ **Filtro de divergências** na listagem de documentos (Todos/Divergente/OK)
- ✅ **Modal de edição de produto** na tela de Classificação Inteligente
- ✅ **Links para NFs** nos produtos agrupados
- ✅ **Endpoint /products/classify-single** - reclassifica produto e atualiza CFOP
- ✅ **Classificação IA atualiza CFOP** além da categoria
- ✅ **Divergências PIS/COFINS apenas SAÍDA** - corrigido filtro
- ✅ **Indicadores para Lucro Presumido** - corrigida busca de dados
- ✅ **Vilões e Oportunidades ICMS** - agora mostram % entrada/saída e explicação
- ✅ **Insights IA** - corrigida referência de campo (insights_ia)
- ✅ **Gráfico composição vendas** no Dashboard Simples (tributado/ST/mono/zero)
- ✅ **Componente SortableTable** - ordenação reutilizável criada
- ✅ **Ordenação na página Companies** - código, razão, CNPJ, regime
- ✅ **Relatório de Produtos Agrupados** - exportação XLSX com NCM, valor, base legal
- ✅ **Botão exportar** no card de Composição de Vendas
- ✅ 45/45 testes backend passaram (iterations 38, 39, 40)

### 2026-02-11 (Sessão 1)
- ✅ **CORRIGIDO: Cálculo do DAS no Dashboard do Simples Nacional**
  - Fórmula corrigida: `desconto = valor_produtos × alíquota_efetiva × (% tributo / 100)`
  - DAS E.L.M. 01/2026 = R$ 6.173,67 ✓
- ✅ Funções `is_ncm_monofasico` e `is_ncm_cesta_basica`
- ✅ Separação: ST, monofásicos, alíquota zero
- ✅ Proteção: descontos ≤ DAS bruto

### 2026-02-09 (Sessão 2)
- ✅ Alertas de CFOP agrupados por CFOP
- ✅ Ação em lote para classificação
- ✅ Edição manual de CFOP

### 2026-02-09 (Sessão 1)
- ✅ Barra de progresso com contador tomando café
- ✅ Upload de logo da empresa
- ✅ Aviso no RET para dados incompletos

## Backlog

### P0 - Crítico (CONCLUÍDO)
- [x] ~~Cálculo do DAS~~ ✅
- [x] ~~Visualização detalhada de NF~~ ✅
- [x] ~~Classificação IA atualizando CFOP~~ ✅
- [x] ~~Barra de progresso não bloqueante~~ ✅
- [x] ~~CST PIS/COFINS nas divergências~~ ✅ (CST 01 saída, CST 50 entrada)
- [x] ~~NCMs bebidas alcoólicas tributadas~~ ✅

### P1 - Alta Prioridade (MAIORIA CONCLUÍDA)
- [x] ~~Modal de edição de produtos clicável~~ ✅
- [x] ~~Links de NFs nos produtos~~ ✅
- [x] ~~Divergências PIS/COFINS só saídas~~ ✅
- [x] ~~Indicadores Lucro Presumido~~ ✅
- [x] ~~Vilões e Oportunidades ICMS com % entrada/saída~~ ✅
- [x] ~~Insights IA no menu Indicadores~~ ✅
- [x] ~~Gráfico proporção vendas no Dashboard Simples~~ ✅
- [x] ~~Relatório exportação por agrupamento de produtos~~ ✅
- [x] ~~Botão Memória IA na Classificação~~ ✅
- [x] ~~Classificação baseada no regime da empresa~~ ✅
- [x] ~~Importação de NFS-e via IA~~ ✅ (Serviços Tomados e Prestados)
- [x] ~~Menu dinâmico por regime tributário~~ ✅
- [x] ~~Card Outros Documentos nas Entradas~~ ✅
- [x] ~~Sistema de permissões de usuário (Master vs. Operacional)~~ ✅ (promover/demover + filtro de empresas)
- [ ] Lógica de transporte de saldo credor (UI)
- [ ] Modal de seleção de empresa (bug de usabilidade - afeta apenas testes automatizados)

### P2 - Média Prioridade (MAIORIA CONCLUÍDA)
- [x] ~~Ordenação na página ICMS~~ ✅
- [x] ~~Ordenação na página IPI~~ ✅
- [x] ~~Ordenação na página Usuários~~ ✅
- [x] ~~Ordenação em Companies~~ ✅
- [x] ~~Filtrar modelos fiscais por atividade da empresa~~ ✅
- [x] ~~Classificação padrão "compra para revenda" quando IA falhar~~ ✅
- [x] ~~DIFAL para Simples Nacional~~ ✅ (endpoint e página funcionando)
- [x] ~~Melhorar análise de vilões/oportunidades com PIS/COFINS~~ ✅
- [x] ~~Melhorar IA de classificação com análise de saídas~~ ✅
- [x] ~~FASE 3 - Wizard de Configuração de Empresa~~ ✅
- [x] ~~FASE 3 - Dashboard de Inconsistências (Central de Alertas)~~ ✅
- [ ] Importação de CT-e para transportadoras
- [ ] Ordenação nas páginas restantes (ISS, DIFAL, SimplesNacionalDashboard)
- [ ] Logo nos relatórios exportados
- [ ] Upload de Certificado Digital (.pfx)

### P3 - Baixa Prioridade
- [x] ~~FASE 1 - Sistema de Permissões e Controle de Acesso~~ ✅ (SEGURANÇA RESOLVIDA)
- [x] ~~FASE 2 - Documentação e Preparação para Refatoração~~ ✅ (API_DOCUMENTATION.md criado)
- [x] ~~FASE 4 - Histórico de Alterações (Audit Log)~~ ✅ (Implementado)
- [x] ~~FASE 5 - Geração de SPED Fiscal~~ ✅ (Página e endpoint funcionando)
- [x] ~~FASE 6 - Apuração Automática Mensal~~ ✅ (Fechamento Mensal implementado)
- [x] ~~FASE 7 - Suporte a Multi-estabelecimento~~ ✅ (Grupos Empresariais)
- [ ] FASE 2.1 - Migração incremental de routers (trabalho contínuo)
- [ ] Sistema de licenças comerciais
- [ ] Dashboard estatísticas Master
- [ ] Integração SIEG (BLOQUEADO - chave inválida)

## Credenciais de Teste
- Email Super Admin: alberto.lemes@businessconta.com.br / Business@2026
- Email Admin: admin@test.com / 123456
- Email Operacional: operacional@test.com / 123456 (acesso apenas à COMERCIAL RS LTDA)

## Endpoints de Alertas CFOP

### GET /api/alertas-cfop/{company_id}/agrupado
Retorna alertas agrupados por CFOP para ação em lote.

### POST /api/alertas-cfop/resolver-grupo
Resolve todos os alertas de um CFOP específico.
Parâmetros: company_id, competencia, cfop_atual, novo_cfop, salvar_regra

### POST /api/alertas-cfop/resolver-individual
Resolve um alerta específico de um produto.
Parâmetros: documento_id, produto_idx, novo_cfop
