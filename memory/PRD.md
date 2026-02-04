# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com:
1. Elaboração de minutas contratuais via IA
2. Gestão de certificados digitais e automação REDESIM SP

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **PDF**: jsPDF
- **Automação**: Playwright + noVNC (browser remoto visível)

## Implementações (04/02/2026)

### ✅ Minutas Contratuais
- Wizard 4 etapas
- Extração estruturada de dados via IA (campos, não texto corrido)
- Template padrão jurídico
- Download PDF direto (sem popup)
- Listagem: Nº | CNPJ | Razão Social | Tipo | Status | Data

### ✅ Licenças REDESIM - Automação VNC
- **noVNC**: Você vê o navegador do servidor em tempo real
- **Fluxo**:
  1. Clica "Consultar" → Abre modal com browser remoto
  2. Sistema navega até Gov.br
  3. VOCÊ faz login com certificado digital (visualmente)
  4. Sistema detecta login e continua automação
  5. Preenche CNPJ, clica consultar, extrai dados

### ✅ Componentes
- Display virtual (Xvfb :99)
- Servidor VNC (x11vnc)
- WebSocket proxy (websockify)
- noVNC client embutido no frontend

## Endpoints Novos
- `POST /api/redesim-vnc/iniciar/{cnpj}` - Inicia browser visível
- `POST /api/redesim-vnc/continuar` - Continua após login
- `GET /api/redesim-vnc/status` - Status + screenshot
- `GET /api/novnc/{path}` - Proxy para noVNC

## Backlog
- P1: Melhorar extração de dados do REDESIM
- P2: Download automático do PDF da licença
- P3: Notificações por email
