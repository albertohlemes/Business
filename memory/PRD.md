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
- Dados pessoais: Nome, CPF, RG, Órgão Emissor, Nacionalidade
- Naturalidade: Data de Nascimento, Cidade de Nascimento, Estado de Nascimento
- Estado Civil, Regime de Casamento (se casado), Profissão, Participação
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

### ✅ Modelos de Documentos Padronizados (05/02/2026)

**Baseados nos modelos fornecidos pelo usuário:**

**CONSTITUIÇÃO (2+ sócios):**
- Título: "ATO CONSTITUTIVO DE SOCIEDADE EMPRESÁRIA LIMITADA"
- 13 cláusulas padrão: Denominação, Sede, Objeto, Duração, Capital, Administração, Pró-Labore, Desimpedimento, Filiais, Exercício Social, Resolução de Quotas, Dissolução, Foro
- Adaptação automática para singular/plural conforme número de sócios
- Sem testemunhas

**CONSTITUIÇÃO (1 sócio - Unipessoal):**
- Mesma estrutura adaptada para sócio único
- Linguagem no singular
- "Sociedade Empresária Limitada Unipessoal"

**DISTRATO:**
- Título: "DISTRATO SOCIAL" + Nome da empresa centralizado
- Qualificação completa dos sócios no início
- 7 cláusulas: Dissolução, Cessação, Acervo Contábil, Passivo Social, Patrimônio Remanescente, Responsabilidade, Guarda de Documentos
- Assinatura de todos os sócios (linha + nome + CPF)
- Sem testemunhas

**ALTERAÇÃO:**
- Assinaturas: Sócios permanentes + Retirantes + Entrantes
- Sem título "PREÂMBULO"
- Consolidação mantendo cláusulas originais

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
- `/app/backend/tests/test_naturalidade_fields.py`
- `/app/test_reports/iteration_4.json`
- `/app/test_reports/iteration_5.json` (campos de naturalidade)
- `/app/test_reports/iteration_6.json` (edição, profissão padrão, nome empresa)

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

## Implementações Recentes (05/02/2026)

### ✅ Integração GClick
- **Endpoint:** `POST /api/gclick/enviar-empresa` - Envia dados da empresa e sócios para o GClick
- **Endpoint:** `GET /api/gclick/status/{minuta_id}` - Verifica se empresa já foi enviada
- **Botão na lista:** Ícone de envio (avião) que fica verde quando já enviado
- **Dados enviados:** Razão Social, Nome Fantasia, CNPJ, Endereço, Inscrição Estadual/Municipal, Sócios
- **Credenciais:** Configuradas em `.env` (GCLICK_CLIENT_ID, GCLICK_CLIENT_SECRET)

### ✅ Campos de Inscrição Estadual e Municipal
- Adicionados no formulário de Constituição (Step 1 - Dados da Empresa)
- Salvos em `dados_empresa` e enviados para o GClick
- Carregados corretamente na edição

### ✅ Edição de Processos Concluídos
- **Botão de Editar** adicionado na lista de processos (ícone de lápis)
- Funciona para todos os tipos: Constituição, Alteração e Baixa
- Ao clicar, abre o wizard correspondente em **modo edição** com dados pré-preenchidos
- **Carrega TODOS os dados**: razão social, nome fantasia, capital, endereço, sócios, CNAEs, etc.
- Dados são carregados de `dados_empresa` e `dados_socios` salvos no banco
- **Modo edição ATUALIZA** o processo existente (não cria novo)
- Confirmação antes de excluir processos
- Permite regenerar documentos após edições

### ✅ Flag "Sócio Administrador"
- Checkbox visível no formulário de cada sócio (Step 2)
- Descrição: "Se marcado, este sócio constará na cláusula de administração do contrato"
- Se não marcado, o sócio NÃO aparece na cláusula de administração
- Presente em WizardConstituicao e WizardAlteracao (entrada de sócios)

### ✅ Profissão Padrão "Empresário(a)"
- Campo profissão nos formulários de sócios vem preenchido com "Empresário(a)" por padrão
- Aplicado em WizardConstituicao e WizardAlteracao

### ✅ Nome da Empresa na Listagem
- Lista de processos agora exibe a razão social/nome da empresa
- Fallback: razao_social → nome_empresa → "Empresa não identificada"
- Campo `razao_social` e `nome_empresa` salvos ao gerar contrato de constituição

### ✅ Qualificação dos Sócios Melhorada
- Qualificação inclui: naturalidade (cidade/estado), data de nascimento formatada (DD/MM/YYYY)
- Ordem padronizada: nome, nacionalidade, naturalidade, data nascimento, estado civil, profissão, RG, CPF, endereço
- Dados enviados corretamente do frontend para o backend (camelCase → snake_case)

