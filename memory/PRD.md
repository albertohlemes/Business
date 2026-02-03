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

### ✅ Páginas Adicionais
- Documentos Fiscais - listagem de XMLs importados
- Validação de CFOPs
- Relatórios Gerenciais (por Produto e por NCM)
- Exportar SPED Fiscal

## Arquitetura Técnica

### Backend (FastAPI)
- `/app/backend/server.py` - API monolítica
- MongoDB para persistência
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

### Frontend (React)
- `/app/frontend/src/pages/`
  - Login.js - autenticação
  - Companies.js - gestão de empresas
  - UploadXML.js - upload e análise
  - Documents.js - listagem de documentos
  - Validation.js - validação CFOPs
  - Reports.js - relatórios gerenciais
  - ExportSPED.js - exportação SPED

### Integrações
- Brasil API (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) - dados de empresas

## Status dos Issues (03/02/2026)

| Issue | Status | Descrição |
|-------|--------|-----------|
| Botão "Salvar Empresa" | ✅ RESOLVIDO | Funcionando corretamente |
| Busca CNPJ | ✅ RESOLVIDO | Preenche formulário automaticamente |
| Campo produtos_despesa | ✅ IMPLEMENTADO | Adicionado ao formulário |
| Seletor de competência | ✅ IMPLEMENTADO | Formato MM/AAAA |
| Validação duplicados | ✅ IMPLEMENTADO | Por chave NFe + competência |
| Relatório conversão CFOP | ✅ IMPLEMENTADO | Exibido após upload |

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Seletor global de empresa/competência no Layout
- [ ] Melhorar página de Relatórios Gerenciais

### P2 - Média Prioridade
- [ ] Dashboard com métricas fiscais
- [ ] Histórico de alterações de CFOP para auditoria
- [ ] Finalizar exportação SPED Fiscal (testar formato)

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
