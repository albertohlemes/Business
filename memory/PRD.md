# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com geração de documentos via IA.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)

## Implementações Concluídas

### ✅ Wizard de Constituição Completo (04/02/2026)

**Etapa 1 - Dados da Empresa:**
- Razão Social (maiúsculas automático) *
- Nome Fantasia
- Capital Social formatado como moeda (R$ 0,00) *
- Capital por Extenso **gerado automaticamente**

**Etapa 2 - Qualificação dos Sócios (TODOS CAMPOS OBRIGATÓRIOS):**
- Botão **"✨ Preencher Dados com IA"** para extração de CNH/RG
- Botão **"✨ Preencher Endereço com IA"** para extração de comprovante
- Dados pessoais: Nome*, CPF*, RG*, Órgão Emissor*, Nacionalidade*, Estado Civil*, Profissão*
- **Endereço Residencial completo** (mesmo padrão da empresa):
  - Logradouro*, Número*, Complemento, Bairro*, Cidade*, Estado*, CEP*

**Etapa 3 - Participação Societária:**
- Tabela interativa com cálculo automático
- Validação de 100% total
- Checkbox de administrador

**Etapa 4 - Endereço da Empresa (TODOS CAMPOS OBRIGATÓRIOS):**
- Botão **"✨ Preencher com IA"**
- Logradouro*, Número*, Complemento, Bairro*, Cidade*, Estado*, CEP*

**Etapa 5 - CNAEs e Objeto Social:**
- **Banco de CNAEs** com 40+ atividades mais comuns
- Busca por código ou descrição
- Adição manual de CNAEs não listados
- Botão **"✨ Gerar com IA"** para objeto social

**Etapa 6 - Resultado:**
- Contrato social completo
- Download em Word e PDF
- Cópia para área de transferência

### ✅ Estrutura de Abas (04/02/2026)
- Ordem: **Constituição** → **Alteração** → **Baixa**
- Nomenclatura: "Minuta" → "Processo"

### ✅ Correção do Bug de PDF (04/02/2026)
- Logo no cabeçalho
- Rodapé alinhado

## Banco de CNAEs Incluídos
- Desenvolvimento de software (62.01, 62.02, 62.03)
- Consultoria em TI (62.04)
- Contabilidade (69.20)
- Advocacia (69.11)
- Consultoria empresarial (70.20)
- Publicidade e marketing (73.11, 73.19)
- Design (74.10)
- Comércio varejista (47.xx)
- Restaurantes e lanchonetes (56.11)
- Construção civil (41.20, 43.xx)
- E mais 30+ atividades comuns

## Arquivos Principais
```
/app/frontend/src/components/processos/
├── WizardConstituicao.js  # Wizard de 6 etapas com banco de CNAEs
├── WizardAlteracao.js     # Wizard de alteração
└── ListaProcessos.js      # Lista agrupada por cliente

/app/backend/server.py
├── /api/constituicao/extrair-campo     # Extrai campo de documento
├── /api/constituicao/extrair-socio     # Extrai dados de sócio
├── /api/constituicao/gerar-objeto-social
└── /api/constituicao/gerar-contrato
```

## Backlog

### P1 - Média Prioridade
- ⏳ Implementar processo de **Baixa**
- ⏳ Adicionar mais CNAEs ao banco de dados
- ⏳ Busca de CEP automática via API

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM

## Credenciais de Teste
- Email: teste2@teste.com
- Senha: 123456

## Status: MVP Constituição COMPLETO ✅
