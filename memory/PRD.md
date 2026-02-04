# Business Contabilidade - Sistema de Fechamento Fiscal

## Problema Original
O proprietário do escritório "Business Contabilidade" precisa de um site para otimizar o processo de fechamento fiscal de seus clientes.

## Funcionalidades Implementadas

### ✅ Autenticação
- Login com email e senha
- Registro de novos usuários
- Controle de acesso por role (admin/client)

### ✅ Logo e Identidade Visual
- Logo da Business Contabilidade no header
- Logo no modal de seleção de empresa
- Cores da marca: Vermelho e Preto

### ✅ Seletor Global de Empresa/Competência
- Botão no header mostrando empresa e competência selecionada
- Modal para trocar empresa e competência a qualquer momento
- Seleção persiste entre navegações (localStorage)
- Formato de competência: MM/AAAA
- **Auto-preenchimento**: Páginas de Upload, Reclassificação e SPED usam o contexto global

### ✅ Gestão de Empresas
- Listagem de empresas cadastradas
- **Cadastro e Edição** de empresas
- **Campo Código/ID da Empresa** - Identificador customizado (#001, CLI-2024, etc.)
- Busca automática de dados da Receita Federal via CNPJ
- **Exclusão de empresas** - Funcionando (apenas empresas sem documentos)
- Badge com código da empresa exibido no card e no header

### ✅ **Dashboard Completo** (Atualizado 02/2026)
- Estatísticas por **empresa e competência selecionada**
- **Quantidade por tipo de documento:**
  - NF-e Entrada (compras)
  - NF-e Saída (vendas)
  - NFC-e (cupons fiscais)
  - NFS-e (notas de serviço)
- **Notas validadas vs pendentes**
- **Valores do período:**
  - Total de Entradas
  - Total de Vendas
  - Total de Serviços
  - Faturamento Total
- **Impostos (Créditos, Débitos, A Pagar):**
  - ICMS, PIS, COFINS, ISS
  - Total de Impostos a Pagar
- **Indicadores:**
  - Markup percentual (entradas vs faturamento)
- **🆕 Análise Comparativa Lucro Presumido vs. Lucro Real:**
  - Para empresas do Lucro Presumido: mostra quanto pagaria no Lucro Real
  - Para empresas do Lucro Real: mostra quanto pagaria no Lucro Presumido
  - Compara PIS/COFINS entre os regimes
  - Indica qual regime é mais vantajoso
  - Mostra economia potencial
- Links rápidos para Análise Tributária e Relatórios

### ✅ Upload de XML com Validação Inteligente
- Upload em lote de arquivos XML de notas fiscais
- **Detecção automática de tipo:** NF-e, NFC-e (cupom) ou NFS-e (serviço)
- **Validação de CNPJ** - Rejeita XMLs de empresas diferentes
- **Validação de Competência** - Rejeita XMLs com data fora do período
- **Relatório detalhado de erros** - Mostra resumo completo
- Conversão automática de CFOP
- **Auto-preenchimento de competência** do contexto global

### ✅ Análise Tributária Inteligente por IA
- Página dedicada: `/analise-tributaria`
- **Composição do Faturamento:** Total, Serviços, Vendas com percentuais
- **Vendas por Tributação ICMS:** ST, Tributado, Isento
- **Créditos (Entradas):** ICMS tributado/ST, PIS/COFINS tributado/alíq. zero
- **Débitos (Saídas):** ICMS tributado/ST/isento, PIS/COFINS
- **Apuração do Período:** ICMS, PIS, COFINS a pagar com total
- **IRPJ/CSLL:** Cálculo para Lucro Presumido com presunções
- **Ponto de Equilíbrio:** Para Lucro Real (faturamento, CMV, lucro bruto, despesas)
- **Alertas e Recomendações:** Gerados por IA com base legal
- **Exportar análise em TXT**

### ✅ Reclassificação com IA
- Visualização por NF-e ou por Produtos agrupados
- Comando para IA reclassificar em lote
- **Não precisa selecionar itens** - A IA identifica produtos pela descrição
- Dica com exemplos clicáveis de comandos ("produtos de limpeza → DESPESA", etc.)
- Sistema de aprendizado que memoriza correções
- Validação de PIS/COFINS/ICMS com base legal (alíquota zero)
- **Auto-preenchimento de competência** do contexto global

### ✅ **Validação de Classificações**
- Página dedicada: `/validation`
- **Apenas NF-e de Entrada** - Saídas não precisam de validação de CFOP
- **Modo Por NF-e:** Valida por documento
- **Modo Por Produto:** Produtos agrupados por código
  - Botão "Selecionar Todos" / "Limpar Seleção"
  - Botão "Aprovar Selecionados" para aprovação em lote
- **Header verde com estatísticas**: Aprovados, Pendentes, Total
- **Explicação "Como funciona?"**: Aprovar = concordar, Alterar = mudar CFOP
- **Justificativa da IA:** Mostra porque classificou (ex: "Material de limpeza (detergente)")
- **Mensagem de sucesso:** Toast verde "Produto validado com sucesso!"

### ✅ **Análise de Alíquotas de Saída**
- **Página dedicada:** `/analise-aliquotas-saida`
- Tabela de produtos com NCM e alíquotas de ICMS, PIS, COFINS
- Compara alíquotas efetivas com padrão do regime tributário
- Considera NCMs com alíquota zero (monofásico/isento)
- Valida ICMS baseado no UF da empresa
- Alertas para divergências e impostos zerados
- Ordenação por todas as colunas
- Resumo: total de produtos, produtos com alerta, alertas por imposto
- Filtro: Todos, Com Alertas, OK
- Exportar CSV

### ✅ **Gerenciamento de Documentos**
- **Apagar notas em lote:** Botão "Apagar Competência {MM/AAAA}" na página de documentos
- **Apagar individual:** Botão de lixeira em cada linha da tabela
- Filtro por empresa, status e tipo de operação

### ✅ **Relatórios por Operação** (Atualizado 02/2026)
- Filtro: **Entrada (Compras)**, **Saída (Vendas)**, ou **Todos**
- Indicador visual do tipo de operação selecionado
- Relatórios usa empresa/competência do contexto automaticamente
- **Filtro de entrada/saída funcionando** - Parâmetro `tipo` enviado corretamente

### ✅ **Melhorias de UX**
- **Menu "Empresas" no header** - Ao lado do seletor de empresa
- **Competência só números** - Digita 122025 → formata como 12/2025
- **Memória da IA** - Explicação clara do que são as regras aprendidas
- **Justificativa da classificação** - A IA explica porque classificou cada produto
- **Checkbox individual** para aprovar cada produto
- **Botões em lote**: "Aprovar Todos" e "Limpar" por documento
- **Filtro "Mostrar só pendentes"** para focar nos itens não revisados
- Persistência de aprovações no localStorage por empresa/competência
- **Auto-preenchimento de competência** em todas as páginas relevantes

### ✅ Relatórios por Competência
- Filtro de competência nos relatórios gerenciais
- **Exportar CSV** - Funcionando com parsing robusto de valores
- BOM UTF-8 para caracteres especiais

### ✅ Exportação SPED por Competência
- Seletor de competências disponíveis
- Exporta apenas documentos da competência selecionada
- **Auto-preenchimento de competência** do contexto global

### ✅ Reset da Base de Dados
- Endpoint `POST /api/db/reset` para zerar todas as tabelas

### ✅ **Menu Reorganizado**
- Ordem lógica do fluxo de trabalho:
  1. Dashboard → 2. Empresas → 3. Upload XML → 4. Documentos
  5. Reclassificação IA → 6. Validação → 7. Análise Tributária
  8. Relatórios → 9. Exportar SPED

## Arquitetura Técnica

### Backend (FastAPI)
- `/app/backend/server.py` - API monolítica
- MongoDB para persistência
- **Integração com IA**: OpenAI GPT-4o via Emergent LLM Key
- Endpoints principais:
  - Autenticação: `/api/auth/login`, `/api/auth/register`
  - Empresas: `/api/companies` (GET, POST, PUT, DELETE)
  - CNPJ: `/api/cnpj/{cnpj}`
  - Upload XML: `/api/xml/upload`
  - Dashboard: `/api/dashboard/stats/{id}` (inclui analise_comparativa)
  - Análise Alíquotas: `/api/analise-aliquotas-saida/{id}`
  - Relatórios: `/api/reports/by-product/{id}`, `/api/reports/by-ncm/{id}` (aceita param `tipo`)
  - SPED: `/api/sped/export/{id}`
  - Análise Tributária: `/api/ai/analise-tributaria`
  - Reclassificação: `/api/ai/reclassify`, `/api/ai/validate-taxes`
  - Reset: `/api/db/reset`

### Frontend (React)
- Context API para estado global (empresa/competência)
- Componentes: Layout.js, CompanySelector.js, AppContext.js
- Páginas: Dashboard, AnaliseTributaria, Companies, UploadXML, Documents, ReclassificationAI, Validation, Reports, ExportSPED, AnaliseAliquotasSaida

### Integrações
- Brasil API - dados de empresas por CNPJ
- **OpenAI GPT-4o** - análises tributárias e reclassificação via Emergent LLM Key

## Testes (02/2026)
- **Iteration 10**: 100% backend / 100% frontend
  - Dashboard com análise comparativa Lucro Presumido vs. Real
  - Filtro entrada/saída nos relatórios
  - Auto-preenchimento de competência em todas as páginas

## Credenciais de Teste
- Email: admin@test.com
- Senha: test123

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Corrigir AppContext para re-buscar empresas após login (issue conhecido)

### P2 - Média Prioridade
- [ ] Histórico de alterações (audit log) para reclassificações
- [ ] Testar exportação SPED com dados reais
- [ ] Dashboard principal com indicadores de todas as empresas

### P3 - Baixa Prioridade
- [ ] Refatorar backend em módulos separados (routes, models, services)
- [ ] Melhorar UX do modal de seleção de empresa

## Changelog

### 02/2026 - Iteration 11
- ✅ **ICMS-ST desconsiderado nos créditos**: Mercadorias com ICMS Substituição Tributária (CST 10, 30, 60, 70, 201, 202, 203, 500) não geram mais crédito de ICMS no Dashboard
- ✅ Dashboard mostra linha "ICMS-ST (sem crédito)" quando houver valor desconsiderado
- ✅ **Corrigido bug do AppContext**: Modal de seleção de empresa agora recarrega empresas ao abrir
- ✅ **Competência com valor inicial**: Campo de competência no seletor agora preenche automaticamente com mês/ano atual

### 02/2026 - Iteration 10
- ✅ Implementada análise comparativa Lucro Presumido vs. Lucro Real no Dashboard
- ✅ Auto-preenchimento de competência nas páginas Upload XML, Reclassificação IA e Exportar SPED
- ✅ Verificado que filtro entrada/saída nos relatórios funciona corretamente
- ✅ Todas as funcionalidades testadas e aprovadas (100% backend, 100% frontend)
