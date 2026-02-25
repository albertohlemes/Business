# AURION - Sistema de Inteligência Tributária Operacional

## Visão Geral
Sistema fiscal brasileiro completo para apuração de impostos (PIS/COFINS, ICMS, IRPJ/CSLL), análise tributária, validação de documentos fiscais e gestão de grupos empresariais (Matriz-Filial).

## Última Atualização: 25/02/2026
- **NOVO**: Painel de Monitoramento da Integração SIEG implementado
- **NOVO**: Job agendado (APScheduler) para sincronização automática diária às 06:00
- **NOVO**: Página /sieg-monitor com 4 abas: Visão Geral, Empresas, Histórico, Cancelados
- **NOVO**: Configuração de sync por empresa (ativo, automático, frequência, horário)
- Autenticação OAuth2/JWT com a API do SIEG funcionando

## Stack Tecnológica
- **Frontend**: React 18 + TailwindCSS + Lucide Icons
- **Backend**: FastAPI (Python) + APScheduler
- **Database**: MongoDB
- **Auth**: JWT
- **Integração**: SIEG Soluções (OAuth2/JWT)

## Funcionalidades Implementadas

### Core
- [x] Autenticação JWT com controle de permissões
- [x] Cadastro e gestão de empresas
- [x] Upload de XMLs (NF-e, CT-e, NFS-e) individual e em lote
- [x] Central de Fechamento (resumo mensal)
- [x] Dashboard com indicadores

### Impostos
- [x] **PIS/COFINS**: Apuração não-cumulativa com créditos/débitos por CST
- [x] **ICMS**: Apuração com créditos/débitos, ST e DIFAL
- [x] **IPI**: Apuração para indústrias
- [x] **ISS**: Apuração para serviços
- [x] **Impostos Retidos**: IRRF, CSRF, INSS, ISS
- [x] **Simples Nacional**: Cálculo DAS
- [x] **Transporte de Saldos Credores**: Saldos a recuperar são transportados para o próximo mês

### Análises
- [x] Vilões e Oportunidades (análise de créditos perdidos)
- [x] Comparativo de Regimes Tributários (Real vs Presumido)
- [x] Análise Horizontal (evolução temporal)
- [x] Reforma Tributária (simulação IBS/CBS)

### Matriz-Filial (NOVO - v01/2026)
- [x] **Grupos Empresariais**: Cadastro de grupos (matriz + filiais)
- [x] **Grupo Consolidado**: Nova página com 6 abas:
  1. **Indicadores**: Entradas, Compras, Saídas, Vendas, **Markup** consolidados + Impostos individualizados (PIS, COFINS, ICMS, IRPJ, CSLL) com badges CREDOR/DEVEDOR
  2. **ICMS**: Débito/Crédito/A Pagar ou A Recuperar por empresa e consolidado
  3. **PIS/COFINS**: Apuração centralizada com **saldos credores** exibidos corretamente
  4. **IRPJ/CSLL**: Base presumida e impostos devidos por empresa
  5. **RET**: Comparativo Lucro Real vs Presumido consolidado
  6. **Reforma Tributária**: Simulação IBS/CBS para o grupo

### Validadores
- [x] Validador PIS/COFINS (CST, alíquotas, NCM)
- [x] Validador ICMS (CST, CFOP, alíquotas)
- [x] Classificação Inteligente (NCM, CFOP)

### Integração SIEG (NOVO - 25/02/2026)
- [x] **Painel de Monitoramento**: Visualização do status de todas as empresas
- [x] **Configuração por Empresa**: Ativar/desativar SIEG, sync automático, frequência
- [x] **Histórico de Sincronizações**: Log de execuções com status, contadores, duração
- [x] **Notas Canceladas**: Visualização de NF-e canceladas/inutilizadas
- [x] **Job Agendado**: APScheduler para sync automático diário às 06:00
- [x] **Autenticação OAuth2**: Token JWT com cache de 23 horas

## Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Empresas
- `GET /api/empresas` - Listar empresas
- `GET /api/empresa/{company_id}/grupo-info` - Info de grupo (is_matriz, filiais)
- `GET /api/empresa/{company_id}/impostos-grupo` - Impostos consolidados do grupo

