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

#### 1. Reforma Tributária - Card Regime Atual
- **IMPLEMENTADO**: Card "Regime Atual Completo" com estrutura tabular igual ao "Cenário 2027"
- Tabela com colunas: IMPOSTO | CRÉDITO | DÉBITO | SALDO
- PIS, COFINS e ICMS mostrados em linhas separadas com valores corretos
- Mostra "Recuperar" para saldos credores

#### 2. RET - Cálculo de Economia
- **IMPLEMENTADO**: Economia agora é calculada comparando com segundo melhor regime
- Antes: comparava com o pior regime (inflava economia)
- Agora: economia = segundoMelhorRegime - melhorRegime

#### 3. PIS/COFINS - Exportação
- **IMPLEMENTADO**: Função de exportação para CSV
- Botão "Exportar" agora funciona
- Exporta: resumo + entradas (créditos) + saídas (débitos)

#### 4. Backend - Credito Bruto
- **IMPLEMENTADO**: Adicionado `credito_bruto` ao endpoint de reforma tributária
- Permite frontend calcular corretamente economia/aumento

---

## Backlog Priorizado

### P0 - Crítico
- [PENDENTE VALIDAÇÃO] Testar correções da Reforma Tributária e RET com usuário

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
│   └── server.py          # Monólito FastAPI
└── frontend/
    └── src/
        ├── pages/
        │   ├── ReformaTributaria.js
        │   ├── RET.js
        │   └── PisCofins.js
        └── components/
```

## Endpoints Principais
- `/api/reforma-tributaria/apuracao` - Dados de reforma tributária
- `/api/inteligencia-tributaria/{id}` - Comparativo de regimes (RET)
- `/api/pis-cofins/apuracao/{id}` - Apuração PIS/COFINS
- `/api/pis-cofins/detalhamento/{id}` - Detalhamento por NCM/CFOP/CST

## Credenciais de Teste
- Email: alberto.lemes@businessconta.com.br
- Senha: @Ahl142536
- Empresa: COMERCIAL RS LTDA (ID: 6026)
- Competência: 01/2026
