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

### 2. Importação de Documentos
- Upload de XMLs (NF-e, NFC-e, CT-e, NFS-e)
- Importação via IA (PDFs, imagens)
- Integração com SIEG (BLOQUEADO - chave inválida)
- **Barra de progresso flutuante** ✅ (não bloqueia navegação)
- Validação automática de CFOP por operação
- **Filtro de divergências** ✅ (Todos/Divergente/OK)

### 3. Visualização de NF-e (NOVO!)
- **Modal detalhado de documento** ✅
- Comparativo Capa NF × Produtos
- Indicadores visuais de divergência (verde/vermelho)
- Tabela completa de produtos com CFOP, CST, NCM, bases, impostos

### 4. Alertas de CFOP
- **Agrupamento por CFOP** para ação em lote ✅
- Botões de ação: Manter, Converter, Editar manualmente
- **Atualização de CFOP ao classificar via IA** ✅
- Ação individual ou em lote
- Lista de NFs por produto

### 5. Apurações Fiscais
- ICMS, PIS/COFINS, ISS, IPI
- DIFAL para Simples Nacional
- Cálculo de Fator R
- **DAS corrigido** ✅ (cálculo de descontos ST/monofásico)
- **Indicadores para Lucro Presumido** ✅

### 6. RET - Comparativo de Regimes
- Comparação entre Simples, Presumido e Real
- DRE para Lucro Real
- Aviso de dados incompletos
- Projeção anual

### 7. Classificação Inteligente
- **Modal de edição de produto** ✅
- **Links para NFs do produto** ✅
- Classificação atualiza CFOP automaticamente
- Comandos de IA com atualização de CFOP

### 8. Divergências PIS/COFINS
- **Filtra apenas notas de SAÍDA** ✅

### 9. Exportação
- SPED Fiscal
- Relatórios por alíquota (ICMS, PIS, COFINS)
- CSV de entradas/saídas

## Arquitetura

### Backend (FastAPI)
- `/app/backend/server.py` - Monólito principal
- `/app/backend/services/` - Serviços auxiliares
  - `document_ai.py` - Processamento com IA
  - `simples_nacional_calculator.py` - Cálculos Simples

### Frontend (React)
- `/app/frontend/src/pages/` - Páginas principais
- `/app/frontend/src/components/` - Componentes reutilizáveis
  - `DocumentDetailModal.js` - Modal de detalhes NF ✅ (NOVO)
  - `SortableTable.js` - Componente de ordenação ✅ (NOVO)
- `/app/frontend/src/context/` - Contextos (App, Upload)

## Changelog

### 2026-02-10 (Sessão 10 - Melhorias IA, Vilões/Oportunidades e Permissões)

**Melhorias na IA de Classificação:**
- ✅ **Análise de produtos vendidos** - A IA agora busca produtos das notas de saída para inferir o que a empresa comercializa
- ✅ **Palavras-chave expandidas** - Correspondência semântica (ex: "construção" → cimento, argamassa, tijolo)
- ✅ **Contexto enriquecido** - Prompt da IA inclui lista de até 50 produtos vendidos

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
- [ ] Importação de CT-e para transportadoras
- [ ] Ordenação nas páginas restantes (ISS, DIFAL, SimplesNacionalDashboard)
- [ ] Logo nos relatórios exportados
- [ ] Upload de Certificado Digital (.pfx)

### P3 - Baixa Prioridade
- [ ] Refatorar server.py em routers
- [ ] Sistema de licenças comerciais
- [ ] Dashboard estatísticas Master
- [ ] Integração SIEG (BLOQUEADO - chave inválida)

## Credenciais de Teste
- Email: admin@test.com
- Senha: 123456

## Endpoints de Alertas CFOP

### GET /api/alertas-cfop/{company_id}/agrupado
Retorna alertas agrupados por CFOP para ação em lote.

### POST /api/alertas-cfop/resolver-grupo
Resolve todos os alertas de um CFOP específico.
Parâmetros: company_id, competencia, cfop_atual, novo_cfop, salvar_regra

### POST /api/alertas-cfop/resolver-individual
Resolve um alerta específico de um produto.
Parâmetros: documento_id, produto_idx, novo_cfop
