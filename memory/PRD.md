# AURION - Núcleo de Inteligência Operacional
## Product Requirements Document (PRD)

### Visão Geral
Sistema de inteligência fiscal automatizada para empresas brasileiras. Processa documentos fiscais (NF-e, CT-e, NFS-e) e calcula apurações de impostos (PIS/COFINS, ICMS, IPI, ISS, etc.).

### Usuários-Alvo
- Contadores e analistas fiscais
- Empresas de comércio, indústria e serviços
- Escritórios de contabilidade

---

## Funcionalidades Implementadas

### Sessão Atual (18/02/2026)

#### 1. Validador PIS/COFINS Redesenhado (P0) ✅
**Implementado e testado em:** 18/02/2026

- **Nova Estrutura de Tela:**
  - CFOPs de Exceção no topo (Entradas/Saídas separados)
  - Lista de NCMs com regras abaixo
  - Estatísticas: Total NCMs, OK, Alerta, Divergente, Sem Regra

- **Contadores como Botões de Filtro:**
  - Clique no contador filtra a tabela
  - Visual indica filtro ativo com ring
  - "Clique para limpar" quando filtro ativo

- **Colunas Ordenáveis:**
  - Clique no cabeçalho ordena a coluna
  - Ícone indica direção (ascendente/descendente)
  - Funciona para NCM, Valor, Alíquotas, Status

- **Menu de Regras Automatizado:**
  - **Tributado (Padrão)**: CST 50/01, PIS 1.65%, COFINS 7.6%
  - **Tributado (Lucro Presumido)**: CST 70/01, PIS 0.65%, COFINS 3.0%
  - **Alíquota Zero**: CST 73/06, PIS 0%, COFINS 0%
  - **Monofásico**: CST 70/04, PIS 0%, COFINS 0%
  - **Alíquota Diferenciada**: CST 51/02, alíquotas customizadas
  - **Isento**: CST 73/08, PIS 0%, COFINS 0%
  - **Suspensão**: CST 70/09, PIS 0%, COFINS 0%

- **Sistema de Exceções:**
  - Adicionar palavras-chave de produtos que NÃO seguem a regra
  - Definir CST e alíquotas específicos para exceções
  - Ex: NCM 2208 (destilados) com exceção para "CACHACA"

- **Pré-carregamento Automático:**
  - Botão "Pré-carregar Regras" cria regras baseadas na legislação
  - Usa NCMs dos documentos fiscais da empresa
  - Aplica tipo correto (aliquota_zero, monofasico, tributado)
  - Considera regime tributário (Lucro Real vs Presumido)

- **Endpoints:**
  - `GET /api/validador-pis-cofins/{company_id}/dados`
  - `POST /api/validador-pis-cofins/{company_id}/inicializar-regras`
  - `GET/POST/PUT/DELETE /api/validador-pis-cofins/{company_id}/regras`

#### 2. Automação do Validador ICMS (P0) ✅
**Implementado em:** 18/02/2026

- **Pré-carregamento Automático de Regras:**
  - Baseado no Regulamento ICMS do estado da empresa
  - Analisa NCMs dos documentos de SAÍDA
  - Cria regras com alíquotas e base legal do RICMS

- **Regras Padrão RICMS SP:**
  - Alimentos cesta básica: 7%
  - Bebidas alcoólicas: 25% (exceto cachaça 18%)
  - Eletrônicos: 12%
  - Combustíveis: 25% (ST)

- **Endpoints:**
  - `POST /api/validador-icms/{company_id}/inicializar-regras`

#### 3. Menu ICMS ST Condicional (P2) ✅
- Menu "ICMS ST" só aparece para empresas com `apura_icms_st: true`

---

### Sessões Anteriores

#### Saldo Credor Anterior (PIS/COFINS/ICMS) ✅
- Campos no cadastro da empresa
- Aplicado automaticamente nas apurações mensais
- Transportado para o mês seguinte

#### Validador ICMS v1 ✅
- Análise por Produto e por NCM
- CRUD de regras com exceções (ex: cachaça vs. outras bebidas)
- Alíquotas diferenciadas: interna vs. interestadual

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Integrar regras dos validadores ao assistente de importação
- [ ] Totalizador por CST nas telas de CRÉDITOS/DÉBITOS de PIS/COFINS

### P2 - Média Prioridade
- [ ] Pacote Docker On-Premise
- [ ] Popular página "Insights IA"
- [ ] Expandir suíte de testes pytest
- [ ] Corrigir React key warning em Layout.js

### P3 - Baixa Prioridade
- [ ] Refatorar `server.py` em módulos separados

---

## Arquitetura Técnica

### Stack
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python) + MongoDB
- **Ambiente:** Kubernetes

### Estrutura de Arquivos Principais
```
/app/
├── backend/
│   ├── server.py          # Monólito FastAPI
│   ├── services/
│   │   └── pis_cofins_calculator.py
│   └── tests/
│       └── test_iteration70_validador_piscofins.py
└── frontend/
    └── src/
        ├── components/
        │   └── Layout.js
        └── pages/
            ├── ValidadorPisCofins.js  # Reescrito com filtros, ordenação, exceções
            └── ValidadorICMS.js
```

### Modelos de Dados Principais

#### RegraPisCofins
```python
{
  "id": str,
  "company_id": str,
  "tipo": "ncm" | "cfop" | "produto",
  "chave": str,  # NCM, CFOP ou código
  "descricao": str,
  "tipo_regra": "tributado" | "aliquota_zero" | "monofasico" | "aliquota_diferenciada" | "isento" | "suspensao",
  "aliquota_pis": float,
  "aliquota_cofins": float,
  "gera_credito": bool,
  "gera_debito": bool,
  "cst_esperado_entrada": str,
  "cst_esperado_saida": str,
  "excecoes": [
    {"chave": str, "descricao": str, "cst_entrada": str, "cst_saida": str, "aliquota_pis": float, "aliquota_cofins": float}
  ],
  "base_legal": str,
  "observacao": str
}
```

---

## Credenciais de Teste
- **Ambiente:** `https://pis-cofins-auto.preview.emergentagent.com`
- **Usuário:** `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa:** COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b, UI: 6026)
- **Competência:** 01/2026
- **Regras:** 108 regras PIS/COFINS, 64 regras ICMS pré-carregadas

---

## Últimos Testes
- **iteration_69.json**: Backend 100%, Frontend 100% - Validadores básicos
- **iteration_70.json**: Backend 100%, Frontend 100% - Melhorias (filtros, ordenação, exceções, tipos automatizados)

---

## Última Atualização
**Data:** 18/02/2026
**Responsável:** Agente E1
**Status:** Todas as tarefas P0 concluídas e testadas com 100% de sucesso
