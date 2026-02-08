# AURION - Sistema de Fechamento Fiscal Premium

## Problema Original
Sistema de contabilidade fiscal para escritórios de contabilidade brasileiros, com funcionalidades de:
- Upload e processamento de XMLs de notas fiscais (NF-e, NFC-e, NFS-e)
- Classificação de produtos com IA
- Apuração mensal de impostos (ICMS, PIS, COFINS)
- Geração de arquivos SPED Fiscal
- Análise tributária inteligente

## Rebranding (v2.0 - Fevereiro 2026)
- **Nome**: AURION (significado: ouro/energia)
- **Slogan**: "Seu Núcleo de Inteligência Operacional"
- **Paleta de Cores Ultra Premium**:
  - Base: #0C0C0C (Preto suave)
  - Primária: #2A2A2A (Cinza quente)
  - Acento: #C8A951 (Dourado fosco - uso mínimo)

## Arquitetura

### Backend (FastAPI)
- `/app/backend/server.py` - Monolito principal
- `/app/backend/models/schemas.py` - Schemas Pydantic
- `/app/backend/services/` - Serviços auxiliares

### Frontend (React)
- `/app/frontend/src/pages/` - Páginas da aplicação
- `/app/frontend/src/components/` - Componentes reutilizáveis
- `/app/frontend/src/context/` - Context providers

## Funcionalidades Implementadas

### Sistema de Usuários e Perfis ✅
- **Super Admin**: Acesso total, gerencia todos os usuários
- **Master**: Vê todas as empresas, pode filtrar por responsável
- **Operacional**: Vê apenas empresas designadas

### Endpoints de Gestão de Usuários
- `GET /api/auth/users` - Listar usuários (Master/Admin)
- `POST /api/auth/users` - Criar usuário
- `PUT /api/auth/users/{id}` - Atualizar usuário
- `DELETE /api/auth/users/{id}` - Desativar usuário
- `POST /api/auth/users/{id}/reactivate` - Reativar usuário
- `PUT /api/auth/me/preferences` - Atualizar preferências (menu mode)

### Nova Navegação de Documentos ✅
A página de documentos foi redesenhada com navegação em 3 níveis:

**Nível 1 - Tipo de Operação:**
- ENTRADAS (verde/emerald): Compras e Aquisições
- SAÍDAS (azul/blue): Vendas e Prestações

**Nível 2 - Tipo de Documento:**
- Entradas: NF-e, Serviços Tomados, CT-e, Demais Documentos
- Saídas: NF-e, NFC-e, CT-e, Serviços Prestados

**Nível 3 - Lista de Documentos:**
- Tabela com número, emitente/destinatário, CNPJ, data, valor, status
- Botão "Importar XML" integrado em cada lista
- Campo de busca e ordenação
- Navegação de voltar entre níveis

### Gestão de Empresas ✅
- `GET /api/companies` - Listar empresas (com filtro por responsável)
- `GET /api/companies/responsaveis` - Listar responsáveis disponíveis
- Vinculação de usuários responsáveis às empresas
- Filtro por responsável na listagem
- **Importação em lote via Excel/CSV** (NOVA)
- Download de modelo de importação

### Preferências de Usuário ✅
- **Menu flexível**: Botão visível "Horizontal/Vertical" no header
  - Clique único para alternar entre modos
  - Preferência salva no localStorage + backend
  - Persiste após logout/login
- Persistência via localStorage + backend

## UI/UX Premium AURION

### Todas as Páginas Atualizadas ✅
- [x] Login.js - Tela de login premium
- [x] Layout.js - Menu vertical/horizontal configurável
- [x] Dashboard.js - Dashboard dark premium
- [x] Companies.js - Listagem + importação em lote
- [x] UsersPage.js - Gestão de usuários
- [x] CompanySelector.js - Modal de seleção premium
- [x] Documents.js - Listagem de documentos
- [x] UploadXML.js - Upload de arquivos
- [x] ClassificacaoPage.js - Validação & IA
- [x] ExportMenu.js - Exportação SPED
- [x] Reports.js - Relatórios
- [x] ApuracaoMensal.js - Apuração mensal
- [x] AlertasCfop.js - Alertas CFOP
- [x] AnalisePisCofins.js - Auditoria PIS/COFINS
- [x] AnaliseTributariaIA.js - Análise tributária IA
- [x] AnaliseSaidas.js - Análise de saídas
- [x] AnaliseTributaria.js - Análise tributária

### Paleta de Cores (CSS)
```css
--background: #0C0C0C;
--card: #141414;
--border: #2A2A2A;
--accent: #C8A951;
--text: #EDEDED;
--muted: #A1A1AA;
```

