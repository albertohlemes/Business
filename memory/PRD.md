# PRD - Sistema de Análise Fiscal (AURION)

## Problema Original
Sistema de análise fiscal para empresas brasileiras com funcionalidades de:
- Apuração de PIS/COFINS, ICMS, IPI, ISS
- Comparativo de regimes tributários (RET)
- Simulação de Reforma Tributária (IVA Dual)
- Classificação de produtos
- Validação de alíquotas

## User Persona
- Contadores e analistas fiscais
- Empresas de contabilidade
- Gestores financeiros de empresas

## Core Requirements
1. **Consistência de Classificação**: Classificação do usuário como fonte única da verdade
2. **Precisão de Cálculos**: Apuração correta de PIS/COFINS com todos os CSTs relevantes
3. **Visualização Consistente**: Mesma estrutura de dados entre diferentes telas
4. **Exportação de Dados**: Permitir exportação de relatórios para análise externa
5. **Saldo Credor**: Gerenciamento de saldo credor anterior entre competências

---

## O que foi implementado

### Sessão 18/02/2026 - ✅ TESTADO E VALIDADO

#### 1. CFOPs Excluídos dos Cálculos de PIS/COFINS
- **IMPLEMENTADO**: CFOPs 1920, 2920, 1921, 5927, 6908 agora estão nas listas de exclusão
- Não geram mais crédito/débito de PIS/COFINS indevidamente
- Arquivo: `/app/backend/services/pis_cofins_calculator.py`

#### 2. Saldo Credor Anterior nas Apurações
- **IMPLEMENTADO**: O saldo credor anterior (PIS, COFINS, ICMS) cadastrado na empresa é exibido nas apurações
- Considera o saldo no cálculo do imposto do mês
- Se resultar em crédito, transporta automaticamente para a próxima competência
- Frontend exibe seções "Saldo Credor Anterior" e "Saldo a Transportar"
- Arquivo: `/app/backend/server.py` (endpoint /api/pis-cofins/apuracao)

#### 3. Validador de Alíquota de ICMS (NOVA FUNCIONALIDADE)
- **IMPLEMENTADO**: Nova página com 3 abas: Por Produto, Por NCM, Regras
- Compara alíquotas praticadas nas saídas vs. alíquotas esperadas (configuráveis)
- Status: OK, Alerta, Divergente, Sem Regra
- CRUD completo de regras por NCM ou por produto
- Sugestões automáticas baseadas nos NCMs mais frequentes
- Alíquotas padrão por estado (SP, RJ, MG, etc.)
- Menu: "Validador ICMS" abaixo de "ICMS"
- Arquivos: 
  - Backend: `/app/backend/server.py` (endpoints /api/validador-icms/*)
  - Frontend: `/app/frontend/src/pages/ValidadorICMS.js`

### Sessão Anterior (Dezembro 2025)

#### 4. Reforma Tributária - Dois Cenários Distintos
- **Cenário 2027 (Azul)**: PIS/COFINS → CBS (sem ICMS)
- **Reforma Completa (Amber)**: PIS/COFINS + ICMS → CBS + IBS

#### 5. ICMS Consistente na Reforma Tributária
- Usa a mesma função `_get_icms_aggregated` do menu ICMS

#### 6. PIS/COFINS - Consistência de Valores
- Endpoint de detalhamento usa função centralizada `calcular_pis_cofins_unificado`

---

## Backlog Priorizado

### P0 - Crítico
- ✅ [CONCLUÍDO] CFOPs sem crédito/débito excluídos
- ✅ [CONCLUÍDO] Saldo Credor Anterior nas apurações
- ✅ [CONCLUÍDO] Validador de Alíquota de ICMS

### P1 - Alta Prioridade
- [PENDENTE] Ocultar menu "ICMS ST" para empresas não contribuintes
- [PENDENTE] Totalizador por CST nos detalhamentos de PIS/COFINS

### P2 - Média Prioridade
- [PENDENTE] Pacote de instalação On-Premise com Docker
- [PENDENTE] Popular página `Insights IA`
- [PENDENTE] Suíte de testes automatizados com pytest

---

## Arquitetura

```
/app/
├── backend/
│   ├── server.py
│   │   ├── calcular_pis_cofins_unificado()     # Função centralizada PIS/COFINS
│   │   ├── _get_icms_aggregated()              # Função centralizada ICMS
│   │   ├── /api/pis-cofins/apuracao            # Usa função centralizada + saldo credor
│   │   ├── /api/validador-icms/*               # NOVO: Validador de alíquotas ICMS
│   │   └── /api/reforma-tributaria/apuracao    # Usa AMBAS funções centralizadas
│   └── services/
│       └── pis_cofins_calculator.py            # Listas de CFOPs centralizadas
└── frontend/
    └── src/pages/
        ├── PisCofins.js           # Com Saldo Credor Anterior
        ├── ValidadorICMS.js       # NOVO: Validador de alíquotas
        ├── ReformaTributaria.js
        └── RET.js
```

## Credenciais de Teste
- Email: alberto.lemes@businessconta.com.br
- Senha: @Ahl142536
- Empresa: COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b, código: 6026)
- Competência: 01/2026
- Saldo Credor Configurado: PIS R$ 3.000, COFINS R$ 12.000, ICMS R$ 5.000
