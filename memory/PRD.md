# Business Contabilidade - Sistema de Fechamento Fiscal

## Visão Geral
Sistema de fechamento fiscal automatizado com classificação inteligente de produtos, validação de CFOPs e geração de relatórios para o SPED.

## Funcionalidades Principais

### 1. Central de Fechamento (Wizard de 7 Etapas)
- **Etapa 1**: Notas Canceladas
- **Etapa 2**: Devoluções
- **Etapa 3**: Alertas de CFOP
- **Etapa 4**: Classificação de Produtos
- **Etapa 5**: PIS/COFINS Entradas
- **Etapa 6**: PIS/COFINS Saídas
- **Etapa 7**: Reforma Tributária

### 2. Classificação Inteligente
- Classificação automática via IA (Gemini)
- Alertas de CFOP divergentes
- Edição manual de CFOP por produto
- Memória IA para regras aprendidas

### 3. Importação em Lote
- Upload de XMLs de NF-e/NFC-e
- Processamento em background
- Relatórios de importação

---

## Changelog

### 15/02/2026 - Correção de Bugs Críticos
**Correções implementadas:**

1. **Sincronização de Contagem de Produtos** ✅
   - Wizard step 4 agora usa mesma lógica de agrupamento da Classificação Inteligente
   - Produtos são agrupados por código e descrição, não listados individualmente
   - Arquivo: `/app/backend/server.py` (linha ~33154)

2. **Central de Fechamento com 7 Etapas** ✅
   - Corrigido mapeamento de steps na AlertasPage.js
   - Nomes sincronizados com backend: Notas Canceladas, Devoluções, Alertas CFOP, Classif.Produtos, PIS/COFINS Entradas, PIS/COFINS Saídas, Reforma Tributária
   - Arquivo: `/app/frontend/src/pages/AlertasPage.js`

3. **Navegação do Wizard** ✅
   - Stepper navigation funciona corretamente
   - Função `goToStep` atualiza o step atual

4. **Coluna CFOP Original na Listagem Expandida** ✅
   - Adicionada coluna "CFOP Orig." com o CFOP original do emissor
   - Exibe cfop_original_emissor de cada produto
   - Arquivo: `/app/frontend/src/pages/ClassificacaoInteligente.js`

5. **Edição Manual de CFOP por Produto** ✅
   - Botão de edição (ícone lápis) aparece ao passar o mouse sobre cada produto
   - Input para digitar novo CFOP (4 dígitos)
   - Botões de confirmar e cancelar
   - Endpoint atualizado para aceitar JSON body
   - Arquivos: 
     - Frontend: `/app/frontend/src/pages/ClassificacaoInteligente.js`
     - Backend: `/app/backend/server.py` (endpoint `/api/alertas-cfop/resolver-individual`)

6. **Memória IA - Regras Permanentes** ✅ (15/02/2026)
   - **Toda edição manual de CFOP agora cria ou atualiza automaticamente uma regra na "Memória IA"**
   - A regra é salva na coleção `learned_rules` do MongoDB
   - Se já existir uma regra para o produto (por código ou descrição), ela é **atualizada** ao invés de duplicada
   - Regras são usadas para classificação automática em futuras importações
   - Frontend exibe feedback: "Nova regra criada" ou "Regra atualizada"
   - Endpoint: `/api/alertas-cfop/resolver-individual` (POST)
   - Campos da regra: produto_descricao, produto_codigo, ncm, cfop_correto, categoria_correta

---

## Arquitetura

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **IA**: Gemini (para classificação de produtos)
- **Arquivo principal**: `/app/backend/server.py`

### Frontend
- **Framework**: React
- **UI**: Tailwind CSS + Shadcn/UI
- **Estado**: Context API
- **Arquivos principais**:
  - `/app/frontend/src/pages/WizardFechamento.js`
  - `/app/frontend/src/pages/ClassificacaoInteligente.js`
  - `/app/frontend/src/pages/AlertasPage.js`

---

## Roadmap

### P0 (Crítico)
- [x] Sincronização de contagem de produtos entre Wizard e Classificação Inteligente
- [x] Navegação do menu do Wizard
- [x] Edição manual de CFOP por produto
- [x] **Memória IA** - Edição manual cria/atualiza regra permanente automaticamente
- [ ] Refatoração do monolito server.py

### P1 (Alta Prioridade)
- [ ] Replicar UI de edição manual de CFOP no WizardFechamento.js
- [ ] Visualização agrupada por dia na página de documentos
- [ ] Relatórios por email para importação em lote
- [ ] NF de fevereiro aparecendo em janeiro (bug)
- [ ] Lógica de devoluções com valor divergente

### P2 (Média Prioridade)
- [ ] Discrepância entre Dashboard e SPED
- [ ] Botão de Login travado em "Processando..."
- [ ] Integração de CT-e

### P3 (Baixa Prioridade)
- [ ] Testes automatizados
- [ ] Refatoração de componentes grandes (WizardFechamento, ClassificacaoInteligente)

---

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Empresas de Teste
- **SUNGROUP ENERGIA** (0760) - Usada para validação de contagem
- **M & A DE MORAES** (6388) - Tem 3 produtos pendentes para teste de CFOP (competência 01/2026)
