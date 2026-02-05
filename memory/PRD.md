# Portal DP - Departamento Pessoal

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## User Personas
- **Profissionais de DP**: Assistentes e analistas de departamento pessoal
- **Contadores**: Gestores responsáveis pela folha de pagamento
- **Clientes**: Empresas que terceirizam o DP para o escritório

## Core Requirements (Static)
1. **Dissídio Automatizado**: Upload de convenção coletiva → IA extrai reajustes → Aprovação → Lançamento
2. **Admissões Inteligentes**: Upload de documentos → IA extrai dados → Preenche ficha automaticamente
3. **Recomposição de Médias**: Importação histórico 12-24 meses → Cálculo automático para férias/rescisão
4. **Validação de Folha**: Comparação com mês anterior → Detecção de discrepâncias
5. **Conferência Informes de Rendimento**: Comparação eSocial vs Sistema interno

## Implementado (05/02/2026)

### MVP Inicial
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas
- ✅ CRUD Colaboradores
- ✅ Dashboard com estatísticas
- ✅ Módulo Dissídio (upload PDF, extração IA, aprovação)
- ✅ Módulo Admissões (upload docs, extração IA Gemini)
- ✅ Módulo Médias (importação histórico)
- ✅ Módulo Validação Folha (análise automatizada)
- ✅ Módulo Informes Rendimento (comparação eSocial)
- ✅ Interface PT-BR completa

### Melhorias FiscalFlow (05/02/2026)
- ✅ Cadastro de empresa com busca na Receita Federal (API ReceitaWS)
- ✅ Formatação automática de CNPJ
- ✅ Preenchimento automático de razão social, fantasia, endereço, telefone, email
- ✅ Seletor de Empresa + Competência no header
- ✅ Modal de seleção estilo FiscalFlow com lista de empresas em cards
- ✅ Campo de competência (MM/AAAA)
- ✅ Código da empresa visível (#XXXX)
- ✅ Dashboard com header mostrando empresa/competência selecionada
- ✅ Persistência de seleção no localStorage

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Emergent LLM (Gemini 2.5 Flash)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **API Receita Federal**: ReceitaWS (gratuita)

## Prioritized Backlog

### P0 (Crítico)
- (Implementado)

### P1 (Alta Prioridade)
- Relatórios exportáveis em PDF/Excel
- Histórico de alterações por colaborador
- Notificações de dissídios pendentes
- Filtrar colaboradores/dissídios por empresa selecionada

### P2 (Média Prioridade)
- Integração com sistemas de folha (Domínio, Fortes)
- Comparativo mensal automático de folha
- Dashboard com métricas por cliente

### P3 (Baixa Prioridade)
- Multi-tenancy para vários escritórios
- API para integração externa
- App mobile para aprovações

## Próximos Passos
1. Filtrar dados do dashboard pela empresa selecionada
2. Adicionar upload múltiplo de documentos
3. Implementar relatórios exportáveis
4. Comparativo automático mensal de folha
