# AURION - Núcleo de Inteligência Operacional
## Product Requirements Document (PRD)

### Visão Geral
Sistema de inteligência fiscal automatizada para empresas brasileiras. Processa documentos fiscais (NF-e, CT-e, NFS-e) e calcula apurações de impostos (PIS/COFINS, ICMS, IPI, ISS, etc.).

---

## Funcionalidades Implementadas

### Sessão Atual (18/02/2026)

#### Validador PIS/COFINS Redesenhado (P0) ✅

**1. CFOPs de Exceção Compactos**
- Uma linha por CFOP com badges coloridos
- Entradas sempre CST 98 esperado
- Saídas sempre CST 49 esperado
- Hover mostra detalhes (descrição, quantidade, valor)

**2. Abas Separadas**
- Aba "NCMs" - Lista de NCMs com filtros e ordenação
- Aba "Regras" - Gerenciamento de regras separado

**3. Coluna CST mostra Entrada/Saída**
- Ex: 73/06 (praticado)
- Ex: esp: 50/01 (esperado)

**4. Contadores como Botões de Filtro**
- Clique filtra a tabela
- Visual indica filtro ativo

**5. Colunas Ordenáveis**
- Clique no cabeçalho ordena crescente/decrescente

**6. Menu de Regras Automatizado**
- Tributado: CST 50/01, PIS 1.65%, COFINS 7.6%
- Alíquota Zero: CST 73/06, 0%/0%
- Monofásico: CST 70/04, 0%/0%
- Alíquota Diferenciada: CST 51/02, customizado

**7. Sistema de Exceções**
- Palavra-chave + NCM que NÃO segue a regra
- Exceções aparecem na listagem de Regras
- Badge laranja indica exceção

**8. Pré-carregamento Automático**
- Botão cria regras baseadas na legislação
- 108 regras criadas automaticamente

**Endpoints:**
- `GET /api/validador-pis-cofins/{company_id}/dados`
- `POST /api/validador-pis-cofins/{company_id}/inicializar-regras`
- `GET/POST/PUT/DELETE /api/validador-pis-cofins/{company_id}/regras`

#### Validador ICMS Automatizado (P0) ✅
- Pré-carregamento de regras do Regulamento ICMS
- 64 regras criadas automaticamente
- Exceções (ex: cachaça vs. outras bebidas)

---

## Backlog

### P1 - Alta Prioridade
- [ ] Integrar regras ao reprocessamento de documentos
- [ ] Totalizador por CST nas telas de CRÉDITOS/DÉBITOS

### P2 - Média Prioridade
- [ ] Pacote Docker On-Premise
- [ ] Página "Insights IA"

---

## Arquitetura Técnica

### Stack
- Frontend: React + Tailwind CSS + Shadcn/UI
- Backend: FastAPI (Python) + MongoDB
- Ambiente: Kubernetes

### Arquivos Principais
```
/app/
├── backend/
│   └── server.py
└── frontend/
    └── src/pages/
        ├── ValidadorPisCofins.js  # Reescrito
        └── ValidadorICMS.js
```

### Modelos de Dados

#### RegraPisCofins
```python
{
  "tipo_regra": "tributado" | "aliquota_zero" | "monofasico" | "aliquota_diferenciada",
  "cst_esperado_entrada": str,
  "cst_esperado_saida": str,
  "aliquota_pis": float,
  "aliquota_cofins": float,
  "excecoes": [
    {"chave": str, "cst_entrada": str, "cst_saida": str, "aliquota_pis": float, "aliquota_cofins": float}
  ]
}
```

---

## Credenciais de Teste
- **URL:** `https://pis-cofins-auto.preview.emergentagent.com`
- **Usuário:** `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa:** COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Competência:** 01/2026

---

**Última Atualização:** 18/02/2026
**Status:** Todas as tarefas P0 concluídas
