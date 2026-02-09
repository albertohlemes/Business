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

### 2026-02-11 (Sessão Atual)
- ✅ **CORRIGIDO: Cálculo do DAS no Dashboard do Simples Nacional**
  - O valor do DAS estava retornando R$ 0,00 mesmo com faturamento
  - Causa: Descontos de ICMS-ST e PIS/COFINS calculados incorretamente
  - Solução: Fórmula corrigida para `desconto = valor_produtos × alíquota_efetiva × (% tributo / 100)`
  - Resultado: DAS da E.L.M. em 01/2026 = R$ 6.173,67 (verificado por testes automatizados)
- ✅ Adicionadas funções `is_ncm_monofasico` e `is_ncm_cesta_basica` para melhor classificação
- ✅ Separação de produtos em 3 categorias: ST, monofásicos, alíquota zero
- ✅ Proteção: descontos não podem exceder o valor bruto do DAS
- ✅ Criado teste automatizado: `/app/backend/tests/test_simples_nacional_das.py`
- 🔄 Modal de seleção de empresa: melhorada lógica de fechamento (em validação)

### 2026-02-09 (Sessão 2)
- ✅ Alertas de CFOP agrupados por CFOP (não por documento)
- ✅ Ação em lote para classificação de CFOPs
- ✅ Edição manual de CFOP com campo de input
- ✅ Novos endpoints: `/alertas-cfop/agrupado`, `/alertas-cfop/resolver-grupo`

### 2026-02-09 (Sessão 1)
- ✅ Adicionada barra de progresso com contador tomando café
- ✅ Corrigido erro de exportação de relatórios (io not defined)
- ✅ Refeito frontend dos Alertas de CFOP
- ✅ Adicionado upload de logo da empresa
- ✅ Adicionado aviso no RET para dados incompletos
- ✅ Removidos arquivos obsoletos (AlertasCfop.js, ClassificacaoPage.js)

## Backlog

### P0 - Crítico
- [x] ~~Corrigir cálculo do DAS no Simples Nacional~~ ✅ CONCLUÍDO

### P1 - Alta Prioridade
- [ ] Upload de Certificado Digital (.pfx) - backend
- [ ] Integração SIEG - aguardando chave válida
- [ ] Corrigir modal de seleção de empresa (aparece em páginas inesperadas)
- [ ] Corrigir exportação de relatórios (problema recorrente)

### P2 - Média Prioridade
- [ ] Logo da empresa nos relatórios exportados
- [ ] Ordenação em todas as colunas das tabelas

### P3 - Baixa Prioridade
- [ ] Refatorar server.py em routers
- [ ] Sistema de licenças comerciais
- [ ] Dashboard de estatísticas para Master

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
