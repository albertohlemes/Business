# AURION - Sistema de Inteligência Tributária Operacional

## Visão Geral
Sistema fiscal brasileiro completo para apuração de impostos (PIS/COFINS, ICMS, IRPJ/CSLL), análise tributária, validação de documentos fiscais e gestão de grupos empresariais (Matriz-Filial).

## Última Atualização: 19/02/2026
- Correção do bug recorrente de CFOPs de transferência (5152, 5409, etc.) que apareciam em Alertas de CFOP
- Adicionados testes unitários e de API para validação do fix

## Stack Tecnológica
- **Frontend**: React 18 + TailwindCSS + Lucide Icons
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT

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

### Documentos
- `GET /api/documentos/{company_id}` - Listar documentos
- `POST /api/upload/{company_id}` - Upload de XMLs

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa Matriz**: COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Grupo**: Grupo Comercial RS (com 1 filial: TEKNOLINK SJC)

## Backlog

### P0 (Crítico)
- [x] ~~Página Grupo Consolidado com 6 abas~~
- [x] ~~Markup (Vendas/Compras)~~
- [x] ~~Impostos individualizados com percentuais~~
- [x] ~~Saldos credores de PIS/COFINS exibidos corretamente~~
- [x] ~~Bug de tela em branco na página PIS/COFINS (erro de indentação em calcular_pis_cofins_unificado)~~
- [x] ~~Bug recorrente: CFOPs de transferência (5152, 5409, etc.) aparecendo em Alertas de CFOP~~ (CORRIGIDO 19/02/2026)

### P1 (Alta Prioridade)
- [ ] Totalizador por CST nos detalhamentos de créditos/débitos PIS/COFINS
- [ ] Refatoração do server.py (extrair rotas para APIRouter separados)
- [ ] Corrigir modal de seleção de empresa em páginas globais (sobrepõe UI) - Bug que o modal de seleção sobrepõe a interface em páginas que não o exigem (ex: /admin/grupos-empresariais)

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
- **18/02/2026**: Adicionado Markup (Vendas/Compras), impostos individualizados com badges CREDOR/DEVEDOR, e correção de saldos credores PIS/COFINS.
- **18/02/2026**: Implementada página "Grupo Consolidado" com 6 abas (Indicadores, ICMS, PIS/COFINS, IRPJ/CSLL, RET, Reforma Tributária). Menu aparece apenas para empresas matriz.
- **17/02/2026**: Corrigido bug no cálculo do Lucro Presumido hipotético (usava receita total em vez de tributável).
- **16/02/2026**: Backend Matriz-Filial: exclusão de CFOPs de transferência dos cálculos de impostos.
