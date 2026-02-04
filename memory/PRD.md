# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário da Business Contabilidade com duas funcionalidades principais:
1. Elaboração de minutas contratuais via IA - upload de contratos em PDF/imagem, IA identifica campos, usuário indica alterações, sistema gera minuta de alteração consolidada
2. Gestão de certificados digitais A1 e automação REDESIM SP - cadastro de certificados, consulta automática de licenças de funcionamento, renovação automática

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **PDF**: jsPDF para geração de PDFs formatados
- **Automação**: Playwright para REDESIM SP

## Implementações Concluídas (04/02/2026)

### ✅ Módulo de Minutas Contratuais
- **Wizard 4 etapas**: Contrato → Alterações → Detalhes → Resultado
- **Extração estruturada de dados via IA**: Razão Social, CNPJ, Endereço, Capital, QSA, Atividades
- **Campos estruturados** (não texto corrido) - componente DadosExtraidos.js
- **Template padrão jurídico** para minutas
- **Visualização em PDF** com modal interno (sem popup bloqueado)
- **Download de PDF** formatado com cabeçalho Business Contabilidade
- **Listagem organizada**: Nº Sequencial | CNPJ | Razão Social | Tipo | Status | Data

### ✅ Módulo de Licenças REDESIM
- Cadastro de CNPJs vinculados aos certificados
- **Polling automático** para detectar login no Gov.br (verifica a cada 5s por 2min)
- Consulta automática após login detectado
- Fallback para consulta simulada

### ✅ Autenticação e Layout
- Login/Registro com JWT
- Logout funcional
- Dashboard com métricas

## Estrutura de Arquivos
```
/app
├── backend/
│   ├── server.py              # API FastAPI
│   ├── redesim_automation.py  # Automação Playwright
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.js
    │   │   └── DadosExtraidos.js
    │   ├── pages/
    │   │   ├── Minutas.js
    │   │   └── Licencas.js
    │   └── utils/
    │       └── pdfGenerator.js
    └── .env
```

## APIs (MOCKED)
- POST /api/licencas/{id}/consultar - Simula consulta REDESIM
- POST /api/licencas/{id}/renovar - Simula renovação

## Backlog
### P0
- [ ] Integração real com portal REDESIM SP

### P1
- [ ] Notificações por email
- [ ] Melhorar OCR/extração

### P2
- [ ] Templates personalizáveis
- [ ] Dashboard com gráficos
