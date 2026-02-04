# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com:
1. Elaboração de minutas contratuais via IA
2. Gestão de certificados digitais e automação REDESIM SP

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)
- **Automação**: Playwright + noVNC (browser remoto visível) - PAUSADO

## Implementações Concluídas

### ✅ Sistema de Templates de Formatação (04/02/2026)
- Upload de templates .docx com formatação personalizada
- Extração automática de:
  - Cabeçalho e rodapé
  - Fonte (nome e tamanho)
  - Margens
  - Espaçamento entre linhas
- Geração de documentos Word preservando formatação do template
- Geração de PDF com mesma formatação

### ✅ Listagem Agrupada por Cliente (04/02/2026)
- Minutas agrupadas por CNPJ/Razão Social
- Visualização clara de todas alterações por cliente
- Contador de alterações por cliente
- Componente `ClienteMinutas` para melhor organização

### ✅ Minutas Contratuais
- Wizard 4 etapas (Contrato → Alterações → Detalhes → Resultado)
- Extração estruturada de dados via IA (campos, não texto corrido)
- Upload de documentos de apoio
- Download Word/PDF com template aplicado

### ✅ Sistema de Autenticação
- Login/Registro com JWT
- Proteção de rotas
- Logout funcional

## Arquivos Principais
```
/app
├── backend/
│   ├── server.py              # Endpoints FastAPI
│   ├── template_manager.py    # Gerenciador de templates fiel
│   ├── jspdf_wrapper.py       # Gerador de PDF com formatação
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   └── Minutas.js     # Página com listagem agrupada
        ├── components/
        │   └── ClienteMinutas.js  # Componente de alterações por cliente
        └── contexts/
            └── AuthContext.js
```

## Endpoints de Templates
- `POST /api/templates/upload` - Upload de template .docx/.pdf
- `GET /api/templates` - Lista templates do usuário
- `DELETE /api/templates/{id}` - Remove template
- `GET /api/minutas/{id}/download/word` - Download Word com template
- `GET /api/minutas/{id}/download/pdf` - Download PDF com template

## Backlog
- **P1**: Implementar IA de consolidação de minutas (gerar conteúdo da alteração)
- **P2**: Finalizar automação REDESIM (VNC WebSocket proxy)
- **P3**: Renovação automática de licenças
- **P3**: Notificações por email

## Issues Conhecidos
- Plugin visual-edits do Babel desabilitado (bug de recursão)
- Automação REDESIM pausada (problema de WebSocket proxy)

## Credenciais de Teste
- Email: teste_template@test.com
- Senha: 123456