## Credenciais de Teste
- **Email**: admin@test.com
- **Senha**: 123456

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Criar tela de configuração de CFOPs de devolução
- [ ] Adicionar indicador visual para notas de "mesma empresa"

### P2 - Média Prioridade
- [ ] Refatorar server.py em módulos (routers)
- [ ] Implementar sistema de licenças
- [ ] Dashboard de estatísticas do escritório

### P3 - Futuro
- [ ] Multi-tenancy completo
- [ ] Relatórios customizáveis
- [ ] Exportação em múltiplos formatos

## Integrações
- **LiteLLM (GPT-4o)**: Classificação de produtos
- **SIEG**: Cofre de XMLs
- **Receita Federal**: Consulta CNPJ
- **XLSX**: Importação em lote de empresas

## Changelog

### v2.7.0 (08/02/2026) - RET, IPI e ICMS ST
- **Nova Página RET - Rota de Eficiência Tributária** (`/ret`):
  - Visão consolidada de todos os tributos (ICMS, ISS, PIS/COFINS, ICMS ST)
  - Cards: Total a Pagar, Total a Recuperar, Saldo Líquido
  - Detalhamento por tributo em cards separados
  - Integração com Análise IA tributária
  - Comparativo de Regimes (PIS/COFINS)
  - Substitui o antigo menu "Apuração Mensal"

- **Nova Página Apuração IPI** (`/apuracao-ipi`):
  - Entradas/Saídas agrupadas por CFOP com Valor Total, BC IPI, Valor IPI
  - Totalizadores de entradas (créditos) e saídas (débitos)
  - Top 10 Rankings: Produtos e NCMs crédito/débito
  - Demonstrativo: Crédito - Débito = Saldo (A_PAGAR ou A_RECUPERAR)
  - Para empresas industriais ou equiparadas a indústria

- **Nova Aba ICMS ST** (dentro de Apuração ICMS):
  - ICMS ST Gerado nas saídas
  - Deduções de ICMS ST (devoluções com CFOPs 1410, 5410, etc.)
  - ICMS ST a Recolher
  - Tabela de ICMS ST por CFOP

- **Menu Atualizado**:
  - PIS/COFINS, ICMS, ISS, IPI, RET, Relatórios, Exportação
  - Removidos: Apuração Mensal e Análise IA (integrados ao RET)

### v2.6.0 (08/02/2026) - Reestruturação do Menu de Apuração
- **Nova Página Apuração ICMS** (`/apuracao-icms`):
  - Tabela de **Entradas por CFOP** com Valor Total, BC ICMS, Valor ICMS
  - Tabela de **Saídas por CFOP** com Valor Total, BC ICMS, Valor ICMS
  - **Totalizadores** para entradas (créditos) e saídas (débitos)
  - **Top 10 Rankings**: Produtos e NCMs que mais geraram crédito/débito
  - **Demonstrativo de Apuração**: Crédito - Débito = Saldo (a pagar ou recuperar)
  - Endpoint: `GET /api/apuracao-icms/{company_id}?competencia=XX/XXXX`

- **Nova Página Apuração ISS** (`/apuracao-iss`):
  - Cards de resumo: Serviços Prestados, Base de Cálculo, ISS Devido, ISS Retido, ISS a Pagar
  - **Demonstrativo**: Valor Serviços → ISS Devido → (-) ISS Retido → (=) ISS a Pagar
  - **Serviços por Código**: Tabela agrupada por código de serviço
  - **Serviços por Tomador**: Tabela agrupada por tomador
  - Endpoint: `GET /api/apuracao-iss/{company_id}?competencia=XX/XXXX`

- **Melhorias em PIS/COFINS** (`/pis-cofins`):
  - Nova seção **Detalhamento por CFOP + CST** (ex: "1102 50", "5102 01")
  - **Top 10 Rankings**: Produtos e NCMs que mais geraram crédito/débito
  - 52 combinações CFOP+CST identificadas na competência de teste

- **Menu Atualizado**:
  - Novo item: **ICMS** (aponta para /apuracao-icms)
  - Novo item: **ISS** (aponta para /apuracao-iss)
  - PIS/COFINS mantido com melhorias

### v2.5.0 (08/02/2026)
- **Novo Módulo PIS/COFINS Completo**: Nova página dedicada à apuração de PIS/COFINS
  - **Aba Apuração**: Cards de resumo (Créditos, Débitos, Saldo, Imposto a Pagar) com detalhamento expansível
  - **Aba Comparativo**: Dashboard lado a lado comparando Lucro Real vs Lucro Presumido
    - Indica automaticamente o regime mais econômico
    - Mostra a economia potencial entre os regimes
    - Gráfico de barras visual para comparação
  - **Aba Divergências**: Análise de divergências entre XML e cálculo do sistema
    - Produtos agrupados por NCM com contagem de ocorrências
    - Resumo de valores recolhidos a maior/menor
    - Saldo de reclassificação (economia potencial)
    - Busca por produto ou NCM
