# Portal DP - Departamento Pessoal

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## User Personas
- **Profissionais de DP**: Assistentes e analistas de departamento pessoal
- **Contadores**: Gestores responsáveis pela folha de pagamento
- **Clientes**: Empresas que terceirizam o DP para o escritório

## Core Requirements (Static)
1. **Dissídio Automatizado**: Upload de convenção coletiva → IA extrai reajustes → Prévia dos salários → Aprovação → Lançamento
2. **Admissões Inteligentes**: Upload de documentos → IA extrai dados → Preenche ficha automaticamente
3. **Recomposição de Médias**: Importação histórico 12-24 meses → Cálculo automático para férias/rescisão
4. **Validação de Folha**: Comparação com mês anterior + Comparação com relatório de apoio
5. **Conferência Informes de Rendimento**: Comparação eSocial vs SCI Único

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Emergent LLM (Gemini 2.5 Flash) + openpyxl (Excel)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **API Receita Federal**: ReceitaWS (gratuita)

## Implementado (05/02/2026)

### MVP Inicial
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas
- ✅ CRUD Colaboradores
- ✅ Dashboard com estatísticas

### Melhorias FiscalFlow
- ✅ Cadastro de empresa com busca na Receita Federal (API ReceitaWS)
- ✅ Formatação automática de CNPJ
- ✅ Preenchimento automático de razão social, fantasia, endereço, telefone, email
- ✅ Seletor de Empresa + Competência no header
- ✅ Modal de seleção estilo FiscalFlow com lista de empresas em cards
- ✅ Persistência de seleção no localStorage

### Funcionalidade de Admissão eSocial
- ✅ Formulário completo de cadastro de colaboradores com template eSocial
- ✅ 5 abas organizadas: Cadastrais, Documentos, Contrato, Bancários, Dependentes
- ✅ Todos os campos da Ficha de Admissão eSocial implementados (60+ campos)
- ✅ Extração automática por IA de documentos (PDF, JPG, PNG, Excel)
- ✅ Suporte a documentos manuscritos e escaneados
- ✅ Modal de revisão de dados extraídos antes de salvar

### Validação de Folha com Relatório de Apoio
- ✅ **Aba 1 - Análise da Folha**: Análise simples da folha de pagamento
- ✅ **Aba 2 - Comparar com Apoio**: Comparar holerite com relatório de apoio (email, planilha, imagem, PDF)
- ✅ IA compara os dois documentos e identifica divergências
- ✅ Exibição de divergências com valores lado a lado

### Automação do Dissídio Coletivo (MELHORADA)
- ✅ Upload de convenção coletiva (PDF)
- ✅ Extração por IA dos dados (sindicato, percentual, data-base, piso salarial)
- ✅ Criação do dissídio com dados extraídos
- ✅ **NOVO: Modal de prévia com tabela de colaboradores afetados**
  - Salário atual
  - **Percentual de reajuste**
  - Diferença em R$
  - Novo salário
  - TOTAL geral
- ✅ **NOVO: Botão de download Excel da prévia**
- ✅ Fluxo de aprovação/rejeição
- ✅ Aplicação automática do reajuste nos salários após aprovação

### Comparação de Informes de Rendimento (ATUALIZADA)
- ✅ Comparação **eSocial vs SCI Único**
- ✅ Modal com dois dropzones (eSocial e SCI Único)
- ✅ IA identifica divergências em:
  - Rendimentos tributáveis e isentos
  - IR retido na fonte
  - INSS e FGTS
  - 13º salário e férias
  - Funcionários presentes em apenas um sistema
- ✅ Histórico de comparações

### Relatórios Exportáveis em Excel (NOVO)
- ✅ **Página de Relatórios** com 3 tipos de exportação:
  1. **Colaboradores**: Nome, CPF, Cargo, Departamento, Salário, Data Admissão, PIS, Email, Telefone
  2. **Dissídios**: Empresa, Sindicato, Percentual, Data-Base, Colaboradores, Valor Total, Status
  3. **Validações de Folha**: Empresa, Mês/Ano, Tipo, Itens Verificados, Erros, Status, Data
- ✅ Filtro por empresa
- ✅ Formatação profissional (cabeçalhos coloridos, bordas, moeda brasileira)
- ✅ Arquivo .xlsx compatível com Excel, Google Sheets, LibreOffice

