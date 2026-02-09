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

### 2026-02-12 (Sessão Atual)
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
  - Colunas ordenáveis: CFOP, Status, Qtd, Valor Total, BC ICMS, Valor ICMS
  - CFOP em ordem crescente por padrão
  - Indicadores visuais: ↑ (ascendente), ↕ (ordenável)
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

### P1 - Alta Prioridade (MAIORIA CONCLUÍDA)
- [x] ~~Modal de edição de produtos clicável~~ ✅
- [x] ~~Links de NFs nos produtos~~ ✅
- [x] ~~Divergências PIS/COFINS só saídas~~ ✅
- [x] ~~Indicadores Lucro Presumido~~ ✅
- [x] ~~Vilões e Oportunidades ICMS com % entrada/saída~~ ✅
- [x] ~~Insights IA no menu Indicadores~~ ✅
- [x] ~~Gráfico proporção vendas no Dashboard Simples~~ ✅
- [x] ~~Relatório exportação por agrupamento de produtos~~ ✅
- [ ] Modal de seleção de empresa (bug de usabilidade - afeta apenas testes automatizados)

### P2 - Média Prioridade
- [x] ~~Ordenação em Companies~~ ✅
- [ ] Ordenação nas demais páginas (Documents já tem)
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
