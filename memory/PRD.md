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

### ✅ Gestão de Empresas
- Listagem de empresas cadastradas
- Cadastro de novas empresas com campos completos (regime tributário, atividades, etc.)
- Busca automática de dados da Receita Federal via CNPJ
- **Exclusão de empresas** - Funcionando (apenas empresas sem documentos)

### ✅ **Dashboard Completo** (04/02/2026)
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
- Links rápidos para Análise Tributária e Relatórios

### ✅ Upload de XML com Validação Inteligente
- Upload em lote de arquivos XML de notas fiscais
- **Detecção automática de tipo:** NF-e, NFC-e (cupom) ou NFS-e (serviço)
- **Validação de CNPJ** - Rejeita XMLs de empresas diferentes
- **Validação de Competência** - Rejeita XMLs com data fora do período
- **Relatório detalhado de erros** - Mostra resumo completo
- Conversão automática de CFOP

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

### ✅ **Validação de Classificações** (04/02/2026)
- Página dedicada: `/validation`
- **Apenas NF-e de Entrada** - Saídas não precisam de validação de CFOP
- **Modo Por NF-e:** Valida por documento
- **Modo Por Produto:** Produtos agrupados por código
  - Botão "Selecionar Todos" / "Limpar Seleção"
  - Botão "Aprovar Selecionados" para aprovação em lote
- **Header verde com estatísticas**: Aprovados, Pendentes, Total
- **Explicação "Como funciona?"**: Aprovar = concordar, Alterar = mudar CFOP
- **Checkbox individual** para aprovar cada produto
- **Botões em lote**: "Aprovar Todos" e "Limpar" por documento
- **Filtro "Mostrar só pendentes"** para focar nos itens não revisados
- Persistência de aprovações no localStorage por empresa/competência

### ✅ Relatórios por Competência
- Filtro de competência nos relatórios gerenciais
- **Exportar CSV** - Funcionando com parsing robusto de valores
- BOM UTF-8 para caracteres especiais

### ✅ Exportação SPED por Competência
- Seletor de competências disponíveis
- Exporta apenas documentos da competência selecionada

### ✅ Reset da Base de Dados
- Endpoint `POST /api/db/reset` para zerar todas as tabelas

### ✅ **Menu Reorganizado** (04/02/2026)
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
  - Empresas: `/api/companies` (GET, POST, DELETE)
  - CNPJ: `/api/cnpj/{cnpj}`
  - Upload XML: `/api/xml/upload`
  - Relatórios: `/api/reports/by-product/{id}`, `/api/reports/by-ncm/{id}`
  - SPED: `/api/sped/export/{id}`
  - Análise Tributária: `/api/ai/analise-tributaria`
  - Reclassificação: `/api/ai/reclassify`, `/api/ai/validate-taxes`
  - Reset: `/api/db/reset`

### Frontend (React)
- Context API para estado global (empresa/competência)
- Componentes: Layout.js, CompanySelector.js, AppContext.js
- Páginas: Dashboard, AnaliseTributaria, Companies, UploadXML, Documents, ReclassificationAI, Validation, Reports, ExportSPED

### Integrações
- Brasil API - dados de empresas por CNPJ
- **OpenAI GPT-4o** - análises tributárias e reclassificação via Emergent LLM Key

## Testes (04/02/2026)
- Frontend iteration_5: 100% - Menu, Excluir Empresa, Exportar CSV, Análise Tributária
- Frontend iteration_6: 100% - UX Validação e Reclassificação IA (8 features)

## Credenciais de Teste
- Email: admin@test.com
- Senha: test123

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Implementar upload de **NFC-e** (cupom fiscal) e **NFS-e** (nota de serviço)
- [ ] No relatório de erros, mostrar o **nome do arquivo** que falhou

### P2 - Média Prioridade
- [ ] Dashboard com resumo de análise tributária
- [ ] Histórico de alterações (audit log) para reclassificações
- [ ] Testar exportação SPED com dados reais

### P3 - Baixa Prioridade
- [ ] Refatorar backend em módulos separados (routes, models, services)
- [ ] Melhorar UX do modal de seleção de empresa
