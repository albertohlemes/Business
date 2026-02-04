# Portal Societário Business Contabilidade - PRD

## Problema Original
Portal para departamento societário com geração de documentos via IA.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Geração de Docs**: python-docx (Word), reportlab (PDF)

## Implementações Concluídas

### ✅ Melhorias no Wizard de Baixa (05/02/2026)

1. **Lista de Processos**: Subtítulo alterado de "Processos" para "Baixas de Empresas"

2. **Etapa 3 - Qualificação dos Sócios**:
   - Botão **"✨ Preencher com IA"** para endereço do sócio (igual Constituição)

3. **Etapa 4 - Motivo da Baixa**:
   - Motivo padrão selecionado: "Encerramento por vontade dos sócios"
   - Data de encerramento: **pré-preenchida com data de hoje**
   - Destinação do acervo: **texto padrão** já preenchido

4. **Etapa 5 - Patrimônio**:
   - Distribuição do patrimônio: **texto padrão** já preenchido
   - Responsável pela guarda: **Select com lista de sócios** (não mais campo de texto)
   - Texto explicativo sobre responsabilidade

5. **Geração de Documentos**:
   - Nome da empresa **centralizado** no título do documento (DOCX e PDF)
   - Adicionado "DISTRATO" à lista de títulos centralizados

### ✅ Wizard de Baixa (Distrato Social) - (05/02/2026)

**6 etapas completas:**
1. Upload do Contrato - extração automática por IA
2. Dados da Empresa - pré-preenchidos
3. Qualificação dos Sócios - com botões de IA
4. Motivo e Detalhes da Baixa
5. Distribuição do Patrimônio
6. Resultado - distrato gerado

### ✅ Bug Fix - Categorização de Processos (05/02/2026)
- Processos aparecem nas abas corretas

### ✅ Wizard de Constituição Completo (04/02/2026)
- 6 etapas com extração por IA

## Arquivos Modificados Hoje
```
/app/frontend/src/components/processos/WizardBaixa.js
- Adicionado botão "Preencher com IA" para endereço do sócio
- Mudado responsável pela guarda para Select com sócios
- Adicionados textos padrão
- Data de hoje pré-preenchida

/app/frontend/src/components/processos/ListaProcessos.js
- Subtítulo "Baixas de Empresas" para tipo baixa

/app/backend/gerador_formatado.py
- Adicionado "DISTRATO" aos títulos centralizados

/app/backend/jspdf_wrapper.py
- Adicionado "DISTRATO" aos títulos centralizados
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
- Baixa ✅ (com melhorias)
