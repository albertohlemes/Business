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

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Emergent LLM (Gemini)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **IA**: Gemini 2.5 Flash via Emergent LLM Key

## Prioritized Backlog

### P0 (Crítico)
- (Implementado)

### P1 (Alta Prioridade)
- Relatórios exportáveis em PDF/Excel
- Histórico de alterações por colaborador
- Notificações de dissídios pendentes

### P2 (Média Prioridade)
- Integração com sistemas de folha (Domínio, Fortes)
- Comparativo mensal automático de folha
- Dashboard com métricas por cliente

### P3 (Baixa Prioridade)
- Multi-tenancy para vários escritórios
- API para integração externa
- App mobile para aprovações

## Próximos Passos
1. Testar fluxos completos com documentos reais
2. Adicionar upload múltiplo de documentos
3. Melhorar precisão da extração de IA
4. Implementar relatórios exportáveis
