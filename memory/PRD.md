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

### Sessão Atual (Fevereiro 2026)

#### 1. Validador PIS/COFINS Redesenhado (P0) ✅
**Implementado em:** 18/02/2026

- **Nova Estrutura de Tela:**
  - CFOPs de Exceção no topo (Entradas/Saídas separados)
  - Lista de NCMs com regras abaixo
  - Estatísticas: Total NCMs, OK, Alerta, Divergente, Sem Regra

- **Lógica Automática:**
  - NCMs em CFOPs de exceção → CST 49/98 automaticamente
  - NCMs em CFOPs normais → Usa regra cadastrada

- **Endpoints:**
  - `GET /api/validador-pis-cofins/{company_id}/dados`
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
  - `GET /api/validador-icms/{company_id}/sugestoes`

#### 3. Menu ICMS ST Condicional (P2) ✅
**Implementado em:** Já estava implementado, confirmado funcionando

- Menu "ICMS ST" só aparece para empresas com `apura_icms_st: true`
- Empresa COMERCIAL RS LTDA tem `apura_icms_st: false` → menu oculto

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

#### Reorganização do Menu ✅
- Validador ICMS dentro do submenu ICMS

---

## Backlog Priorizado

### P1 - Alta Prioridade
- [ ] Integrar regras dos validadores ao assistente de importação
- [ ] Totalizador por CST nas telas de CRÉDITOS/DÉBITOS de PIS/COFINS

### P2 - Média Prioridade
- [ ] Pacote Docker On-Premise
- [ ] Popular página "Insights IA"
- [ ] Expandir suíte de testes pytest

### P3 - Baixa Prioridade
- [ ] Refatorar `server.py` em módulos separados
- [ ] Melhorar tratamento de React key warnings

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
│   ├── server.py          # Monólito FastAPI (requer refatoração futura)
│   └── services/
│       └── pis_cofins_calculator.py
└── frontend/
    └── src/
        ├── components/
        │   └── Layout.js   # Menu dinâmico
        └── pages/
            ├── ValidadorPisCofins.js  # Reescrito
            └── ValidadorICMS.js       # Atualizado
```

### Coleções MongoDB
- `companies` - Empresas e configurações
- `xml_documents` - Documentos fiscais
- `icms_rules` - Regras de ICMS por empresa
- `pis_cofins_rules` - Regras de PIS/COFINS por empresa

---

## Credenciais de Teste
- **Ambiente:** `https://pis-cofins-auto.preview.emergentagent.com`
- **Usuário:** `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa:** COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b, UI: 6026)
- **Competência:** 01/2026

---

## Última Atualização
**Data:** 18/02/2026
**Responsável:** Agente E1
**Status:** Todas as tarefas P0 concluídas e testadas
