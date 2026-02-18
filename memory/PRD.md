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
1. **CFOPs de Transferência** - 26 CFOPs que NÃO geram PIS/COFINS
2. **Cadastro de Grupos Empresariais** - Vincular matriz + filiais
3. **Dashboard Consolidado** - PIS, COFINS, IRPJ, CSLL por empresa
4. **Carga Tributária Consolidada** - ICMS + PIS + COFINS + IRPJ + CSLL

### Acessos ao Grupos Empresariais
- **Menu Lateral**: `ANÁLISES → Grupos Empresariais`
- **Dashboard**: Card de atalho no final da página
- **URL Direta**: `/grupos-empresariais`

### Carga Tributária Consolidada
```json
{
  "carga_tributaria": {
    "faturamento": 12020965.86,
    "icms": 0.00,
    "pis": 0.00,
    "cofins": 0.00,
    "irpj": 237226.13,
    "csll": 129826.43,
    "total_federal": 367052.56,
    "total_geral": 367052.56,
    "percentual_federal": 3.05,
    "percentual_icms": 0.00,
    "percentual_total": 3.05
  }
}
```

### Bug Fix: Comparativo de Regimes
- PIS/COFINS Presumido hipotético usa base tributada (não faturamento total)

---

## Tarefas Pendentes

### P1 - IMPORTANTE
- [ ] Totalizador por CST nos detalhamentos de PIS/COFINS
- [ ] Refatoração do server.py (extrair routers)

### P2 - BACKLOG
- [ ] Pacote Docker para instalação On-Premise
- [ ] Popular página "Insights IA"
- [ ] Suíte de testes pytest mais abrangente

---

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa**: COMERCIAL RS LTDA
- **Competência com dados**: 01/2026

## Última Atualização
- **Data**: 19/02/2026
- **Status**: Sistema Matriz-Filial completo com Carga Tributária Consolidada
