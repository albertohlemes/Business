# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com geração de documentos via IA.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)
- **APIs Externas**: ViaCEP (CEP), ReceitaWS (CNPJ)

## Implementações Concluídas

### ✅ Wizard de Alteração Reformulado (05/02/2026)

**Nova estrutura de 4 etapas:**

**Etapa 1 - Upload do Contrato:**
- Upload do contrato social atual
- IA extrai: empresa, sócios, CNAEs, cláusulas
- Campo de CNPJ para buscar CNAEs na Receita Federal
- Armazena cláusulas originais para consolidação

**Etapa 2 - Tipos de Alteração (seleção múltipla):**
- Alteração de Sócios (QSA)
- Alteração de Endereço
- Alteração de Atividades (CNAEs)
- Alteração de Capital
- Alteração de Nome
- Alteração de Administração
- Outras Alterações (cláusulas específicas)

**Etapa 3 - Formulários específicos por tipo:**

**QSA (Quadro Societário) - MULTI-OPÇÃO:**
- Permite selecionar MÚLTIPLAS opções simultaneamente (Saída + Entrada, por exemplo)
- 3 opções com checkboxes: Saída de Sócio, Entrada de Sócio, Redistribuição
- Cada seção aparece de forma independente quando selecionada

**Saída de Sócios:**
- Lista sócios atuais com checkbox para selecionar saída
- Formulário manual para adicionar retirantes quando não há extração
- Campos: Nome, CPF, Participação

**Entrada de Sócios - FORMULÁRIO COMPLETO (igual à Constituição):**
- Botão "✨ Preencher com IA" para extração de documentos (CNH, RG)
- Dados pessoais: Nome, CPF, RG, Órgão Emissor, Nacionalidade, Estado Civil, Regime de Casamento, Profissão, Participação
- Seção de Endereço Residencial completa:
  - Botão "✨ Preencher Endereço com IA"
  - Logradouro, Número, Complemento, Bairro, Cidade, Estado, CEP
  - Busca automática de CEP

**Redistribuição:**
- Lista sócios atuais com campo para nova participação (%)

**CONSOLIDAÇÃO DO CONTRATO:**
- As cláusulas originais são extraídas e armazenadas
- O prompt de geração inclui todas as cláusulas originais
- A IA gera a minuta mantendo as cláusulas não alteradas e atualizando apenas as modificadas

**Etapa 4 - Resultado:**
- Minuta gerada com todas as alterações
- Download Word e PDF
- Copiar para área de transferência

### ✅ Busca de CNPJ na Receita Federal (05/02/2026)
- Endpoint `/api/cnpj/{cnpj}` via ReceitaWS
- Retorna: razão social, nome fantasia, CNAEs, QSA, endereço
- Integrado na Etapa 1 do Wizard de Alteração

### ✅ Dashboard Renomeado (05/02/2026)
- "Minutas" → "Processos"
- "Minutas Contratuais" → "Processos Societários"
- "Nova Minuta" → "Novo Processo"

### ✅ Banco de CNAEs Expandido (05/02/2026)
- 350+ CNAEs organizados por categoria

### ✅ Busca de CEP Automática (05/02/2026)
- Endpoint `/api/cep/{cep}` via ViaCEP
- Integração com extração por IA

### ✅ Wizard de Baixa (05/02/2026)
- 6 etapas completas

### ✅ Wizard de Constituição (04/02/2026)
- 6 etapas com extração por IA

## Testes Realizados (05/02/2026)

### ✅ Melhorias Implementadas: QSA Multi-opção e Rascunho

**1. QSA com Múltiplas Opções:**
- Alterado de radio buttons para checkboxes
- Permite selecionar Saída + Entrada + Redistribuição simultaneamente
- Cada seção aparece independentemente

**2. Redistribuição com Entrada Manual:**
- Quando não há sócios extraídos, permite adicionar manualmente
- Campos: Nome, CPF, Participação Atual, Nova Participação

**3. Funcionalidade "Continuar de Onde Parou":**
- Rascunho salvo automaticamente em localStorage
- Ao reabrir wizard com rascunho, oferece opções:
  - "Continuar" - restaura o estado anterior
  - "Descartar" - começa novo processo
- Rascunho limpo automaticamente após sucesso

**4. Consolidação do Contrato:**
- Cláusulas originais extraídas e preservadas
- Prompt de geração mantém todas as cláusulas originais
- Apenas informações alteradas são atualizadas

### Bug Corrigido: Formulário QSA sem sócios extraídos
- **Status**: CORRIGIDO
- Adicionada entrada manual para sócios retirantes e redistribuição

### Taxa de Sucesso dos Testes
- Backend: 100% (10/10 testes)
- Frontend: 100% (todas funcionalidades testadas)

## Arquivos Modificados
```
/app/frontend/src/components/processos/WizardAlteracao.js
- Reformulado completamente com formulários por tipo
- Busca de CNPJ implementada
- Opção "Outras Alterações" implementada

/app/backend/server.py
- Endpoint /api/cnpj/{cnpj} (linha 1632)
- Endpoint /api/cep/{cep}
- Extração de cláusulas na função extrair-dados

/app/frontend/src/pages/Dashboard.js
- Nomenclatura "Minutas" → "Processos"
```

## Arquivos de Teste
- `/app/backend/tests/test_alteracao.py`
- `/app/test_reports/iteration_4.json`

## Backlog

### P1 - Média Prioridade
- ⏳ Validar exportação PDF (logo e rodapé) - AGUARDANDO VALIDAÇÃO USUÁRIO
- ⏳ Validações mais rigorosas nos formulários de alteração

### P2 - Baixa Prioridade
- ⏳ Reativar automação REDESIM
- ⏳ Reativar plugin Babel `visual-edits`
- ⏳ Histórico de versões dos documentos
- ⏳ Dashboard agrupado por CNPJ

## Credenciais de Teste
- Email: teste@teste.com
- Senha: teste123

## Status: COMPLETO ✅
- Constituição ✅
- Alteração ✅ (reformulado, com busca CNPJ e cláusulas)
- Baixa ✅
- Banco de CNAEs ✅ (350+)
- Busca de CEP ✅
- Busca de CNPJ ✅
- Dashboard renomeado ✅
