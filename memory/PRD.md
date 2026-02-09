# AURION - Sistema de Fechamento Fiscal Premium

## Visão Geral
Sistema completo de contabilidade fiscal brasileira para empresas de diferentes regimes tributários (Simples Nacional, Lucro Presumido, Lucro Real).

## Funcionalidades Principais

### 1. Gestão de Empresas
- Cadastro com busca automática na Receita Federal
- Múltiplos regimes tributários
- **Upload de logo da empresa** (novo)
- Configuração de CNAE, tipo de atividade
- Perfis comerciais (indústria, distribuidor, varejo)

### 2. Importação de Documentos
- Upload de XMLs (NF-e, NFC-e, CT-e, NFS-e)
- Importação via IA (PDFs, imagens)
- Integração com SIEG (BLOQUEADO - chave inválida)
- **Barra de progresso com contador tomando café** (novo)
- Validação automática de CFOP por operação

### 3. Apurações Fiscais
- ICMS, PIS/COFINS, ISS, IPI
- DIFAL para Simples Nacional
- Cálculo de Fator R
- DAS (Simples Nacional)

### 4. RET - Comparativo de Regimes
- Comparação entre Simples, Presumido e Real
- DRE para Lucro Real
- **Aviso de dados incompletos** (novo)
- Projeção anual

### 5. Classificação Inteligente
- Classificação de produtos por categoria
- **Alertas de CFOP corrigidos** (novo)
- Comandos de IA para classificação em lote

### 6. Exportação
- SPED Fiscal
- Relatórios por alíquota (ICMS, PIS, COFINS)
- CSV de entradas/saídas

## Arquitetura

### Backend (FastAPI)
- `/app/backend/server.py` - Monólito principal
- `/app/backend/services/` - Serviços auxiliares
  - `document_ai.py` - Processamento com IA
  - `simples_nacional_calculator.py` - Cálculos Simples

### Frontend (React)
- `/app/frontend/src/pages/` - Páginas principais
- `/app/frontend/src/components/` - Componentes reutilizáveis
- `/app/frontend/src/context/` - Contextos (App, Upload)

## Changelog

### 2026-02-09
- ✅ Adicionada barra de progresso com contador tomando café
- ✅ Corrigido erro de exportação de relatórios (io not defined)
- ✅ Refeito frontend dos Alertas de CFOP
- ✅ Adicionado upload de logo da empresa
- ✅ Adicionado aviso no RET para dados incompletos
- ✅ Removidos arquivos obsoletos (AlertasCfop.js, ClassificacaoPage.js)

### Sessões Anteriores
- Unificação do módulo RET
- Customização de dashboards para Simples Nacional
- Melhoria no cálculo do Fator R
- Realocação da integração SIEG para Documentos
- Criação de relatórios por alíquota

## Backlog

### P1 - Alta Prioridade
- [ ] Upload de Certificado Digital (.pfx) - backend
- [ ] Integração SIEG - aguardando chave válida

### P2 - Média Prioridade
- [ ] Ordenação em todas as colunas das tabelas
- [ ] Logo da empresa nos relatórios exportados

### P3 - Baixa Prioridade
- [ ] Refatorar server.py em routers
- [ ] Sistema de licenças comerciais
- [ ] Dashboard de estatísticas para Master

## Credenciais de Teste
- Email: admin@test.com
- Senha: 123456
