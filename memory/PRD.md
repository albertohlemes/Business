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
- Validação de notas duplicadas por chave NFe e competência
- Conversão automática de CFOP baseada em:
  - Classificação do produto (REVENDA, INSUMO, DESPESA, COMBUSTÍVEL)
  - Substituição Tributária (ST)
  - Operações interestaduais (prefixo 1 ou 2)
  - Transferências entre filiais

### ✅ Relatório de Conversão de CFOP
- Exibido automaticamente após upload
- Mostra: CFOP Original → CFOP Convertido
- Classificação aplicada (REVENDA, INSUMO, DESPESA)
- Critério/motivo da conversão

### ✅ **NOVO: Reclassificação com IA** (03/02/2026)
- **Nova página dedicada**: `/reclassification`
- **Visualização por NF-e**: Lista notas fiscais com produtos expandíveis
- **Visualização por Produtos**: Agrupa produtos por código com contagem de ocorrências
- **Numeração sequencial**: IDs únicos para notas e produtos dentro da competência
- **Comando para IA**: Campo de texto para instruir a IA (Ex: "Reclassifique produtos de limpeza como DESPESA")
- **Edição manual**: Permite corrigir CFOP e categoria de produtos individualmente
- **Sistema de aprendizado**: Todas as correções (manuais ou por IA) são memorizadas
- **Regras aprendidas**: Visualização das regras que a IA aprendeu para a empresa
- **Validação de PIS/COFINS/ICMS**: IA analisa impostos e retorna inconsistências com base legal

### ✅ **NOVO: Exportação SPED por Competência** (03/02/2026)
- Seletor de competências disponíveis baseado nos documentos importados
- Exporta apenas documentos da competência selecionada

### ✅ **NOVO: Relatórios por Competência** (03/02/2026)
- Filtro de competência nos relatórios gerenciais
- Exportação CSV com nome incluindo a competência

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
  - `POST /api/xml/upload` - upload com análise
  - `GET /api/xml/documents` - listagem documentos
  - `GET /api/reports/by-product/{company_id}` - relatório por produto
  - `GET /api/reports/by-ncm/{company_id}` - relatório por NCM
  - `GET /api/sped/export/{company_id}` - exportação SPED
  - **NOVOS:**
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
  - UploadXML.js - upload e análise
  - Documents.js - listagem de documentos
  - **ReclassificationAI.js** - reclassificação com IA (NOVA)
  - Validation.js - validação CFOPs
  - Reports.js - relatórios gerenciais (com filtro competência)
  - ExportSPED.js - exportação SPED (com seletor competência)

### Integrações
- Brasil API (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) - dados de empresas
- **OpenAI GPT-4o** via Emergent LLM Key - reclassificação e validação fiscal

## Status dos Issues (03/02/2026)

| Issue | Status | Descrição |
|-------|--------|-----------|
| Botão "Salvar Empresa" | ✅ RESOLVIDO | Funcionando corretamente |
| Busca CNPJ | ✅ RESOLVIDO | Preenche formulário automaticamente |
| Campo produtos_despesa | ✅ IMPLEMENTADO | Adicionado ao formulário |
| Seletor de competência | ✅ IMPLEMENTADO | Formato MM/AAAA |
| Validação duplicados | ✅ IMPLEMENTADO | Por chave NFe + competência |
| Relatório conversão CFOP | ✅ IMPLEMENTADO | Exibido após upload |
| Reclassificação com IA | ✅ IMPLEMENTADO | Nova página funcional |
| Validação PIS/COFINS/ICMS | ✅ IMPLEMENTADO | Com base legal |
| Exportação por competência | ✅ IMPLEMENTADO | SPED e Relatórios |

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
