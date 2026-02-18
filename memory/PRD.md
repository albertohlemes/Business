# AURION - Núcleo de Inteligência Operacional
## Product Requirements Document (PRD)

### Visão Geral
Sistema de inteligência fiscal automatizada para empresas brasileiras. Processa documentos fiscais (NF-e, CT-e, NFS-e) e calcula apurações de impostos (PIS/COFINS, ICMS, IPI, ISS, etc.).

---

## Funcionalidades Implementadas

### Sessão Atual (18/02/2026 - Atualização 3)

#### Sistema de Aplicação de Regras PIS/COFINS ✅

**1. Botões "Rever CST Entrada" e "Rever CST Saída"**
- Aplicam as regras cadastradas nos documentos da competência
- Prioridade de aplicação:
  1. CFOP de exceção (1910, 5949, etc) → sempre CST 98/49
  2. Regra específica da empresa (NCM completo)
  3. Regra padrão do sistema
- Se não houver regra, cria automaticamente e marca como "nova" para auditoria

**2. Criação Automática de Regras**
- Ao aplicar regras, se um NCM não tiver regra cadastrada:
  - Sistema busca na base padrão (REGRAS_PIS_COFINS_COMPLETAS)
  - Cria regra automaticamente para a empresa
  - Marca como `nova: true` e `criado_automaticamente: true`
  - Usuário pode auditar/editar na aba Regras

**3. Remoção de Tipos de Regra**
- Removidos "Isento" e "Suspensão" da listagem
- Tipos disponíveis:
  - Tributado (Padrão)
  - Tributado (Lucro Presumido)
  - Alíquota Zero
  - Monofásico
  - Alíquota Diferenciada

**Endpoints Criados:**
- `POST /api/validador-pis-cofins/{company_id}/aplicar-regras`
- `POST /api/validador-pis-cofins/{company_id}/criar-regra-ncm`

### Sessão Anterior (18/02/2026 - Atualização 2)

#### Validador ICMS - Melhorias de UI/UX ✅

**1. Contadores como Botões de Filtro**
- Total, OK, Alerta, Divergente, Sem Regra agora são clicáveis
- Filtram a tabela instantaneamente

**2. Colunas Ordenáveis em Todas as Abas**
- Por Produto, Por NCM, Regras

**3. Correção de Produtos ST**
- Produtos com CST 10, 30, 60, 70 (ST) têm alíquota esperada 0%

#### Validador PIS/COFINS - NCM Completo ✅
- Agrupamento por NCM de 8 dígitos

### Sessão Inicial (18/02/2026)

#### Validador PIS/COFINS Redesenhado (P0) ✅

- CFOPs de Exceção Compactos
- Abas Separadas (NCMs e Regras)
- Coluna CST mostra Entrada/Saída
- Contadores como Botões de Filtro
- Colunas Ordenáveis
- Menu de Regras Automatizado com Exceções
- Pré-carregamento Automático

#### Validador ICMS Automatizado (P0) ✅
- Pré-carregamento de regras do Regulamento ICMS
- 64 regras criadas automaticamente

---

## Backlog

### P1 - Alta Prioridade
- [ ] Integrar regras na importação de documentos com IA (classificação automática)
- [ ] Totalizador por CST nas telas de CRÉDITOS/DÉBITOS

### P2 - Média Prioridade
- [ ] Pacote Docker On-Premise
- [ ] Página "Insights IA"
- [ ] Refatorar server.py

---

## Arquitetura Técnica

### Stack
- Frontend: React + Tailwind CSS + Shadcn/UI
- Backend: FastAPI (Python) + MongoDB

### Arquivos Principais
```
/app/
├── backend/
│   └── server.py
└── frontend/
    └── src/pages/
        ├── ValidadorPisCofins.js
        └── ValidadorICMS.js
```

### CFOPs de Exceção PIS/COFINS
```python
CFOPS_EXCECAO_SEM_CREDITO_DEBITO = {
    # Entradas - CST esperado 98
    '1910': 'Bonificação',
    '1556': 'Uso/consumo',
    '2910': 'Bonificação interestadual',
    
    # Saídas - CST esperado 49
    '5910': 'Bonificação',
    '5949': 'Outra saída',
    '6910': 'Bonificação interestadual',
}
```

---

## Credenciais de Teste
- **URL:** `https://pis-cofins-rules.preview.emergentagent.com`
- **Usuário:** `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa:** COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)

---

**Última Atualização:** 18/02/2026
**Status:** Sistema de aplicação de regras implementado. Menu reorganizado. Wizard integrado.
