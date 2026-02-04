# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com geração de documentos via IA.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)
- **API de CEP**: ViaCEP (Correios)

## Implementações Concluídas

### ✅ Wizard de Alteração Reformulado (05/02/2026)

**Nova estrutura de 4 etapas:**

**Etapa 1 - Upload do Contrato:**
- Upload do contrato social atual
- IA extrai: empresa, sócios, CNAEs

**Etapa 2 - Tipos de Alteração (seleção múltipla):**
- Alteração de Sócios (QSA)
- Alteração de Endereço
- Alteração de Atividades (CNAEs)
- Alteração de Capital
- Alteração de Nome
- Alteração de Administração

**Etapa 3 - Formulários específicos por tipo:**

**QSA (Quadro Societário):**
- 3 opções: Saída de sócio, Entrada de sócio, Redistribuição de cotas
- Lista sócios atuais com checkbox para selecionar saída
- Formulário para novos sócios com botão "✨ Preencher com IA"
- Campo para nova participação em redistribuição

**Endereço:**
- Mostra endereço atual da empresa
- Formulário completo de novo endereço
- Botão "✨ Preencher com IA" 
- Busca de CEP automática 🔍

**Atividades (CNAEs):**
- Lista CNAEs atuais com checkbox para EXCLUIR
- Busca para ADICIONAR novos CNAEs
- Indicadores visuais: vermelho=excluir, verde=adicionar

**Capital:**
- Mostra capital atual
- Opções: Aumento ou Redução
- Campo para novo valor e motivo

**Nome:**
- Mostra razão social e nome fantasia atuais
- Campos para novos valores

**Administração:**
- Lista sócios com checkbox para selecionar administradores
- Campo de poderes dos administradores

**Etapa 4 - Resultado:**
- Minuta gerada com todas as alterações
- Download Word e PDF
- Copiar para área de transferência

### ✅ Dashboard Renomeado (05/02/2026)
- "Minutas" → "Processos"
- "Minutas Contratuais" → "Processos Societários"
- "Nova Minuta" → "Novo Processo"
- Descrição atualizada para incluir constituição, alteração e baixa

### ✅ Banco de CNAEs Expandido (05/02/2026)
- 350+ CNAEs organizados por categoria

### ✅ Busca de CEP Automática (05/02/2026)
- Endpoint `/api/cep/{cep}` via ViaCEP
- Integração com extração por IA

### ✅ Wizard de Baixa (05/02/2026)
- 6 etapas completas

### ✅ Wizard de Constituição (04/02/2026)
- 6 etapas com extração por IA

## Arquivos Modificados
```
/app/frontend/src/components/processos/WizardAlteracao.js
- Reformulado completamente com formulários por tipo

/app/frontend/src/pages/Dashboard.js
- Nomenclatura "Minutas" → "Processos"
```

## Backlog

### P0 - Alta Prioridade
- ⏳ Verificação do usuário: testar fluxo completo de alteração

### P1 - Média Prioridade
- ⏳ Validações mais rigorosas nos formulários de alteração

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM
- ⏳ Reativar plugin Babel `visual-edits`

## Credenciais de Teste
- Email: teste2@teste.com
- Senha: 123456

## Status: COMPLETO ✅
- Constituição ✅
- Alteração ✅ (reformulado)
- Baixa ✅
- Banco de CNAEs ✅ (350+)
- Busca de CEP ✅
- Dashboard renomeado ✅
