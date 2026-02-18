# AURION - Sistema Fiscal Brasileiro
## Product Requirements Document

### Arquitetura
- **Frontend**: React (porta 3000)
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB
- **Preview URL**: https://validator-system.preview.emergentagent.com

---

## ✅ Implementações Concluídas (19/02/2026)

### Sistema Matriz-Filial - COMPLETO

#### 1. CFOPs de Transferência
- 26 CFOPs que NÃO geram PIS/COFINS (transferência entre matriz/filiais)

#### 2. Cadastro de Grupos Empresariais
- Página `/grupos-empresariais` para criar/editar grupos
- Vincular matriz + filiais

#### 3. Painel Dinâmico em PIS/COFINS, RET e Reforma Tributária
**Componente:** `GrupoEmpresarialPanel.js`

Quando a empresa selecionada é matriz de um grupo, exibe automaticamente:
- **Card da Matriz**: dados da empresa matriz
- **Cards das Filiais**: cada filial com seus impostos
- **Card Consolidado**: soma de matriz + filiais

**Tabs disponíveis:**
- Consolidado (visão geral)
- Matriz (detalhes)
- Filiais (lista completa)

**Páginas integradas:**
- `/pis-cofins` - PIS/COFINS
- `/ret` - Comparativo de Regimes (RET)
- `/reforma-tributaria` - Reforma Tributária

#### 4. Carga Tributária Consolidada
- ICMS + PIS + COFINS + IRPJ + CSLL
- Percentuais sobre faturamento
- Detalhamento por empresa

### Endpoints Novos
```
GET /api/empresa/{company_id}/grupo-info
- Verifica se empresa é matriz/filial
- Retorna informações do grupo

GET /api/empresa/{company_id}/impostos-grupo?competencia=MM/YYYY
- Retorna impostos de todas empresas do grupo
- Matriz, Filiais, Consolidado
```

### Bug Fix: Comparativo de Regimes
- PIS/COFINS Presumido hipotético usa base tributada

---

## Tarefas Pendentes

### P1 - IMPORTANTE
- [ ] Totalizador por CST nos detalhamentos
- [ ] Refatoração do server.py (extrair routers)

### P2 - BACKLOG
- [ ] Pacote Docker On-Premise
- [ ] Popular página "Insights IA"

---

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa Matriz**: COMERCIAL RS LTDA
- **Competência com dados**: 01/2026

## Última Atualização
- **Data**: 19/02/2026
- **Status**: Painel dinâmico Matriz-Filial implementado em PIS/COFINS, RET e Reforma Tributária
