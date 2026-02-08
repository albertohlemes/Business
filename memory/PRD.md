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

### v2.2.0 (09/02/2026)
- **Nova Navegação de Documentos**: Página redesenhada com estrutura de 3 níveis
  - Nível 1: Botões ENTRADAS (verde) e SAÍDAS (azul)
  - Nível 2: Sub-tipos de documentos (NF-e, NFC-e, CT-e, Serviços, Demais)
  - Nível 3: Lista de documentos com upload integrado
- Remoção do item de menu "Upload XML" (funcionalidade integrada nas listas)
- Correção de classes CSS dinâmicas do Tailwind (template literals não funcionavam)
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
