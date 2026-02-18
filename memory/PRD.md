# AURION - Sistema Fiscal Brasileiro
## Product Requirements Document

### Problema Original
Sistema de gestão fiscal para empresas brasileiras com validadores de PIS/COFINS e ICMS, permitindo auditoria de alíquotas, CSTs e integração de regras customizadas por empresa.

### Arquitetura
- **Frontend**: React (porta 3000)
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB
- **Preview URL**: https://validator-system.preview.emergentagent.com

---

## ✅ Funcionalidades Implementadas (19/02/2026)

### Sistema Matriz-Filial (P0) - COMPLETO
1. **CFOPs de Transferência** - NÃO geram PIS/COFINS
   - 26 CFOPs de transferência cadastrados
   - Implementado em todas as funções de cálculo

2. **Dashboard Consolidado com IRPJ/CSLL**
   - Cards resumo: Empresas, Entradas, Saídas, PIS+COFINS, IRPJ+CSLL, Total Federal
   - Cards detalhados: PIS, COFINS, IRPJ (15% + adicional 10%), CSLL (9%)
   - Tabela por empresa com todos os impostos
   - Alerta de transferências desconsideradas

3. **Cálculo IRPJ/CSLL por Empresa**
   - Base presumida (8% comércio / 32% serviços)
   - IRPJ 15% + adicional 10% sobre excedente R$ 20.000
   - CSLL 9%
   - Tipo de atividade configurável por empresa

### Bug Fix: Comparativo de Regimes (P0) - CORRIGIDO
- PIS/COFINS Presumido hipotético agora usa base tributada

---

## Endpoints de Consolidação

```
GET /api/grupos-empresariais/{grupo_id}/consolidado?competencia=MM/YYYY

Response:
{
  "grupo_nome": "Grupo Comercial RS",
  "total_empresas": 2,
  "resumo": { "total_entradas", "total_saidas" },
  "pis": { "debito", "credito", "saldo", "a_pagar" },
  "cofins": { "debito", "credito", "saldo", "a_pagar" },
  "irpj": { "base_presumida", "devido", "adicional", "total" },
  "csll": { "base_presumida", "devido" },
  "total_impostos_federais": ...,
  "empresas": [
    {
      "razao_social", "cnpj", "is_matriz",
      "pis_saldo", "cofins_saldo",
      "irpj_base", "irpj_total",
      "csll_base", "csll_devido"
    }
  ]
}
```

---

## Tarefas Pendentes

### P0 - CRÍTICO
- [x] ~~CFOPs de transferência~~
- [x] ~~Bug comparativo de regimes~~
- [x] ~~Relatório IRPJ/CSLL consolidado~~
- [ ] Carga tributária consolidada (total geral com ICMS)

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
- **Empresa**: COMERCIAL RS LTDA (d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Competência com dados**: 01/2026

---

## Última Atualização
- **Data**: 19/02/2026
- **Status**: Relatório IRPJ/CSLL consolidado implementado
