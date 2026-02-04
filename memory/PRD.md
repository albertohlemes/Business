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
- **🆕 Persistência completa**: Todas as páginas (Dashboard, Relatórios, Documentos, Validação, etc.) refletem automaticamente a seleção do contexto global

### ✅ Gestão de Empresas
- Listagem de empresas cadastradas
- **Cadastro e Edição** de empresas
- **Campo Código/ID da Empresa** - Identificador customizado (#001, CLI-2024, etc.)
- Busca automática de dados da Receita Federal via CNPJ
- **Exclusão de empresas** - Funcionando (apenas empresas sem documentos)
- Badge com código da empresa exibido no card e no header

### ✅ **Apuração PIS/COFINS Reformulada** (04/02/2026)
- **CST Calculado na Importação:** O sistema agora aplica automaticamente o CST correto durante o upload do XML:
  - **Entrada:** CST 50 (com direito a crédito) ou CST 73 (alíquota zero pelo NCM)
  - **Saída:** CST 01 (tributado) ou CST 06 (alíquota zero pelo NCM)
- **NCMs com Alíquota Zero:** Produtos com NCM na lista oficial (Tabela 4.3.13 SPED) são automaticamente classificados
- **Relatório de Divergências de Saída:** Identifica produtos que no XML vieram tributados mas deveriam ter alíquota zero
- **Coluna CST Única:** Removida duplicação da coluna CST quando visualização é "Por CST"
- **CFOPs com/sem Crédito:** Separação correta entre operações que geram ou não crédito de PIS/COFINS

### ✅ **Dashboard Completo** (Atualizado 04/02/2026)
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
- **🆕 Barra de Progresso em Tempo Real:** (04/02/2026)
  - Feedback visual durante o upload com SSE (Server-Sent Events)
  - Barra fixa no topo mostrando porcentagem, arquivos processados e etapa atual
  - Botão com spinner e porcentagem durante processamento
  - Inputs desabilitados durante upload para segurança

### ✅ **Classificação de CFOP por IA nas Entradas** (04/02/2026) 🆕
- **Classificação Semântica com IA (GPT-4o):** A IA analisa a descrição do produto e classifica usando inteligência semântica
- **Palavras-chave da Empresa:** Usa as listas cadastradas (produtos_comercializados, insumos_producao, produtos_despesa) para guiar a classificação
- **Categorias e CFOPs:**
  - **REVENDA** → CFOP 1102 (ou 2102 interestadual)
  - **INSUMO** → CFOP 1101 (ou 2101 interestadual)
  - **DESPESA** → CFOP 1556 (ou 2556 interestadual)
- **Match Semântico:** A IA entende que "SHOYU" é um produto oriental, "DETERGENTE" é limpeza, etc.
- **Relatório de Conversões:** Após o upload, exibe relatório detalhado com:
  - Produto convertido
  - CFOP Original → CFOP Convertido
  - Categoria (REVENDA/INSUMO/DESPESA)
  - Justificativa da IA explicando o motivo da classificação
- **Fallback Inteligente:** Se a IA não classificar, usa regras diretas (keywords exatas)

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

### P0 - Crítica
- [ ] **Página "Análise Tributária" congela a interface** - Refatorar para processamento assíncrono com BackgroundTasks

### P1 - Alta Prioridade
- [x] ~~**Download via SIEG:** Implementar download e processamento automático de XMLs do SIEG~~ ✅ CONCLUÍDO
- [ ] Finalizar e testar a funcionalidade de exportação do **SPED Fiscal**
- [ ] Melhorar análise comparativa "Lucro Presumido vs. Lucro Real" no Dashboard

### P2 - Média Prioridade
- [ ] **Análise de Saídas e Divergências:** Agrupar por produto e filtrar itens com tributação indevida
- [ ] Histórico de alterações (audit log) para reclassificações
- [ ] Testar exportação SPED com dados reais
- [ ] Dashboard principal com indicadores de todas as empresas
- [ ] Validação de alíquota de ICMS por estado

### P3 - Baixa Prioridade
- [ ] **Cor de fundo do logo:** Ajustar para coincidir com a página
- [ ] Refatorar backend em módulos separados (routes, models, services) - server.py tem 3000+ linhas

## Changelog

### 02/2026 - Iteration 27 (04/02/2026)
- ✅ **MELHORIAS NA MEMÓRIA DA IA**
  - Adicionado checkbox para selecionar múltiplas regras
  - Adicionado botão "Selecionar todas" 
  - Adicionado botão "Limpar Tudo" para excluir todas as regras da empresa
  - Ao editar categoria, o CFOP é ajustado automaticamente:
    - REVENDA → 1102/2102 (tributado) ou 1403/2403 (ST)
    - INSUMO → 1101/2101 (tributado) ou 1401/2401 (ST)
    - DESPESA → 1556/2556 (tributado) ou 1407/2407 (ST)
  - Adicionado suporte para categorias com ST (REVENDA_ST, INSUMO_ST, DESPESA_ST)

- ✅ **GARANTIA DE CLASSIFICAÇÃO PARA NFs DE ENTRADA**
  - **Problema:** Alguns produtos de entrada não estavam sendo classificados quando a IA falhava
  - **Solução:** Adicionado fallback em 3 endpoints de upload/processamento
  - **Regra:** Na dúvida, classificar como REVENDA com CFOP 1102/2102 (tributado) ou 1403/2403 (ST)
  - **Nenhuma NF de entrada** pode ser importada sem classificação

### 02/2026 - Iteration 26 (04/02/2026)
- ✅ **MENUS UNIFICADOS: "Validação & IA"**
  - **Problema:** Dois menus separados ("Reclassificação IA" e "Validação Entrada") tinham funcionalidades sobrepostas
  - **Solução:** Criada nova página `ClassificacaoPage.js` combinando:
    - ✅ Aprovação de produtos em lote
    - ✅ Comandos de IA para reclassificação
    - ✅ Memória da IA (regras aprendidas)
    - ✅ Reclassificação manual com modal
    - ✅ Visualização por produto agrupado
    - ✅ Filtros e ordenação
  - **Arquivos modificados:**
    - Criado: `/app/frontend/src/pages/ClassificacaoPage.js`
    - Modificado: `/app/frontend/src/components/Layout.js` (menu)
    - Modificado: `/app/frontend/src/App.js` (rotas)
  - **Rotas antigas redirecionam:** `/validation` e `/reclassification` → `/classificacao`

### 02/2026 - Iteration 25 (04/02/2026)
- ✅ **NOVO LOGO IMPLEMENTADO**
  - Substituído o logo anterior pelo novo logo com fundo transparente fornecido pelo usuário
  - Logo agora combina perfeitamente com qualquer fundo (header branco, modal vermelho, etc.)
  - **Arquivos modificados:**
    - `/app/frontend/public/logo-business.png` (substituído)
    - `/app/frontend/src/components/Layout.js` (simplificado CSS)
    - `/app/frontend/src/components/CompanySelector.js` (simplificado CSS)

- ✅ **PÁGINA DE UPLOAD AGORA PRIORIZA EMPRESA DO CONTEXTO**
  - **Problema:** A página de Upload não priorizava a empresa selecionada no contexto global
  - **Solução:** Removida a condição `!selectedCompany` do useEffect e ajustada a lógica de fallback no fetchCompanies
  - **Resultado:** A empresa selecionada no header agora é automaticamente preenchida na página de Upload
  - **Arquivos modificados:**
    - `/app/frontend/src/pages/UploadXML.js`

### 02/2026 - Iteration 24 (04/02/2026)
- ✅ **COR DE FUNDO DO LOGO AJUSTADA**
  - **Problema:** O logo (com fundo preto sólido na imagem) destoava quando exibido em fundos brancos (header) ou vermelhos (modal de seleção de empresa).
  - **Solução:** Adicionado um container com fundo cinza escuro (`bg-gray-900`) e bordas arredondadas (`rounded-lg`) ao redor do logo em ambos os locais.
  - **Resultado:** O logo agora tem uma aparência consistente e profissional em todas as páginas, independente do fundo.
  - **Arquivos modificados:**
    - `/app/frontend/src/components/Layout.js`
    - `/app/frontend/src/components/CompanySelector.js`

### 02/2026 - Iteration 23 (04/02/2026)
- ✅ **PERSISTÊNCIA DO CONTEXTO DE EMPRESA/COMPETÊNCIA CORRIGIDA**
  - **Problema:** A seleção de empresa e competência feita no seletor global não persistia ao navegar entre as páginas. O usuário precisava selecionar novamente a empresa em cada página.
  - **Solução:** Refatorado o arquivo `Reports.js` para usar diretamente os valores do contexto global (`ctxCompany` e `ctxCompetencia`) ao invés de manter estado local separado.
  - **Mudanças:**
    - Removido `useState` de `selectedCompany` e `competencia` locais
    - Campos de Empresa e Competência na página de Relatórios agora são somente leitura, indicando que devem ser alterados no seletor global
    - Todas as páginas agora refletem a seleção feita no header
  - **Páginas verificadas:**
    - Dashboard ✅
    - Relatórios ✅
    - Documentos ✅
    - Validação Entrada ✅
    - Alertas CFOP ✅
    - Análise de Alíquotas de Saída ✅
    - Relatório de Divergências ✅
  - **Testes:** 100% frontend (16/16 testes passaram)
  - **Arquivos modificados:**
    - `/app/frontend/src/pages/Reports.js`

### 02/2026 - Iteration 22 (04/02/2026)
- ✅ **BARRA DE PROGRESSO NO UPLOAD DE XML IMPLEMENTADA**
  - **Backend com Server-Sent Events (SSE):**
    - `POST /api/xml/upload-init` - Inicializa sessão de upload, retorna `upload_id`
    - `GET /api/xml/upload-progress/{upload_id}` - Stream de progresso via SSE
    - `POST /api/xml/upload-stream` - Upload de arquivos com atualização de progresso em tempo real
  - **Frontend com feedback visual:**
    - Barra de progresso fixa no topo da tela durante o upload
    - Exibe porcentagem de progresso em tempo real
    - Contador de arquivos processados vs total ("X de Y arquivos processados")
    - Etapa atual do processamento ("Lendo arquivo...", "Validando...", "Classificando...", "Salvando...")
    - Nome do arquivo sendo processado
    - Botão mostra "Processando... X%" com spinner animado
    - Inputs desabilitados durante o upload para evitar alterações
    - Área de upload mostra "Upload em andamento..."
  - **Testes:** 100% backend (7/7) e 100% frontend verificado
  - **Arquivos modificados:**
    - `/app/backend/server.py` - 3 novos endpoints SSE
    - `/app/frontend/src/pages/UploadXML.js` - Componente ProgressBar e lógica SSE

- ✅ **DOWNLOAD AUTOMÁTICO DO SIEG COM PROGRESSO SSE**
  - **Backend com processamento completo:**
    - `POST /api/sieg/sync-init/{company_id}` - Inicializa sessão de sincronização
    - `GET /api/sieg/sync-progress/{sync_id}` - Stream de progresso via SSE
    - `POST /api/sieg/sync-execute/{sync_id}` - Executa a sincronização com IA
    - XMLs baixados são processados com a mesma lógica do upload manual:
      - Classificação de produtos com IA/cache
      - Cálculo de CST PIS/COFINS
      - Conversão automática de CFOP
      - Verificação de duplicatas
  - **Frontend melhorado:**
    - Barra de progresso na seção SIEG do modal de seleção
    - Mostra etapa atual ("Baixando XMLs...", "Processando entrada X/Y...")
    - Resultado detalhado com entradas/saídas processadas
    - Estatísticas de classificação (cache/regras/IA)
    - Indicador de notas duplicadas
  - **Arquivos modificados:**
    - `/app/backend/server.py` - 3 novos endpoints para SIEG SSE
    - `/app/frontend/src/context/AppContext.js` - Função syncFromSieg com SSE
    - `/app/frontend/src/components/CompanySelector.js` - UI de progresso

### 02/2026 - Iteration 21 (04/02/2026)
- ✅ **Reclassificação Manual na Validação de Entrada**
  - Botão "Reclassificar" nos produtos (visão Por NF-e)
  - **Botão "Reclassificar (N)" na visão Por Produto** - aplica em todas as ocorrências
  - Modal com seleção de natureza (REVENDA/INSUMO/DESPESA/COMBUSTÍVEL)
  - **CFOP automatizado baseado na natureza selecionada:**
    - REVENDA → 1102/2102
    - INSUMO → 1101/2101
    - DESPESA → 1556/2556
    - COMBUSTÍVEL → 1653/2653
  - **Opção "Editar manualmente"** para customizar o CFOP
  - Regra memorizada automaticamente para futuras importações
  - Justificativa opcional
  
- ✅ **Apuração PIS/COFINS com Alíquotas de Lucro Real Corrigidas**
  - **DÉBITOS (Saídas):**
    - Lucro Real: PIS 1,65% | COFINS 7,6%
    - Lucro Presumido: PIS 0,65% | COFINS 3%
  - **CRÉDITOS (Entradas):**
    - Calculados com alíquotas de 1,65% (PIS) e 7,6% (COFINS)
  - Correção aplicada em:
    - Endpoint `/api/apuracao-pis-cofins/{company_id}`
    - Endpoint `/api/apuracao-periodo/{company_id}`

### 02/2026 - Iteration 20 (04/02/2026)
- ✅ **Integração com SIEG Soluções Implementada**
  - Nova seção "SIEG - Cofre de XMLs" no modal de seleção de empresa
  - Consulta automática ao selecionar empresa + competência
  - Mostra contagem de XMLs disponíveis (Entradas e Saídas)
  - Checkbox "Importar automaticamente ao confirmar"
  - Botão "Importar Agora" para sincronização manual
  - API Key configurada via variável de ambiente SIEG_API_KEY
  - Novos endpoints:
    - `GET /api/sieg/count/{company_id}` - Conta XMLs disponíveis
    - `POST /api/sieg/sync/{company_id}` - Baixa e importa XMLs
    - `GET /api/sieg/status` - Verifica configuração da API
  - Arquivo `sieg_service.py` criado para isolamento da integração

### 02/2026 - Iteration 19 (04/02/2026)
- ✅ **Classificação de CFOP por IA nas Entradas FUNCIONANDO**
  - Corrigido bug na integração com LlmChat (parâmetro `api_key` em vez de `model`)
  - IA usa GPT-4o via Emergent LLM Key para classificação semântica
  - Classifica produtos como REVENDA (1102), INSUMO (1101) ou DESPESA (1556)
  - Usa palavras-chave cadastradas na empresa para guiar a classificação
  - Match semântico: "SHOYU" → produto oriental → REVENDA
  - Match semântico: "DETERGENTE" → limpeza → DESPESA
- ✅ **SISTEMA DE CACHE INTELIGENTE IMPLEMENTADO**
  - **Cache de classificações:** Produtos já classificados são memorizados na collection `learned_rules`
  - **Performance otimizada:** 
    - Primeiro upload: Usa IA para produtos novos
    - Uploads seguintes: Usa cache (instantâneo, sem chamada IA)
  - **Estatísticas de performance no relatório:**
    - ⚡ X do cache (produtos memorizados)
    - 📋 Y de regras (keywords exatas)
    - 🤖 Z da IA (novos produtos)
  - **Normalização inteligente:** Cache funciona mesmo com variações na descrição
- ✅ **Relatório de Conversões na Tela de Upload**
  - Exibe lista de todos os produtos convertidos
  - Mostra CFOP original → CFOP convertido
  - Badge colorido com categoria (REVENDA/INSUMO/DESPESA)
  - Indicador de origem: ⚡ Cache | 📋 Regra | 🤖 IA
  - Justificativa explicando o motivo da classificação

### 02/2026 - Iteration 18
- ✅ **Tabela NCMs Alíquota Zero atualizada (Tabela 4.3.13 SPED v1.33)**
  - Mais de 50 prefixos NCM (4 dígitos) e 80+ NCMs completos (8 dígitos)
  - Inclui: carnes, cereais, farinhas, medicamentos, combustíveis, papel, informática, etc.
- ✅ **CST PIS/COFINS extraído corretamente do XML**
  - Extração das tags `<PIS>` e `<COFINS>` em vez do ICMS
  - Usado nas entradas (CST 50/73) e saídas (CST 01/06)
- ✅ **Coluna CST PIS/COFINS na Apuração PIS/COFINS**
  - Inserida após coluna Valor, com badge visual destacado
  - Ordenável por clique no cabeçalho
  - Incluída na exportação CSV
- ✅ **Alertas de CFOP no Upload de Entradas**
  - Detecta CFOPs de operações distintas (5910 bonificação, 5949, 5122, etc.)
  - Exibe lista detalhada após o upload
  - Indica quantos arquivos/produtos têm alertas
- ✅ **Nova página "Divergências Saída"**
  - Relatório de produtos de saída com NCM alíquota zero mas tributados
  - Calcula impacto fiscal (PIS/COFINS cobrados indevidamente)
  - Exportação para CSV
  - Endpoint `/api/relatorio-divergencias-saida/{company_id}`

### 02/2026 - Iteration 17
- ✅ **Ordenação nas tabelas da Apuração PIS/COFINS**
  - Clique na coluna para ordenar crescente/decrescente
  - Indicador visual (▲/▼) mostra a ordenação atual
  - Todas as colunas são ordenáveis: CST/CFOP/NCM, Valor, PIS, COFINS, Qtd
- ✅ **CST de PIS/COFINS em vez de ICMS**
  - Extração de `cst_pis` e `cst_cofins` das tags `<PIS>` e `<COFINS>` do XML
  - Atualizado tanto para NF-e quanto NFC-e
  - Usado nos endpoints de apuração PIS/COFINS e Apuração do Período
- ✅ **Nova página Alertas CFOP**
  - Detecta documentos de entrada com CFOPs de operações distintas de venda
  - CFOPs como 5910, 5949, 5122, 5201, etc. são alertados
  - Usuário pode escolher: "Manter natureza" ou "Converter para compra"
  - Endpoint `/api/alertas-cfop/{company_id}` criado
  - Endpoint `/api/converter-cfop` para aplicar conversões
- ✅ **Menu atualizado** com item "Alertas CFOP"

### 02/2026 - Iteration 16
- ✅ **BUG CRÍTICO CORRIGIDO: Modal de seleção de empresa fechava sozinho**
  - O problema era que ao abrir o modal, `fetchCompanies()` era chamado e ao atualizar o estado de `companies`, um `useEffect` fechava o modal automaticamente
  - Adicionada flag `initialLoadDone` para garantir que o comportamento de auto-fechar só acontece na primeira carga
- ✅ **Seção de Transferências na Apuração PIS/COFINS**
  - Nova seção exibe CFOPs de transferência separadamente (1152, 1556, etc.)
  - Alerta explicativo: "CFOPs de transferência não geram direito a crédito nem obrigação de débito"
  - Exibe valor total de transferências de entrada e saída
- ✅ **Coluna CST adicionada na Apuração do Período**
  - Tabela de entradas e saídas agora mostra coluna CST para cada CFOP
  - Exportação CSV também inclui a coluna CST
- ✅ **Bug de código duplicado corrigido no backend**
  - Removido código duplicado no endpoint `/api/apuracao-pis-cofins` que causava erro de sintaxe

### 02/2026 - Iteration 15
- ✅ **Classificação por CST na Apuração PIS/COFINS**:
  - Adicionado toggle "Por CST" / "Por CFOP" / "Por NCM"
  - CSTs usados:
    - **Saída tributada**: CST 01 (Operação Tributável com Alíquota Básica)
    - **Saída alíquota zero**: CST 06 (Operação Tributável a Alíquota Zero)
    - **Entrada com crédito**: CST 50 (Operação com Direito a Crédito)
    - **Entrada alíquota zero**: CST 73 (Operação de Aquisição a Alíquota Zero)
  - Títulos das seções mostram o CST correspondente

### 02/2026 - Iteration 14
- ✅ **Corrigido bug das páginas de Apuração**: Endpoints agora usam `db.xml_documents` (antes usavam `db.documents` que não existe)
- ✅ **Corrigido campo de valor**: Agora usa `valor_total` ou `v_prod` corretamente
- ✅ **Suporte a documentos sem CFOP**: Documentos sem CFOP são agrupados como "SEM CFOP (ENTRADA)" ou "SEM CFOP (SAIDA)"
- ✅ **Determinação de entrada/saída**: Usa CFOP quando disponível, ou `tipo_operacao` do documento como fallback

### 02/2026 - Iteration 13
- ✅ **Corrigido bug do menu lateral**: Agora apenas o item selecionado fica destacado (vermelho), não itens com nomes similares
- ✅ **Corrigido bug de contabilização na Validação**: Contadores agora só consideram aprovações de documentos que ainda existem (após exclusão)
- ✅ **Editar/Excluir Memorizações da IA**: Nova interface para gerenciar regras aprendidas
  - Botão "Limpar Tudo" para excluir todas as regras de uma empresa
  - Botão de editar em cada regra (alterar categoria e CFOP)
  - Botão de excluir em cada regra
  - Modo de edição inline com campos de categoria e CFOP

### 02/2026 - Iteration 12
- ✅ **Corrigido bug na exclusão em lote**: Agora respeita o filtro de tipo (Entrada/Saída/Todos)
- ✅ **Botão de exclusão dinâmico**: Mostra "Apagar Entradas", "Apagar Saídas" ou "Apagar Todos" conforme filtro
- ✅ **Removido resumo de "Validados"** na página de Documentos - Substituído por contagem de Entradas/Saídas
- ✅ **Nova página "Apuração PIS/COFINS"**: Apuração inteligente com base em CFOP e NCM
  - Operações com direito a crédito vs. alíquota zero
  - Operações com débito vs. alíquota zero
  - Relatório por CFOP e por NCM
  - Considera regime tributário (Lucro Real = direito a créditos)
  - Resumo da apuração (Crédito, Débito, A Pagar)
  - Exportação CSV

### 02/2026 - Iteration 11
- ✅ **ICMS-ST desconsiderado nos créditos**: Mercadorias com ICMS Substituição Tributária (CST 10, 30, 60, 70, 201, 202, 203, 500) não geram mais crédito de ICMS no Dashboard
- ✅ Dashboard mostra linha "ICMS-ST (sem crédito)" quando houver valor desconsiderado
- ✅ **Corrigido bug do AppContext**: Modal de seleção de empresa agora recarrega empresas ao abrir
- ✅ **Competência com valor inicial**: Campo de competência no seletor agora preenche automaticamente com mês/ano atual
- ✅ **PIS/COFINS com alíquotas do Lucro Real**: Para empresas do Lucro Real, os débitos de PIS (1.65%) e COFINS (7.6%) são calculados com as alíquotas corretas do regime não-cumulativo
- ✅ **Detecção de divergências**: Quando o valor no XML diverge das alíquotas esperadas do Lucro Real, um alerta é exibido mostrando a alíquota do XML vs esperada e a diferença em R$
- ✅ **Removida seção de validação do Dashboard**: Notas de saída não precisam de validação, então a seção foi removida
- ✅ **Nova página "Apuração do Período"**: Resumo por CFOPs com entradas (em cima) e saídas (embaixo), colunas: CFOP, Valor, BC ICMS, ICMS, PIS, COFINS, com subtotais e exportação CSV

### 02/2026 - Iteration 10
- ✅ Implementada análise comparativa Lucro Presumido vs. Lucro Real no Dashboard
- ✅ Auto-preenchimento de competência nas páginas Upload XML, Reclassificação IA e Exportar SPED
- ✅ Verificado que filtro entrada/saída nos relatórios funciona corretamente
- ✅ Todas as funcionalidades testadas e aprovadas (100% backend, 100% frontend)
