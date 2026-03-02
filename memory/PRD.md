# AURION - Sistema de Fechamento Fiscal

## Original Problem Statement
Sistema de gestão fiscal brasileiro com funcionalidades para importação de documentos (NFe, NFCe, CTe, NFS-e), apuração de impostos (ICMS, PIS/COFINS, ISS, IPI, Simples Nacional), integração com SIEG para automação fiscal, e análises tributárias.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) - Monolítico em server.py
- **Database**: MongoDB
- **Integração**: SIEG (plataforma de automação fiscal)

## Design System
- Fundo principal: `#0A0A0A`
- Cards/containers: `bg-[#141414]`
- Bordas: `border-[#2A2A2A]`
- Cor de destaque: `#C8A951` (dourado)

---

# CHANGELOG

## 2025-01-XX - CORREÇÃO CRÍTICA: Apuração PIS/COFINS Lucro Presumido

### Problemas Corrigidos:

1. **Lucro Presumido gerando créditos indevidamente**
   - **Antes**: Entradas com CST 50 (CFOP 1101, 2101) geravam créditos de PIS/COFINS
   - **Agora**: Lucro Presumido NÃO gera nenhum crédito de entrada (regime cumulativo)
   - Exceção: devoluções de venda (CFOPs 1201, 2201, etc.) geram estorno de débito

2. **Alíquotas incorretas exibidas**
   - **Antes**: Mostrava 1.65%/7.6% (Lucro Real) mesmo para Lucro Presumido
   - **Agora**: O retorno inclui flag `is_presumido` para que o frontend mostre alíquotas corretas (0.65%/3%)

3. **Débitos não calculados corretamente**
   - **Antes**: Total de débitos zerado no resumo
   - **Agora**: Débitos calculados corretamente com alíquotas de Lucro Presumido

### Lógica Implementada:

```
LUCRO PRESUMIDO:
├── ENTRADAS
│   ├── Devoluções (CFOP 1201, 2201, etc.) → Estorno de débito (0.65%/3%)
│   └── Demais entradas → CST 98 (sem crédito, desconsiderado)
├── SAÍDAS
│   └── Vendas tributadas → Débito (0.65%/3%)
└── SALDO = Débitos - Estornos (sem créditos)

LUCRO REAL:
├── ENTRADAS → Créditos (1.65%/7.6%) se permitido pelo CFOP/categoria
├── SAÍDAS → Débitos (1.65%/7.6%)
└── SALDO = Débitos - Créditos
```

### Files Changed:
- `/app/backend/server.py`:
  - Função `calcular_pis_cofins_unificado()`: Bloqueia créditos para Lucro Presumido
  - Função `calcular_pis_cofins_por_cst()`: Classifica entradas como CST 98 para Lucro Presumido
  - Inicialização de `totais` com campos de estorno
  - Retorno inclui `is_presumido`, `estorno_pis`, `estorno_cofins`

---

## Correções Anteriores (sessão atual):
- Tela de Monofásicos: cores e erro body stream
- Menu PIS/COFINS: erro 500 por `is_presumido` não definido
- Alíquotas nos endpoints do Validador

---

# ROADMAP

## P0 - Blockers
- [RESOLVED] Apuração PIS/COFINS Lucro Presumido com créditos indevidos
- [RESOLVED] Menu PIS/COFINS retornando erro 500
- [IN PROGRESS] Falha silenciosa na importação SIEG
- [IN PROGRESS] Upload de arquivos grandes trava

## P1 - High Priority  
- [ ] Bug de CFOPs de transferência (5152)
- [ ] Verificar colunas NFS-e

## Backlog
- [ ] Refatorar server.py (+47.000 linhas)
