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

### ✅ Sistema de Formatação Manual com Importação (04/02/2026)

**Fluxo:**
1. Usuário clica em "Importar Documento" 
2. Sobe um documento Word modelo
3. Sistema analisa e extrai automaticamente a formatação
4. Preenche o formulário com os dados extraídos
5. Usuário confere e salva

**Extração automática:**
- Margens (Superior, Inferior, Esquerda, Direita)
- Espaçamento entre linhas
- Fonte e tamanho de cada seção
- Negrito/Itálico
- Alinhamento

**Seções identificadas automaticamente:**
1. Título Principal
2. Preâmbulo
3. Qualificação dos Sócios (nome em negrito)
4. Título das Cláusulas
5. Texto das Cláusulas
6. Assinaturas
7. Rodapé

### ✅ Listagem Agrupada por Cliente
- Minutas organizadas por CNPJ/Razão Social

### ✅ Minutas Contratuais
- Wizard 4 etapas
- Extração estruturada via IA
- Download Word/PDF formatado

### ✅ Autenticação
- Login/Registro com JWT

## Arquivos Principais
```
/app/backend/
├── server.py                  # Endpoints FastAPI
├── extrator_formatacao.py     # NOVO - Extrai formatação de documento Word
├── gerador_formatado.py       # Gera documento com formatação manual
├── template_manager.py        # Gerenciador de templates
└── jspdf_wrapper.py           # Gerador de PDF

/app/frontend/src/components/
├── ConfiguracaoFormatacao.js  # Modal de formatação com botão Importar
└── ClienteMinutas.js          # Listagem por cliente
```

## Endpoints de Formatação
- `POST /api/formatacao/importar` - **NOVO** - Analisa documento e extrai formatação
- `POST /api/formatacao/salvar` - Salva configuração
- `GET /api/formatacao` - Retorna configuração do usuário
- `POST /api/formatacao/logo` - Upload de logo

## Backlog
- **P1**: Implementar IA de consolidação de minutas
- **P2**: Finalizar automação REDESIM (pausado)
- **P3**: Renovação automática de licenças

## Credenciais de Teste
- Email: teste_template@test.com
- Senha: 123456
