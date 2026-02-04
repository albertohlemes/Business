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

### ✅ Banco de CNAEs Expandido (05/02/2026)
Expandido de ~40 para **350+ CNAEs** organizados por categorias:
- Comércio Varejista (70+ atividades)
- Comércio Atacadista (30+ atividades)
- Alimentação (restaurantes, bares, lanchonetes)
- Tecnologia e Informática
- Serviços Profissionais (advocacia, contabilidade, engenharia)
- Publicidade e Marketing
- Design e Fotografia
- Saúde (clínicas, laboratórios, profissionais)
- Construção Civil (60+ atividades)
- Transporte e Logística
- Educação
- Atividades Imobiliárias
- Serviços Pessoais
- Veículos e Autopeças
- Aluguel e Locação
- Outros Serviços

### ✅ Busca de CEP Automática (05/02/2026)

**Endpoint de API:**
- `GET /api/cep/{cep}` - Consulta CEP via API ViaCEP (Correios)
- Retorna: logradouro, bairro, cidade, estado, IBGE, DDD

**Integração com IA:**
- Quando a IA extrai um CEP de documento, automaticamente consulta os Correios
- Atualiza o logradouro com a descrição oficial dos Correios

**Interface:**
- Botão 🔍 ao lado de cada campo CEP (empresa e sócios)
- Ao clicar, busca e preenche automaticamente: logradouro, bairro, cidade, estado

### ✅ Melhorias no Wizard de Baixa (05/02/2026)
- Subtítulo "Baixas de Empresas"
- Botão IA para endereço do sócio
- Textos padrão pré-preenchidos
- Responsável pela guarda: Select com sócios
- Data de encerramento: data de hoje

### ✅ Wizard de Baixa Completo (05/02/2026)
- 6 etapas com extração por IA

### ✅ Bug Fix - Categorização (05/02/2026)
- Processos aparecem nas abas corretas

### ✅ Wizard de Constituição Completo (04/02/2026)
- 6 etapas com extração por IA

## Arquivos Modificados Hoje
```
/app/frontend/src/components/processos/WizardConstituicao.js
- Banco de CNAEs expandido para 350+ atividades
- Adicionada função buscarCep() para consulta automática
- Botão de busca CEP nos campos de endereço (empresa e sócios)

/app/backend/server.py
- Novo endpoint GET /api/cep/{cep}
- Integração automática com Correios na extração de endereço por IA
```

## Backlog

### P0 - Alta Prioridade
- ⏳ Verificação do usuário: exportação PDF (logo/rodapé)

### P1 - Média Prioridade
- ✅ ~~Busca de CEP automática via API~~ CONCLUÍDO
- ✅ ~~Adicionar mais CNAEs~~ CONCLUÍDO (350+)

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
- Banco de CNAEs ✅ (350+)
- Busca de CEP ✅
