# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com:
1. Elaboração de minutas contratuais via IA
2. Gestão de certificados digitais e automação REDESIM SP (pausado)

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)

## Implementações Concluídas

### ✅ Reestruturação da UI: "Minutas" → "Processos" (04/02/2026)
- Menu lateral renomeado de "Minutas" para "Processos"
- Página principal com 3 abas: **Alteração**, **Constituição**, **Baixa**
- Rota `/minutas` redireciona automaticamente para `/processos`
- Dashboard atualizado para navegar para `/processos`
- Componentes refatorados em arquivos menores para melhor manutenibilidade:
  - `ListaProcessos.js` - Lista agrupada por cliente
  - `WizardAlteracao.js` - Wizard de 4 etapas para alteração
  - `WizardConstituicao.js` - Placeholder para funcionalidade futura

### ✅ Correção do Bug de PDF (04/02/2026)
- Logo agora aparece no cabeçalho do PDF
- Rodapé corretamente alinhado com margens
- Suporte a logo em base64 (PNG, JPG, GIF)
- Posicionamento dinâmico baseado nas configurações de formatação

### ✅ Conversão de Markdown para Word
O conteúdo gerado pela IA (em Markdown) é convertido para formatação Word real:
- `### Título` → Texto sem os `#`
- `**texto**` → **Negrito** real no Word
- `*texto*` → *Itálico* real no Word
- `***texto***` → ***Negrito e Itálico***
- `- item` → Texto sem o traço
- `1. item` → Texto sem a numeração

### ✅ Sistema de Formatação Manual com Importação
**Fluxo:**
1. Usuário clica em "Importar Documento"
2. Sobe um documento Word modelo
3. Sistema analisa e extrai automaticamente a formatação
4. Preenche o formulário com os dados extraídos
5. Usuário confere e salva

### ✅ Organização Inteligente de Páginas
- Títulos sempre ficam na mesma página que o texto seguinte
- Cláusulas curtas não são divididas entre páginas
- Controle automático de viúvas e órfãs

### ✅ Listagem Agrupada por Cliente
- Processos organizados por CNPJ/Razão Social

## Arquivos Principais
```
/app/backend/
├── server.py                  # Endpoints FastAPI
├── extrator_formatacao.py     # Extrai formatação de documento Word
├── gerador_formatado.py       # Gera documento com conversão de Markdown
├── template_manager.py        # Gerenciador de templates
└── jspdf_wrapper.py           # Gerador de PDF (CORRIGIDO)

/app/frontend/src/
├── pages/
│   ├── Processos.js           # Nova página principal com abas
│   └── Dashboard.js           # Dashboard atualizado
├── components/
│   ├── processos/
│   │   ├── ListaProcessos.js  # Lista agrupada por cliente
│   │   ├── WizardAlteracao.js # Wizard de alteração (4 etapas)
│   │   └── WizardConstituicao.js # Placeholder para constituição
│   ├── ConfiguracaoFormatacao.js
│   └── Layout.js              # Menu lateral atualizado
└── App.js                     # Rotas atualizadas
```

## Backlog

### P0 - Alta Prioridade
- ⏳ **Implementar wizard de Constituição**: Entrada de dados híbrida (digitar/upload), qualificação de sócios dinâmica, tabela de participação, objeto social via CNAEs

### P1 - Média Prioridade
- ⏳ Implementar processo de **Baixa** de empresas
- ⏳ Refatorar arquivo `Minutas.js` antigo (pode ser removido, está obsoleto)

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM (quando solicitado pelo usuário)

## Credenciais de Teste
- Email: teste2@teste.com
- Senha: 123456

## Status dos Testes
- Backend: 100% (18/18 testes passaram)
- Frontend: 100% (todas funcionalidades verificadas)
- Última execução: 04/02/2026