- **Endpoints Backend**:
  - GET /api/pis-cofins/apuracao/{company_id} - Apuração completa com ambos os regimes
  - GET /api/pis-cofins/divergencias/{company_id} - Lista de divergências agrupadas
- **Serviço de Cálculo**: /app/backend/services/pis_cofins_calculator.py com:
  - Tabelas de NCMs (alíquota zero, monofásicos)
  - Tabelas de CNAEs (cumulativo, financeiro)
  - Tabelas de CFOPs sem crédito
  - Funções de classificação e cálculo

### v2.4.0 (09/02/2026)
- **Exclusão em Massa de Documentos**: Botão "Apagar" ao lado de "Importar" com filtros avançados
  - Filtro por intervalo de datas (Data Inicial/Final)
  - Filtro por intervalo de notas (Número Inicial/Final)
  - Filtro por Emitente/Fornecedor (com autocomplete)
  - Filtro por CFOPs (seleção múltipla com toggle)
  - Preview dos documentos antes de excluir (mostra quantidade e valor total)
  - Exclusão restrita à tela atual (tipo_operacao + modelo + competencia)
- **Correção do Filtro de Competência**: fetchDocuments agora passa competencia como parâmetro
- **Novos Endpoints Backend**:
  - POST /api/xml/documents/preview-delete (preview com contagem e valor)
  - POST /api/xml/documents/delete-bulk (exclusão em massa)
  - GET /api/xml/documents/cfops/{company_id} (lista de CFOPs únicos)
  - GET /api/xml/documents/emitentes/{company_id} (autocomplete de emitentes)

### v2.3.0 (09/02/2026)
- **Validação de Upload por Tipo**: Cada tipo de documento só aceita seu formato específico
  - NF-e, NFC-e, CT-e: Apenas XML do modelo correspondente (55, 65, 57)
  - Serviços Tomados/Prestados: XML de NFS-e OU PDF/Imagem via IA
  - Demais Documentos: Apenas PDF/Imagem via IA (energia, internet, etc.)
- **Processamento com IA (Gemini)**: Extração automática de dados de documentos fiscais
  - NFS-e: Extrai todos os campos obrigatórios para SPED
  - Contas de Consumo: Extrai dados de energia, internet, água, gás
- **Modal de Resultado de Upload**: Feedback detalhado mostrando documentos aceitos e rejeitados
- **Botões Dinâmicos**: Label do botão muda conforme tipo ("Importar XML", "Importar XML ou PDF", "Importar PDF/Imagem")

### v2.2.0 (09/02/2026)
- **Nova Navegação de Documentos**: Página redesenhada com estrutura de 3 níveis
  - Nível 1: Botões ENTRADAS (verde) e SAÍDAS (azul)
  - Nível 2: Sub-tipos de documentos (NF-e, NFC-e, CT-e, Serviços, Demais)
  - Nível 3: Lista de documentos com upload integrado
- **Filtros por Tipo e Modelo**: Backend atualizado para filtrar por tipo_operacao e modelo
- **Totalizador**: Exibe quantidade de documentos e soma total em R$ no topo da lista
- Remoção do item de menu "Upload XML" (funcionalidade integrada nas listas)
- Correção de classes CSS dinâmicas do Tailwind (template literals não funcionavam)
- Inferência automática de tipo_operacao pelo CFOP quando não definido no documento
- Todos os data-testid implementados para automação de testes
- Persistência correta do estado da empresa durante navegação

### v2.1.0 (08/02/2026)
- Todas as páginas atualizadas com tema AURION premium
- Importação em lote de empresas via Excel/CSV
- Correção de cores ilegíveis (fundo escuro + fonte escura)
- Remoção de todos os elementos com cores vermelhas antigas
- Padronização visual completa do sistema

### v2.0.0 (08/02/2026)
- Rebranding completo para AURION
- Novo sistema de perfis (Super Admin, Master, Operacional)
- Gestão de usuários com CRUD completo
- Menu configurável (vertical/horizontal)
- Listagem de empresas otimizada em formato de tabela
- Nova paleta de cores ultra premium
- Logo AURION gerada

### v1.x (Anteriores)
- Correção da geração do SPED Fiscal
- Agrupamento na tela de Validação IA
- Correção em lote para itens com ICMS zerado
