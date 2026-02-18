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

### Sistema Matriz-Filial (P0) - IMPLEMENTADO
1. **CFOPs de Transferência** - NÃO geram PIS/COFINS
   - Constante `CFOPS_TRANSFERENCIA` em `fiscal_constants.py`
   - Função `is_cfop_transferencia()` para verificação
   - Implementado em: `calcular_pis_cofins_unificado`, `calcular_pis_cofins_por_cst`, detalhamento e apuração
   - CFOPs: 1151-1154, 1408-1409, 2151-2154, 2408-2409, 5151-5156, 5408-5409, 6151-6156, 6408-6409

2. **Página de Grupos Empresariais** (`/grupos-empresariais`)
   - Cadastro de grupos com Matriz + Filiais
   - Dashboard consolidado com:
     - Cards de resumo (empresas, entradas, saídas, impostos federais, total)
     - Alerta de transferências desconsideradas
     - Resumo PIS/COFINS consolidado (débitos, créditos, a pagar)
     - Tabela detalhada por empresa

3. **Endpoint de Consolidação Atualizado**
   - `GET /api/grupos-empresariais/{grupo_id}/consolidado`
   - Usa `calcular_pis_cofins_unificado` para cada empresa
   - Retorna: PIS/COFINS débitos, créditos, saldo por empresa e consolidado

### Bug Fix: Comparativo de Regimes (P0) - CORRIGIDO
- **Problema**: PIS/COFINS do Lucro Presumido hipotético usava faturamento total
- **Correção**: Agora usa apenas base tributada (exclui alíquota zero, monofásicos, transferências)
- **Endpoint**: `/api/inteligencia-tributaria/{company_id}`

---

## CFOPs de Transferência (Não geram PIS/COFINS)
```python
CFOPS_TRANSFERENCIA = [
    # Entradas
    '1151', '1152', '1153', '1154', '1408', '1409',  # Internas
    '2151', '2152', '2153', '2154', '2408', '2409',  # Interestaduais
    # Saídas  
    '5151', '5152', '5153', '5155', '5156', '5408', '5409',  # Internas
    '6151', '6152', '6153', '6155', '6156', '6408', '6409',  # Interestaduais
]
```

---

## Tarefas Pendentes

### P0 - CRÍTICO
- [ ] Relatório consolidado de IRPJ/CSLL para matriz
- [ ] Carga tributária consolidada do grupo

### P1 - IMPORTANTE
- [ ] Totalizador por CST nos detalhamentos de CRÉDITOS/DÉBITOS
- [ ] Fase 2 da refatoração: extrair endpoints para routers separados

### P2 - BACKLOG
- [ ] Pacote Docker para instalação On-Premise
- [ ] Popular página "Insights IA"
- [ ] Suíte de testes pytest mais abrangente

---

## Endpoints Principais
| Endpoint | Descrição |
|----------|-----------|
| `GET /api/pis-cofins/apuracao/{company_id}` | Apuração PIS/COFINS |
| `GET /api/pis-cofins/detalhamento/{company_id}` | Detalhamento com transferências |
| `GET /api/inteligencia-tributaria/{company_id}` | Comparativo de regimes |
| `GET /api/grupos-empresariais` | Lista grupos empresariais |
| `POST /api/grupos-empresariais` | Criar grupo |
| `GET /api/grupos-empresariais/{id}/consolidado` | Dashboard consolidado |

---

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa**: COMERCIAL RS LTDA (d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Competência**: 01/2026

---

## Última Atualização
- **Data**: 19/02/2026
- **Status**: Sistema Matriz-Filial implementado + Bug do comparativo corrigido
