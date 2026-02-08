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

### Gestão de Empresas
- `GET /api/companies` - Listar empresas (com filtro por responsável)
- `GET /api/companies/responsaveis` - Listar responsáveis disponíveis
- Vinculação de usuários responsáveis às empresas
- Filtro por responsável na listagem

### Preferências de Usuário
- Menu vertical ou horizontal (salvo por usuário)
- Persistência via localStorage + backend

## UI/UX Premium AURION

### Componentes Atualizados
- [x] Login.js - Tela de login premium
- [x] Layout.js - Menu vertical/horizontal configurável
- [x] Dashboard.js - Dashboard dark premium
- [x] Companies.js - Listagem otimizada em tabela
- [x] UsersPage.js (NOVA) - Gestão de usuários
- [x] CompanySelector.js - Modal de seleção premium

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

### P0 - Urgente
- [ ] Atualizar demais páginas com o tema AURION

### P1 - Alta Prioridade
- [ ] Corrigir bug de usabilidade no CompanySelector (estado)
- [ ] Criar tela de configuração de CFOPs de devolução
- [ ] Adicionar indicador visual para notas de "mesma empresa"

### P2 - Média Prioridade
- [ ] Refatorar server.py em módulos
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

## Changelog

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
