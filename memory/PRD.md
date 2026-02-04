# Business Contabilidade - Sistema de Fechamento Fiscal

## Problema Original
O proprietário do escritório "Business Contabilidade" precisa de um site para otimizar o processo de fechamento fiscal de seus clientes.

## Funcionalidades Implementadas

### ✅ Autenticação
- Login com email e senha
- Registro de novos usuários
- Controle de acesso por role (admin/client)

### ✅ Gestão de Empresas
- Listagem de empresas cadastradas
- Cadastro de novas empresas com campos:
  - CNPJ, Razão Social, Nome Fantasia
  - CNAE Principal e descrição
  - Inscrição Estadual
  - Endereço (Cidade/UF)
  - Produtos Comercializados (para classificação REVENDA)
  - Insumos de Produção (para classificação INSUMO)
  - **Produtos de Despesa** (para classificação DESPESA)
- Busca automática de dados da Receita Federal via CNPJ (API Brasil)
- Exclusão de empresas

### ✅ Upload de XML com Análise Inteligente
- Upload em lote de arquivos XML de notas fiscais
- Seletor de competência (mês/ano) - formato MM/AAAA
- Tipo de operação (Entrada/Saída)
- **NOVA: Validação de CNPJ** - Rejeita XMLs que não pertencem à empresa selecionada
- **NOVA: Validação de Competência** - Rejeita XMLs com data fora da competência selecionada
- Validação de notas duplicadas por chave NFe e competência
- Conversão automática de CFOP baseada em:
  - Classificação do produto (REVENDA, INSUMO, DESPESA, COMBUSTÍVEL)
  - Substituição Tributária (ST)
  - Operações interestaduais (prefixo 1 ou 2)
  - Transferências entre filiais
- **NOVO: Relatório detalhado de erros** - Mostra resumo com:
  - Total enviados, importados, duplicados
  - Rejeitados por CNPJ errado (com detalhes de emitente/destinatário)
  - Rejeitados por competência diferente (com data de emissão)
  - Erros de processamento

### ✅ Relatório de Conversão de CFOP
- Exibido automaticamente após upload
- Mostra: CFOP Original → CFOP Convertido
- Classificação aplicada (REVENDA, INSUMO, DESPESA)
- Critério/motivo da conversão

### ✅ Reclassificação com IA
- Página dedicada: `/reclassification`
- Visualização por NF-e (expandível) ou por Produtos (agrupados por código)
- Campo de comando para IA reclassificar produtos em lote
- Edição manual com salvamento de regras aprendidas
- Sistema de aprendizado que memoriza correções
- **MELHORADO: Validação de PIS/COFINS/ICMS com base legal**
  - Considera alíquota zero de PIS/COFINS para produtos da cesta básica
  - Usa o estado da empresa (UF) para calcular alíquotas de ICMS corretas
  - NCMs com alíquota zero são identificados e não apontados como erro

### ✅ Exportação SPED por Competência
- Seletor de competências disponíveis
- Exporta apenas documentos da competência selecionada

### ✅ Relatórios por Competência
- Filtro de competência nos relatórios gerenciais
- Exportação CSV com nome incluindo a competência

### ✅ Reset da Base de Dados
- Endpoint `POST /api/db/reset` para zerar todas as tabelas (exceto usuários)

### ✅ Páginas Adicionais
- Documentos Fiscais - listagem de XMLs importados
- Validação de CFOPs
- Relatórios Gerenciais (por Produto e por NCM)
- Exportar SPED Fiscal

## Arquitetura Técnica

### Backend (FastAPI)
- `/app/backend/server.py` - API monolítica
- MongoDB para persistência
- **Integração com IA**: OpenAI GPT-4o via Emergent LLM Key
- Endpoints principais:
  - `POST /api/auth/login` - autenticação
  - `POST /api/auth/register` - registro
  - `GET/POST /api/companies` - CRUD empresas
  - `DELETE /api/companies/{id}` - excluir empresa
  - `GET /api/cnpj/{cnpj}` - busca Receita Federal
  - `POST /api/xml/upload` - upload com análise e validação
  - `GET /api/xml/documents` - listagem documentos
  - `GET /api/reports/by-product/{company_id}` - relatório por produto
  - `GET /api/reports/by-ncm/{company_id}` - relatório por NCM
  - `GET /api/sped/export/{company_id}` - exportação SPED
  - `POST /api/db/reset` - zerar base de dados
  - `GET /api/reclassification/documents/{company_id}` - docs para reclassificação
  - `GET /api/reclassification/products/{company_id}` - produtos agrupados
  - `POST /api/ai/reclassify` - reclassificação com IA
  - `POST /api/ai/validate-taxes` - validação PIS/COFINS/ICMS
  - `POST /api/manual-reclassify` - reclassificação manual
  - `GET /api/learned-rules/{company_id}` - regras aprendidas

### Frontend (React)
- `/app/frontend/src/pages/`
  - Login.js - autenticação
  - Companies.js - gestão de empresas
  - UploadXML.js - upload e análise (com relatório de erros)
  - Documents.js - listagem de documentos
  - ReclassificationAI.js - reclassificação com IA
  - Validation.js - validação CFOPs
  - Reports.js - relatórios gerenciais (com filtro competência)
  - ExportSPED.js - exportação SPED (com seletor competência)

### Integrações
- Brasil API (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) - dados de empresas
- **OpenAI GPT-4o** via Emergent LLM Key - reclassificação e validação fiscal

## Status dos Issues (04/02/2026)

| Issue | Status | Descrição |
|-------|--------|-----------|
| Botão "Excluir Empresa" | ✅ RESOLVIDO | Backend funcionando, testado via curl |
| Validação CNPJ no upload | ✅ IMPLEMENTADO | Rejeita XMLs de outras empresas |
| Validação competência | ✅ IMPLEMENTADO | Rejeita XMLs de outras competências |
| Relatório de erros | ✅ IMPLEMENTADO | Resumo detalhado na tela |
| Alíquota zero PIS/COFINS | ✅ MELHORADO | IA considera NCMs da cesta básica |
| ICMS por estado | ✅ MELHORADO | IA usa UF da empresa para alíquotas |
| Reset da base | ✅ IMPLEMENTADO | Endpoint /api/db/reset funcionando |

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Adicionar logo da Business Contabilidade (aguardando envio pelo usuário)
- [ ] Seletor global de empresa/competência no Layout

### P2 - Média Prioridade
- [ ] Dashboard com métricas fiscais
- [ ] Histórico de alterações de CFOP para auditoria
- [ ] Testar exportação SPED com dados reais de produção

### P3 - Baixa Prioridade
- [ ] Refatorar backend em módulos separados
- [ ] Implementar React Context para estado global

## Credenciais de Teste
- Email: admin@test.com
- Senha: test123
- Role: admin

## Design
- Cores da marca: Vermelho (#dc2626) e Preto
- Estilo: Clean e profissional
- Framework: TailwindCSS