### Impostos
- `GET /api/pis-cofins/{company_id}` - Apuração PIS/COFINS
- `GET /api/icms/{company_id}` - Apuração ICMS
- `GET /api/inteligencia-tributaria/{company_id}` - Comparativo de regimes
- `GET /api/saldo-credor/{company_id}/listar` - Histórico de saldos credores

### Documentos
- `GET /api/documentos/{company_id}` - Listar documentos
- `POST /api/upload/{company_id}` - Upload de XMLs

### Integração SIEG
- `GET /api/sieg/painel` - Visão geral de todas as empresas
- `GET /api/sieg/painel/{company_id}` - Detalhes de uma empresa
- `POST /api/sieg/config/{company_id}` - Configurar sync de empresa
- `GET /api/sieg/historico/{company_id}` - Histórico de sincronizações
- `GET /api/sieg/cancelados/{company_id}` - Notas canceladas
- `GET /api/sieg/scheduler-status` - Status do job agendado
- `POST /api/sieg/sync/{company_id}` - Sincronizar manualmente

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa Matriz**: COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Empresa Teste ANZEN**: ID: 24e47135-2657-47d5-a112-cd2c06357370
- **Grupo**: Grupo Comercial RS (com 1 filial: TEKNOLINK SJC)

## Backlog

### P0 (Crítico)
- [x] ~~Página Grupo Consolidado com 6 abas~~
- [x] ~~Markup (Vendas/Compras)~~
- [x] ~~Impostos individualizados com percentuais~~
- [x] ~~Saldos credores de PIS/COFINS exibidos corretamente~~
- [x] ~~Bug de tela em branco na página PIS/COFINS~~
- [x] ~~Bug recorrente: CFOPs de transferência aparecendo em Alertas~~ 
- [x] ~~Transporte de saldos credores entre competências~~ (CORRIGIDO 26/06/2026)
- [x] ~~Painel de Monitoramento SIEG~~ (IMPLEMENTADO 25/02/2026)

### P1 (Alta Prioridade)
- [ ] Resolver bloqueio da API SIEG para download de XMLs (possivelmente IP Whitelisting)
- [ ] Processamento incorreto de CFOPs de transferência
- [ ] Totalizador por CST nos detalhamentos de créditos/débitos PIS/COFINS
- [ ] Refatoração do server.py (extrair rotas para APIRouter separados)
- [ ] Corrigir modal de seleção de empresa em páginas globais (sobrepõe UI)
- [ ] Corrigir bugs de cálculo e agregação no menu "Grupo Consolidado"
- [ ] Corrigir geração incorreta de natureza de operação no arquivo SPED para transferências

### P2 (Média Prioridade)
- [ ] Pacote de instalação On-Premise com Docker
- [ ] Popular página Insights IA
- [ ] Suíte de testes pytest mais abrangente

## Arquitetura de Arquivos
```
/app/
├── backend/
│   ├── server.py          # FastAPI (monolito - precisa refatorar)
│   ├── models/            # Modelos Pydantic
│   └── utils/             # Utilitários
└── frontend/
    └── src/
        ├── components/
        │   └── Layout.js  # Menu lateral com condição isMatriz
        ├── pages/
        │   ├── GrupoConsolidado.js  # 6 abas com markup, impostos individualizados
        │   ├── PisCofins.js
        │   ├── ApuracaoICMS.js
        │   └── ...
        └── context/
            └── AppContext.js  # Contexto global (empresa, competência)
```

## Changelog
- **26/06/2026**: **CORREÇÃO CRÍTICA** - Transporte de saldos credores entre competências agora funciona corretamente em todos os endpoints (Dashboard, Apuração ICMS, PIS/COFINS, RET, Reforma Tributária). Saldos são salvos na collection `saldos_credores` e transportados para o mês seguinte.
- **19/02/2026**: Bug de CFOPs de transferência corrigido
- **18/02/2026**: Adicionado Markup, impostos individualizados com badges CREDOR/DEVEDOR
- **18/02/2026**: Implementada página "Grupo Consolidado" com 6 abas
- **17/02/2026**: Corrigido bug no cálculo do Lucro Presumido hipotético
- **16/02/2026**: Backend Matriz-Filial: exclusão de CFOPs de transferência dos cálculos
