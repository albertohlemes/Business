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
Wizard de 6 etapas para criação de contratos sociais:

**Etapa 1 - Dados da Empresa:**
- Razão Social (em maiúsculas automático)
- Nome Fantasia
- Capital Social formatado como moeda (R$ 0,00)
- Capital por Extenso **gerado automaticamente por IA**

**Etapa 2 - Qualificação dos Sócios:**
- Número dinâmico de sócios (+ / -)
- Botão **"Preencher com IA"** em cada sócio
- Extração automática de dados de CNH, RG, comprovantes
- Campos: Nome, CPF, RG, Órgão Emissor, Nacionalidade, Estado Civil, Regime Casamento, Profissão, Endereço

**Etapa 3 - Participação Societária:**
- Tabela interativa com cálculo automático
- Valor em R$ calculado por participação %
- Validação de 100% total
- Checkbox de administrador

**Etapa 4 - Endereço da Empresa:**
- Botão **"Preencher com IA"** para extração de documentos
- Campos: Logradouro, Número, Complemento, Bairro, Cidade, Estado, CEP

**Etapa 5 - CNAEs e Objeto Social:**
- Adição de múltiplos CNAEs
- Botão **"Gerar com IA"** para objeto social automático
- Geração jurídica baseada nos CNAEs

**Etapa 6 - Resultado:**
- Contrato social completo gerado por IA
- Download em Word e PDF
- Cópia para área de transferência

### ✅ Reestruturação de Nomenclatura (04/02/2026)
- "Minuta" → "Processo" em toda a aplicação
- Ordem das abas: **Constituição** → **Alteração** → **Baixa**
- Lista de processos agrupada por cliente

### ✅ Correção do Bug de PDF (04/02/2026)
- Logo no cabeçalho do PDF
- Rodapé corretamente alinhado

## Arquivos Principais
```
/app/backend/
├── server.py                  # Endpoints FastAPI
│   ├── /api/constituicao/extrair-campo     # Extrai campo de documento
│   ├── /api/constituicao/extrair-socio     # Extrai dados de sócio (CNH, RG)
│   ├── /api/constituicao/gerar-objeto-social  # Gera objeto social via IA
│   └── /api/constituicao/gerar-contrato    # Gera contrato completo
├── jspdf_wrapper.py           # Gerador de PDF com logo
└── gerador_formatado.py       # Gerador de Word

/app/frontend/src/
├── pages/
│   └── Processos.js           # Página principal com abas
├── components/processos/
│   ├── ListaProcessos.js      # Lista agrupada por cliente
│   ├── WizardAlteracao.js     # Wizard de alteração (4 etapas)
│   └── WizardConstituicao.js  # Wizard de constituição (6 etapas)
└── App.js                     # Rotas
```

## Backlog

### P0 - Alta Prioridade
- ✅ COMPLETO: Wizard de Constituição

### P1 - Média Prioridade
- ⏳ Implementar processo de **Baixa** de empresas
- ⏳ Melhorar extração de dados de documentos (OCR mais preciso)

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM

## Credenciais de Teste
- Email: teste2@teste.com
- Senha: 123456

## Status: MVP Constituição COMPLETO ✅