### ✅ Tabela de Distribuição de Cotas com TOTAL
- Todas as tabelas de distribuição de cotas agora incluem linha de TOTAL no final
- Aplicado em: Constituição, Alteração (redistribuição), Baixa (patrimônio)
- Formato: SÓCIO | %% | Qtd quotas | R$ Valor + linha TOTAL | 100% | Total quotas | R$ Total
- **Novos campos**: Data de Nascimento, Cidade de Nascimento, Estado de Nascimento
- **WizardConstituicao.js**: SocioCard (linhas 774-807)
- **WizardAlteracao.js**: SocioCardAlteracao (linhas 733-772), SociosEntrando (linhas 477-484)
- **Backend (server.py)**: Modelo SocioConstituicao (linhas 1768-1770)
- **Extração por IA**: Prompt atualizado para extrair data_nascimento, cidade_nascimento, estado_nascimento automaticamente
- **Geração de documentos**: Campos opcionais incluídos quando fornecidos
- **Testes**: 100% passaram (backend e frontend)

### ✅ Menu e Página "Cadastros" (05/02/2026)
- **Nova página dedicada** para integrações com sistemas externos
- **Rota:** `/cadastros` (App.js atualizado com import e ProtectedRoute)
- **Menu lateral** com ícone Database no Layout.js
- **Aba GClick:**
  - Formulário completo para cadastro direto: ID/Código, Razão Social, Nome Fantasia, CNPJ, Inscrições
  - Seção de endereço: Logradouro, Número, Complemento, Bairro, Cidade, UF, CEP, Telefone, E-mail
  - Seção de sócios: Adicionar/remover sócios com Nome, CPF, Participação, flag Administrador
  - Campo de Observações
  - Botão "Enviar para GClick" → chama `/api/gclick/cadastrar-direto`
  - **Endpoint novo:** `POST /api/gclick/cadastrar-direto` (server.py linha ~2455)
- **Aba SCI Único:**
  - Formulário com campos específicos: Regime Tributário (dropdown), Data Abertura, Capital Social
  - Seção de contato: Responsável, CPF Responsável
  - Botão "Copiar Dados para SCI Único" → copia texto formatado para clipboard
  - Mensagem informativa sobre integração manual (sistema desktop)
- **Testes:** 100% passaram (backend e frontend) - iteration_7.json

### ✅ Histórico + Extração IA + SINTEGRA (05/02/2026)
- **Histórico de Cadastros:**
  - Botão "Ver Histórico" no topo da página (com contador de registros)
  - Lista todos os cadastros feitos (GClick e SCI Único)
  - Exibe: Data/hora, Razão Social, CNPJ, Tipo (GClick/SCI), Status de envio
  - Botão de refresh para atualizar lista
  - **Endpoints:** `GET/DELETE /api/cadastros/historico`, `GET /api/cadastros/historico/{id}`
  
- **Extração de Dados por IA:**
  - Botão "Preencher com IA" em ambas as abas (GClick e SCI Único)
  - Aceita: Cartão CNPJ, Certidão Inteiro Teor, Contrato Social, Comprovante de Endereço
  - IA extrai: Razão Social, CNPJ, Endereço, Sócios, Capital Social, Regime Tributário, etc.
  - **Endpoint:** `POST /api/cadastros/extrair-dados` (usa Gemini via Emergent LLM Key)
  
- **Busca Automática de IE (SINTEGRA):**
  - Após extração, busca automaticamente a Inscrição Estadual
  - Se não encontrar, deixa em branco (como solicitado pelo usuário)
  - **Endpoint:** `GET /api/sintegra/{uf}/{cnpj}`
  - Nota: SINTEGRA não tem API pública, retorna orientação para consulta manual

- **Testes:** 100% passaram (19/19 backend, UI verificada) - iteration_8.json

## Status: COMPLETO ✅
- Constituição ✅
- Alteração ✅ (reformulado, com busca CNPJ e cláusulas)
- Baixa ✅
- Banco de CNAEs ✅ (350+)
- Busca de CEP ✅
- Busca de CNPJ ✅
- Campos de Naturalidade ✅
- Extração por IA (naturalidade) ✅
- Edição de Processos ✅
- Profissão Padrão ✅
- Nome da Empresa na Listagem ✅
- Múltiplos Processos Simultâneos ✅
- Dashboard renomeado ✅
- **Menu Cadastros ✅ (NOVO)**
- **Integração GClick Direta ✅ (NOVO)**
