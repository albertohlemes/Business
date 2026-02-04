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

## O que foi implementado (04/02/2026)

### ✅ Autenticação
- Login/Registro com email e senha
- JWT para autenticação
- Logout funcional

### ✅ Dashboard
- Métricas de certificados, licenças e minutas
- Alertas para licenças próximas do vencimento
- Quick actions para navegação

### ✅ Módulo de Minutas Contratuais
- Upload de PDF/imagem do contrato social
- Seleção de tipo de alteração (sócios, endereço, atividade, capital, etc.)
- Chat com IA para discussão da alteração
- Geração de minuta de alteração
- Histórico de minutas

### ✅ Módulo de Certificados Digitais
- Upload de arquivos .pfx (certificado A1)
- Cadastro com nome, senha e CNPJs associados
- Listagem e gestão de certificados

### ✅ Módulo de Licenças REDESIM
- Cadastro de CNPJs vinculados aos certificados
- Consulta de status de licenças (SIMULADO)
- Renovação de licenças vencidas/próximas do vencimento (SIMULADO)
- Status: Ativa, Próxima do Vencimento, Vencida, Pendente

## APIs Simuladas (MOCKED)
- **POST /api/licencas/{id}/consultar**: Simula consulta ao portal REDESIM SP com status aleatório
- **POST /api/licencas/{id}/renovar**: Simula renovação de licença

## Backlog P0/P1/P2

### P0 (Crítico)
- [ ] Integração real com portal REDESIM SP via web scraping/automação
- [ ] Uso real do certificado digital para autenticação

### P1 (Importante)
- [ ] Download de licenças ativas em PDF
- [ ] Exportação de minutas para Word/PDF
- [ ] Notificações por email para licenças próximas do vencimento

### P2 (Nice to have)
- [ ] Dashboard com gráficos de evolução
- [ ] Histórico de alterações por empresa
- [ ] Templates de minutas personalizáveis
- [ ] Integração com Google Drive para armazenamento

## Próximos Passos
1. Implementar integração real com portal REDESIM SP
2. Adicionar notificações automáticas por email
3. Melhorar a geração de minutas com templates específicos
4. Implementar download de documentos em PDF/Word
