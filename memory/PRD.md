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

### ✅ Sistema de Formatação Manual (04/02/2026) - NOVO
Formulário onde o usuário configura exatamente como cada parte do documento deve ser formatada:

**Seções configuráveis:**
1. **Título Principal** - Ex: "ALTERAÇÃO DO CONTRATO SOCIAL"
2. **Preâmbulo** - Texto introdutório
3. **Qualificação dos Sócios** - Nome em negrito, qualificação normal
4. **Título das Cláusulas** - Ex: "CLÁUSULA PRIMEIRA"
5. **Texto das Cláusulas** - Corpo da cláusula
6. **Assinaturas** - Área de assinaturas
7. **Rodapé** - Texto do rodapé
8. **Logo** - Upload opcional

**Opções por seção:**
- Fonte (Arial, Times New Roman, Calibri, etc.)
- Tamanho (10pt a 24pt)
- Negrito/Itálico
- Alinhamento (Esquerda, Centro, Justificado)

**Configurações gerais:**
- Margens (Superior, Inferior, Esquerda, Direita)
- Espaçamento entre linhas (1.0, 1.5, 2.0)

### ✅ Listagem Agrupada por Cliente (04/02/2026)
- Minutas organizadas por CNPJ/Razão Social
- Contador de alterações por cliente

### ✅ Minutas Contratuais
- Wizard 4 etapas (Contrato → Alterações → Detalhes → Resultado)
- Extração estruturada de dados via IA
- Upload de documentos de apoio
- Download Word/PDF com formatação personalizada

### ✅ Sistema de Autenticação
- Login/Registro com JWT
- Proteção de rotas

## Arquivos Principais
```
/app
├── backend/
│   ├── server.py                # Endpoints FastAPI
│   ├── gerador_formatado.py     # NOVO - Gerador com formatação manual
│   ├── template_manager.py      # Gerenciador de templates arquivo
│   ├── jspdf_wrapper.py         # Gerador de PDF
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   └── Minutas.js
        └── components/
            ├── ConfiguracaoFormatacao.js  # NOVO - Modal de formatação
            └── ClienteMinutas.js
```

## Novos Endpoints
- `POST /api/formatacao/salvar` - Salva configuração de formatação manual
- `GET /api/formatacao` - Retorna configuração do usuário
- `POST /api/formatacao/logo` - Upload de logo

## Prioridade de Formatação
1. **Formatação Manual** (se configurada) - usa `gerador_formatado.py`
2. **Template de Arquivo** (fallback) - usa `template_manager.py`
3. **Padrão** - formatação default

## Backlog
- **P1**: Implementar IA de consolidação de minutas
- **P2**: Finalizar automação REDESIM (pausado)
- **P3**: Renovação automática de licenças
- **P3**: Notificações por email

## Credenciais de Teste
- Email: teste_template@test.com
- Senha: 123456
