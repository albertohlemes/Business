# Business Contabilidade - Sistema de Fechamento Fiscal

## Problema Original
O proprietário do escritório "Business Contabilidade" precisa de um site para otimizar o processo de fechamento fiscal de seus clientes.

## Funcionalidades Implementadas

### ✅ Autenticação
- Login com email e senha
- Registro de novos usuários
- Controle de acesso por role (admin/client)

### ✅ **NOVO: Logo e Identidade Visual** (04/02/2026)
- Logo da Business Contabilidade no header
- Logo no modal de seleção de empresa
- Cores da marca: Vermelho e Preto

### ✅ **NOVO: Seletor Global de Empresa/Competência** (04/02/2026)
- Botão no header mostrando empresa e competência selecionada
- Modal para trocar empresa e competência a qualquer momento
- Seleção persiste entre navegações (localStorage)
- Formato de competência: MM/AAAA

### ✅ Gestão de Empresas
- Listagem de empresas cadastradas
- Cadastro de novas empresas com campos completos
- Busca automática de dados da Receita Federal via CNPJ
- Exclusão de empresas

### ✅ Upload de XML com Validação Inteligente
- Upload em lote de arquivos XML de notas fiscais
- **Validação de CNPJ** - Rejeita XMLs de empresas diferentes
- **Validação de Competência** - Rejeita XMLs com data fora do período
- **Relatório detalhado de erros** - Mostra resumo completo
- Conversão automática de CFOP

### ✅ **NOVO: Análise Tributária Inteligente por IA** (04/02/2026)
- Página dedicada: `/analise-tributaria`
- **Indicadores calculados:**
  - Percentual de compras interestaduais vs internas
  - Fornecedores do Simples Nacional (sem direito a crédito)
  - Diferencial de alíquotas (entrada vs saída)
  - Clientes do Simples Nacional
  - Markup médio praticado
  - Carga tributária efetiva
  - Total de créditos e débitos
- **Alertas e Pontos de Atenção:**
  - Alertas críticos, de atenção e oportunidades
  - Impacto estimado em valores
  - Base legal quando aplicável
- **Recomendações Estratégicas:**
  - Sugestões de economia fiscal
  - Economia potencial estimada
  - Prazo de implementação
- **Análise de Markup:**
  - Markup mínimo, médio e máximo
  - Análise da margem vs carga tributária
- **Exportar análise em TXT**

### ✅ Reclassificação com IA
- Visualização por NF-e ou por Produtos agrupados
- Comando para IA reclassificar em lote
- Sistema de aprendizado que memoriza correções
- Validação de PIS/COFINS/ICMS com base legal (melhorado para alíquota zero)

### ✅ Relatórios por Competência
- Filtro de competência nos relatórios gerenciais
- **Exportar CSV corrigido** - Funciona com valores undefined
- BOM UTF-8 para caracteres especiais

### ✅ Exportação SPED por Competência
- Seletor de competências disponíveis
- Exporta apenas documentos da competência selecionada

### ✅ Reset da Base de Dados
- Endpoint `POST /api/db/reset` para zerar todas as tabelas

## Arquitetura Técnica

### Backend (FastAPI)
- `/app/backend/server.py` - API monolítica
- MongoDB para persistência
- **Integração com IA**: OpenAI GPT-4o via Emergent LLM Key
- Endpoints principais:
  - Autenticação: `/api/auth/login`, `/api/auth/register`
  - Empresas: `/api/companies` (GET, POST, DELETE)
  - CNPJ: `/api/cnpj/{cnpj}`
  - Upload XML: `/api/xml/upload` (com validação CNPJ/competência)
  - Relatórios: `/api/reports/by-product/{id}`, `/api/reports/by-ncm/{id}`
  - SPED: `/api/sped/export/{id}`
  - **Análise Tributária IA**: `/api/ai/analise-tributaria`
  - Reclassificação: `/api/ai/reclassify`, `/api/ai/validate-taxes`
  - Reset: `/api/db/reset`

### Frontend (React)
- Context API para estado global (empresa/competência)
- Componentes:
  - `Layout.js` - Header com logo e seletor
  - `CompanySelector.js` - Modal de seleção
  - `AppContext.js` - Contexto global
- Páginas:
  - Dashboard, **AnaliseTributaria**, Companies, UploadXML
  - Documents, ReclassificationAI, Validation, Reports, ExportSPED

### Integrações
- Brasil API - dados de empresas
- **OpenAI GPT-4o** - análises tributárias e reclassificação

## Testes (04/02/2026)
- Backend: 100% (16/16 testes)
- Frontend: 100% (todas funcionalidades)

## Credenciais de Teste
- Email: admin@test.com
- Senha: test123

## Próximas Tarefas (Backlog)

### P2 - Média Prioridade
- [ ] Dashboard com resumo de análise tributária
- [ ] Histórico de alterações para auditoria
- [ ] Testar exportação SPED com dados reais

### P3 - Baixa Prioridade
- [ ] Refatorar backend em módulos separados
- [ ] Melhorar UX do modal de seleção (aparecer automaticamente)
