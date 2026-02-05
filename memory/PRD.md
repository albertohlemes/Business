# Portal DP - Departamento Pessoal

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## User Personas
- **Profissionais de DP**: Assistentes e analistas de departamento pessoal
- **Contadores**: Gestores responsáveis pela folha de pagamento
- **Clientes**: Empresas que terceirizam o DP para o escritório

## Core Requirements (Static)
1. **Dissídio Automatizado**: Upload de convenção coletiva → IA extrai reajustes → Aprovação → Lançamento
2. **Admissões Inteligentes**: Upload de documentos → IA extrai dados → Preenche ficha automaticamente
3. **Recomposição de Médias**: Importação histórico 12-24 meses → Cálculo automático para férias/rescisão
4. **Validação de Folha**: Comparação com mês anterior → Detecção de discrepâncias
5. **Conferência Informes de Rendimento**: Comparação eSocial vs Sistema interno

## Implementado (05/02/2026)

### MVP Inicial
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas
- ✅ CRUD Colaboradores
- ✅ Dashboard com estatísticas
- ✅ Módulo Dissídio (upload PDF, extração IA, aprovação)
- ✅ Módulo Admissões (upload docs, extração IA Gemini)
- ✅ Módulo Médias (importação histórico)
- ✅ Módulo Validação Folha (análise automatizada)
- ✅ Módulo Informes Rendimento (comparação eSocial)
- ✅ Interface PT-BR completa

### Melhorias FiscalFlow (05/02/2026)
- ✅ Cadastro de empresa com busca na Receita Federal (API ReceitaWS)
- ✅ Formatação automática de CNPJ
- ✅ Preenchimento automático de razão social, fantasia, endereço, telefone, email
- ✅ Seletor de Empresa + Competência no header
- ✅ Modal de seleção estilo FiscalFlow com lista de empresas em cards
- ✅ Campo de competência (MM/AAAA)
- ✅ Código da empresa visível (#XXXX)
- ✅ Dashboard com header mostrando empresa/competência selecionada
- ✅ Persistência de seleção no localStorage

### Funcionalidade de Admissão eSocial (05/02/2026) - NOVA
- ✅ Formulário completo de cadastro de colaboradores com template eSocial
- ✅ 5 abas organizadas: Cadastrais, Documentos, Contrato, Bancários, Dependentes
- ✅ Todos os campos da Ficha de Admissão eSocial implementados:
  - Dados cadastrais (nome, CPF, endereço, contato, filiação, deficiência)
  - Documentos (RG, CTPS, PIS/PASEP, Título de Eleitor, Reservista, CNH)
  - Informações contratuais (salário, cargo, experiência, horário, adicionais, benefícios)
  - Dados bancários (banco, agência, conta)
  - Dependentes (nome, CPF, parentesco, IR, salário família)
- ✅ Extração automática por IA de documentos (PDF, JPG, PNG, Excel)
- ✅ Suporte a documentos manuscritos e escaneados
- ✅ Modal de revisão de dados extraídos antes de salvar
- ✅ Indicador de confiança da extração (alta/média/baixa)
- ✅ Lista de campos extraídos e incertos para revisão

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Emergent LLM (Gemini 2.5 Flash)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **API Receita Federal**: ReceitaWS (gratuita)

## Prioritized Backlog

### P0 (Crítico)
- ✅ Funcionalidade de Admissão de Colaboradores via template eSocial (CONCLUÍDO)

### P1 (Alta Prioridade)
- 🔲 Automação do Dissídio Coletivo (upload convenção, extração percentual, cálculo reajustes)
- 🔲 Validação da Folha de Pagamento (comparar com mês anterior, sinalizar discrepâncias)
- 🔲 Cálculo de Médias Históricas (importar 12-24 meses para novos clientes)

### P2 (Média Prioridade)
- 🔲 Comparação de Informes de Rendimento (eSocial vs sistema interno)
- 🔲 Relatórios exportáveis em PDF/Excel
- 🔲 Histórico de alterações por colaborador
- 🔲 Notificações de dissídios pendentes

### P3 (Baixa Prioridade)
- 🔲 Integração com sistemas de folha (Domínio, Fortes)
- 🔲 Comparativo mensal automático de folha
- 🔲 Dashboard com métricas por cliente
- 🔲 Multi-tenancy para vários escritórios
- 🔲 API para integração externa
- 🔲 App mobile para aprovações

## Arquitetura de Arquivos

```
/app/
├── backend/
│   └── server.py         # API FastAPI com todas as rotas e modelos
│   └── .env              # Variáveis de ambiente (MONGO_URL, EMERGENT_LLM_KEY)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/       # Componentes Shadcn UI
│       │   ├── Layout.js
│       │   └── EmpresaSelectorModal.js
│       ├── contexts/
│       │   ├── AuthContext.js
│       │   └── EmpresaContext.js
│       ├── pages/
│       │   ├── Login.js
│       │   ├── Dashboard.js
│       │   ├── Clientes.js
│       │   ├── Colaboradores.js  # Formulário completo eSocial
│       │   └── Dissidio.js
│       └── App.js
└── memory/
    └── PRD.md
```

## APIs Principais

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Clientes/Empresas
- `GET /api/receita/{cnpj}` - Busca CNPJ na Receita Federal
- `GET /api/clientes` - Listar empresas
- `POST /api/clientes` - Criar empresa
- `PUT /api/clientes/{id}` - Atualizar empresa
- `DELETE /api/clientes/{id}` - Excluir empresa

### Colaboradores
- `GET /api/colaboradores` - Listar colaboradores
- `POST /api/colaboradores` - Criar colaborador
- `PUT /api/colaboradores/{id}` - Atualizar colaborador
- `DELETE /api/colaboradores/{id}` - Excluir colaborador
- `POST /api/colaboradores/importar` - **NOVO** Importar colaborador via documento com IA

### Dissídio
- `GET /api/dissidios` - Listar dissídios
- `POST /api/dissidios` - Criar dissídio
- `PUT /api/dissidios/{id}/aprovar` - Aprovar dissídio
- `PUT /api/dissidios/{id}/rejeitar` - Rejeitar dissídio
- `POST /api/convencao/analisar` - Analisar convenção coletiva com IA

## Credenciais de Teste
- Email: admin@dp.com
- Senha: senha123
- Empresa de teste: Empresa Teste LTDA (CNPJ 12345678000199)

## Próximos Passos
1. 🔲 Implementar automação completa do Dissídio Coletivo
2. 🔲 Criar página de Validação de Folha de Pagamento
3. 🔲 Implementar cálculo de Médias Históricas
4. 🔲 Adicionar comparação de Informes de Rendimento
