# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário da Business Contabilidade com duas funcionalidades principais:
1. Elaboração de minutas contratuais via IA - upload de contratos em PDF/imagem, IA identifica campos, usuário indica alterações (alteração de sócios, atividade, endereço), sistema gera minuta de alteração consolidada
2. Gestão de certificados digitais A1 e automação REDESIM SP - cadastro de certificados, consulta automática de licenças de funcionamento, renovação automática quando vencimento ≤30 dias ou já vencido, download de licenças ativas

## User Personas
- **Colaborador do Escritório**: Profissional do departamento societário que precisa criar minutas contratuais e gerenciar licenças de funcionamento

## Core Requirements
- Cores do escritório: Preto (#09090B) e Vermelho (#DC2626)
- Login simples com email/senha
- Certificados digitais tipo A1 (.pfx)
- IA para análise de documentos e geração de minutas

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key (para file attachments)
- **PDF**: jsPDF para geração de PDFs formatados

## O que foi implementado

### ✅ Autenticação (04/02/2026)
- Login/Registro com email e senha
- JWT para autenticação
- Logout funcional (botão "Sair" no sidebar)

### ✅ Dashboard (04/02/2026)
- Métricas de certificados, licenças e minutas
- Alertas para licenças próximas do vencimento
- Quick actions para navegação

### ✅ Módulo de Minutas Contratuais (04/02/2026)
- **Wizard de 4 etapas**: Contrato → Alterações → Detalhes → Resultado
- **Upload de PDF/imagem** do contrato social
- **Extração estruturada de dados via IA** (endpoint `/api/minutas/{id}/extrair-dados`):
  - Dados da Empresa: Razão Social, CNPJ, Endereço, Capital Social, Objeto Social
  - Quadro Societário (QSA): Nome, CPF, Participação, Administrador, etc.
  - Atividades/CNAEs
- **Campos estruturados** em vez de texto corrido (componente DadosExtraidos.js)
- **Seleção de tipos de alteração**: Sócios, Endereço, Atividades, Capital, Nome, Administração
- **Documentos de apoio**: Upload de CNH, comprovantes, etc.
- **Data editável** para a alteração
- **Geração de minuta com template padrão**
- **Visualização e download em PDF** formatado com cabeçalho do escritório
- **Listagem organizada** com colunas: Nº Sequencial, CNPJ, Razão Social, Tipo, Status, Data

### ✅ Módulo de Certificados Digitais (04/02/2026)
- Upload de arquivos .pfx (certificado A1)
- Cadastro com nome, senha e CNPJs associados
- Listagem e gestão de certificados

### ✅ Módulo de Licenças REDESIM (04/02/2026)
- Cadastro de CNPJs vinculados aos certificados
- Consulta de status de licenças (SIMULADO)
- Renovação de licenças vencidas/próximas do vencimento (SIMULADO)
- Status: Ativa, Próxima do Vencimento, Vencida, Pendente
- Visualização da licença em tela

## Estrutura de Arquivos
```
/app
├── backend/
│   ├── server.py              # API FastAPI com todos endpoints
│   ├── redesim_automation.py  # Automação Playwright REDESIM
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.js        # Sidebar com logout
    │   │   ├── DadosExtraidos.js # Campos estruturados
    │   │   └── ui/              # Shadcn components
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Dashboard.js
    │   │   ├── Minutas.js       # Wizard + listagem
    │   │   ├── Certificados.js
    │   │   └── Licencas.js
    │   ├── utils/
    │   │   └── pdfGenerator.js  # Geração de PDF
    │   └── contexts/
    │       └── AuthContext.js
    ├── package.json
    └── .env
```

## APIs Simuladas (MOCKED)
- **POST /api/licencas/{id}/consultar**: Simula consulta ao portal REDESIM SP com status aleatório
- **POST /api/licencas/{id}/renovar**: Simula renovação de licença

## Backlog P0/P1/P2

### P0 (Crítico)
- [ ] Integração real com portal REDESIM SP via automação Playwright
- [ ] Uso real do certificado digital para autenticação no Gov.br

### P1 (Importante)
- [ ] Download de licenças ativas em PDF real do portal
- [ ] Notificações por email para licenças próximas do vencimento
- [ ] Melhoria na extração de dados (OCR mais preciso)

### P2 (Nice to have)
- [ ] Dashboard com gráficos de evolução
- [ ] Histórico de alterações por empresa
- [ ] Templates de minutas personalizáveis
- [ ] Integração com Google Drive para armazenamento
- [ ] Agendamento automático de renovações

## Próximos Passos
1. Finalizar automação REDESIM SP com login híbrido (usuário faz login, sistema consulta)
2. Implementar notificações automáticas por email
3. Melhorar templates de minutas com mais opções