## Arquitetura de Arquivos

```
/app/
├── backend/
│   └── server.py         # API FastAPI com todas as rotas e modelos
│   └── .env              # MONGO_URL, EMERGENT_LLM_KEY
│   └── tests/            # Testes automatizados
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/       # Shadcn UI
│       │   ├── Layout.js
│       │   └── EmpresaSelectorModal.js
│       ├── contexts/
│       │   ├── AuthContext.js
│       │   └── EmpresaContext.js
│       ├── pages/
│       │   ├── Login.js
│       │   ├── Dashboard.js
│       │   ├── Clientes.js
│       │   ├── Colaboradores.js   # Formulário eSocial
│       │   ├── Dissidio.js        # Prévia de reajuste
│       │   ├── ValidacaoFolha.js  # Comparação com apoio
│       │   ├── InformesRendimento.js  # eSocial vs SCI Único
│       │   └── Relatorios.js      # Exportação Excel
│       └── App.js
└── memory/
    └── PRD.md
```

## APIs Principais

### Autenticação
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Clientes/Empresas
- `GET /api/receita/{cnpj}` - Busca CNPJ na Receita Federal
- `GET /api/clientes`, `POST /api/clientes`, `PUT /api/clientes/{id}`, `DELETE /api/clientes/{id}`

### Colaboradores
- `GET /api/colaboradores`, `POST /api/colaboradores`, `PUT /api/colaboradores/{id}`, `DELETE /api/colaboradores/{id}`
- `POST /api/colaboradores/importar` - Importar via documento com IA

### Dissídio
- `GET /api/dissidios`, `POST /api/dissidios`
- `GET /api/dissidios/{id}/previa` - **NOVO** Prévia com tabela de salários
- `POST /api/dissidios/simular` - **NOVO** Simular reajuste
- `PUT /api/dissidios/{id}/aprovar`, `PUT /api/dissidios/{id}/rejeitar`
- `POST /api/convencao/analisar` - Analisar convenção com IA

### Validação de Folha
- `GET /api/validacoes`
- `POST /api/validacoes/analisar` - Analisar folha
- `POST /api/validacoes/comparar-apoio` - Comparar com relatório de apoio

### Informes de Rendimento
- `GET /api/informes/historico` - Histórico de comparações
- `POST /api/informes/comparar` - Comparar eSocial vs SCI Único

### Relatórios Excel (NOVOS)
- `GET /api/relatorios/colaboradores/excel` - Exportar colaboradores
- `GET /api/relatorios/dissidios/excel` - Exportar dissídios
- `GET /api/relatorios/validacoes/excel` - Exportar validações
- `GET /api/relatorios/dissidio/{id}/previa/excel` - Exportar prévia de dissídio

## Prioritized Backlog

### P0 (Crítico) - CONCLUÍDO
- ✅ Funcionalidade de Admissão de Colaboradores via template eSocial
- ✅ Automação do Dissídio Coletivo com prévia
- ✅ Validação de Folha com Relatório de Apoio
- ✅ Comparação de Informes eSocial vs SCI Único
- ✅ Relatórios exportáveis em Excel

### P1 (Alta Prioridade)
- 🔲 Cálculo de Médias Históricas (importar 12-24 meses para novos clientes)

### P2 (Média Prioridade)
- 🔲 Histórico de alterações por colaborador
- 🔲 Notificações de dissídios pendentes
- 🔲 Relatórios em PDF

### P3 (Baixa Prioridade)
- 🔲 Integração com sistemas de folha (Domínio, Fortes)
- 🔲 Comparativo mensal automático de folha
- 🔲 Dashboard com métricas por cliente
- 🔲 Multi-tenancy para vários escritórios
- 🔲 API para integração externa
- 🔲 App mobile para aprovações

## Credenciais de Teste
- Email: admin@dp.com
- Senha: senha123
- Empresa de teste: Empresa Teste LTDA (CNPJ 12345678000199)

## Próximos Passos
1. 🔲 Implementar Cálculo de Médias Históricas
2. 🔲 Adicionar histórico de alterações por colaborador
3. 🔲 Criar relatórios em PDF
