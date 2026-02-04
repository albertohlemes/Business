# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com geração de documentos via IA.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)

## Implementações Concluídas

### ✅ Wizard de Baixa (Distrato Social) - NOVO (05/02/2026)

**Etapa 1 - Upload do Contrato Social:**
- Upload do último contrato social consolidado (PDF, DOCX, imagem)
- IA extrai automaticamente: Razão Social, CNPJ, NIRE, Capital, Sócios, Endereço
- **Opcional** - pode pular para preenchimento manual

**Etapa 2 - Dados da Empresa:**
- Razão Social*, CNPJ*, NIRE, Capital Social
- Junta Comercial, Data de Registro
- Endereço completo da sede
- Pré-preenchidos se upload foi feito na etapa 1

**Etapa 3 - Qualificação dos Sócios:**
- Lista de sócios pré-preenchida (se extraída)
- Botão **"Corrigir com IA"** para ajustar dados via upload de documento
- Dados: Nome*, CPF*, RG*, Órgão Emissor*, Nacionalidade*, Estado Civil*, Profissão*, Endereço*, Participação
- Adicionar/remover sócios dinamicamente

**Etapa 4 - Motivo e Detalhes da Baixa:**
- Dropdown com 8 motivos:
  - Encerramento por vontade dos sócios
  - Término do prazo de duração
  - Falência
  - Incorporação
  - Fusão
  - Cisão total
  - Inatividade prolongada
  - Outros (com campo para especificar)
- Data de encerramento das atividades*
- Destinação do acervo (livros e documentos)

**Etapa 5 - Distribuição do Patrimônio:**
- Declaração de quitação de débitos (checkbox)
- Distribuição do patrimônio remanescente
- Responsável pela guarda dos documentos*
- Prazo de guarda (5 anos, 10 anos, Prazo legal)

**Etapa 6 - Resultado:**
- Distrato Social completo gerado por IA
- Download em Word e PDF
- Cópia para área de transferência

### ✅ Bug Fix - Categorização de Processos (05/02/2026)
- Processos de "Constituição" agora aparecem na aba correta
- Migração de dados executada para documentos antigos

### ✅ Wizard de Constituição Completo (04/02/2026)
- 6 etapas com extração por IA
- Capital por extenso automático
- Banco de CNAEs com 40+ atividades

## Arquivos Principais
```
/app/frontend/src/components/processos/
├── WizardBaixa.js         # NOVO - Wizard de 6 etapas para baixa
├── WizardConstituicao.js  # Wizard de constituição
├── WizardAlteracao.js     # Wizard de alteração
└── ListaProcessos.js      # Lista agrupada por cliente

/app/backend/server.py
├── /api/baixa/extrair-contrato   # NOVO - Extrai dados do contrato
├── /api/baixa/gerar-distrato     # NOVO - Gera distrato social
├── /api/constituicao/...         # Endpoints de constituição
└── /api/minutas/...              # CRUD de processos
```

## Backlog

### P0 - Alta Prioridade
- ⏳ Verificação do usuário: exportação PDF (logo/rodapé)

### P1 - Média Prioridade
- ⏳ Busca de CEP automática via API
- ⏳ Adicionar mais CNAEs ao banco de dados

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM
- ⏳ Reativar plugin Babel `visual-edits`

## Credenciais de Teste
- Email: teste2@teste.com
- Senha: 123456

## Status: COMPLETO ✅
- Constituição ✅
- Alteração ✅
- Baixa ✅
