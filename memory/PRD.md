# PRD - Sistema de Análise Fiscal

## Problema Original
Sistema de análise fiscal para empresas brasileiras com funcionalidades de:
- Apuração de PIS/COFINS
- Comparativo de regimes tributários (RET)
- Simulação de Reforma Tributária (IVA Dual)
- Classificação de produtos

## User Persona
- Contadores e analistas fiscais
- Empresas de contabilidade
- Gestores financeiros de empresas

## Core Requirements
1. **Consistência de Classificação**: Classificação do usuário como fonte única da verdade
2. **Precisão de Cálculos**: Apuração correta de PIS/COFINS com todos os CSTs relevantes
3. **Visualização Consistente**: Mesma estrutura de dados entre diferentes telas
4. **Exportação de Dados**: Permitir exportação de relatórios para análise externa

---

## O que foi implementado

### Sessão Atual (Dezembro 2025)

#### 1. Reforma Tributária - Dois Cenários Distintos
- **Cenário 2027 (Azul)**: PIS/COFINS → CBS (sem ICMS)
- **Reforma Completa (Amber)**: PIS/COFINS + ICMS → CBS + IBS
- Interface visual clara separando os dois cenários
- Cálculo de economia/aumento para cada cenário

#### 2. ICMS Consistente na Reforma Tributária
- **CORRIGIDO**: Agora usa a MESMA função `_get_icms_aggregated` do menu ICMS
- Valores de crédito, débito e saldo ICMS agora são consistentes
- Considera CFOPs de despesas e ST conforme configuração da empresa

#### 3. PIS/COFINS - Consistência de Valores
- **CORRIGIDO**: Endpoint de detalhamento usa função centralizada `calcular_pis_cofins_unificado`
- Os totais do saldo são consistentes com a aba Apuração

#### 4. Botão Exportar PIS/COFINS
- **IMPLEMENTADO**: Função de exportação CSV funcionando

---

## Backlog Priorizado

### P0 - Crítico
- [PENDENTE VALIDAÇÃO] Testar valores de ICMS na Reforma Tributária
- [PENDENTE VALIDAÇÃO] Testar consistência de PIS/COFINS entre as 3 telas

### P1 - Alta Prioridade
- Ocultar menu "ICMS ST" para empresas não contribuintes
- Totalizador por CST nos detalhamentos de PIS/COFINS

### P2 - Média Prioridade
- Pacote de instalação On-Premise com Docker
- Popular página `Insights IA`
- Suíte de testes automatizados com pytest

---

## Arquitetura

```
/app/
├── backend/
│   └── server.py
│       ├── calcular_pis_cofins_unificado()     # Função centralizada PIS/COFINS
│       ├── _get_icms_aggregated()              # Função centralizada ICMS
│       ├── /api/pis-cofins/apuracao            # Usa função centralizada
│       ├── /api/pis-cofins/detalhamento        # Usa função centralizada para totais
│       ├── /api/apuracao-icms                  # Usa _get_icms_aggregated
│       └── /api/reforma-tributaria/apuracao    # Usa AMBAS funções centralizadas
└── frontend/
    └── src/pages/
        ├── ReformaTributaria.js  # 2 cenários: 2027 (CBS) e Completo (CBS+IBS)
        ├── RET.js
        └── PisCofins.js
```

## Credenciais de Teste
- Email: alberto.lemes@businessconta.com.br
- Senha: @Ahl142536
- Empresa: COMERCIAL RS LTDA (ID: 6026)
- Competência: 01/2026
