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
- IA extrai: empresa, sócios, CNAEs
- Campo de CNPJ para buscar CNAEs na Receita Federal

**Etapa 2 - Tipos de Alteração (seleção múltipla):**
- Alteração de Sócios (QSA)
- Alteração de Endereço
- Alteração de Atividades (CNAEs)
- Alteração de Capital
- Alteração de Nome
- Alteração de Administração
- Outras Alterações (cláusulas específicas)

**Etapa 3 - Formulários específicos por tipo:**

**QSA (Quadro Societário):**
- 3 opções: Saída de sócio, Entrada de sócio, Redistribuição de cotas
- Lista sócios atuais com checkbox para selecionar saída
- Formulário para novos sócios com botão "Preencher com IA"
- Campo para nova participação em redistribuição

**Endereço:**
- Mostra endereço atual da empresa
- Formulário completo de novo endereço
- Botão "Preencher com IA" 
- Busca de CEP automática

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

**Outras Alterações:**
- Lista cláusulas extraídas do contrato
- Seleção de cláusulas para alterar
- Campo de texto original e novo texto
- Opção de adicionar alteração manual

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

### Bug Reportado: Seleção de Tipos no Wizard de Alteração
- **Status**: BUG NÃO REPRODUZÍVEL
- **Investigação**: A função `toggleAlteracao` (linha 1147) foi testada extensivamente
- **Cenários testados**:
  - Seleção simples de tipo ✅
  - Seleção múltipla de tipos (até 4) ✅
  - Toggle de desseleção ✅
  - Feedback visual (destaque vermelho) ✅
  - Botão "Próximo" habilitado quando tipos selecionados ✅
- **Conclusão**: O código está funcionando corretamente. O usuário pode ter ficado preso na Etapa 1 (requer upload de arquivo).

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
