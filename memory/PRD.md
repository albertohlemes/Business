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

## Implementações Concluídas

### ✅ Conversão de Markdown para Word (04/02/2026)
O conteúdo gerado pela IA (em Markdown) agora é convertido para formatação Word real:

**Conversões suportadas:**
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

### ✅ Listagem Agrupada por Cliente
- Minutas organizadas por CNPJ/Razão Social

### ✅ Minutas Contratuais
- Wizard 4 etapas
- Extração estruturada via IA
- Download Word/PDF formatado

## Arquivos Principais
```
/app/backend/
├── server.py                  # Endpoints FastAPI
├── extrator_formatacao.py     # Extrai formatação de documento Word
├── gerador_formatado.py       # Gera documento com conversão de Markdown
├── template_manager.py        # Gerenciador de templates (também com conversão)
└── jspdf_wrapper.py           # Gerador de PDF
```

## Backlog
- **P1**: Implementar IA de consolidação de minutas
- **P2**: Finalizar automação REDESIM (pausado)
- **P3**: Renovação automática de licenças

## Credenciais de Teste
- Email: teste_template@test.com
- Senha: 123456
