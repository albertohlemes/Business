# AURION - Núcleo de Inteligência Operacional
## Product Requirements Document (PRD)

### Visão Geral
Sistema de inteligência fiscal automatizada para empresas brasileiras. Processa documentos fiscais (NF-e, CT-e, NFS-e) e calcula apurações de impostos (PIS/COFINS, ICMS, IPI, ISS, etc.).

---

## Funcionalidades Implementadas

### Sessão Atual (18/02/2026 - Atualização 2)

#### Validador ICMS - Melhorias de UI/UX ✅

**1. Contadores como Botões de Filtro**
- Total, OK, Alerta, Divergente, Sem Regra agora são clicáveis
- Filtram a tabela instantaneamente
- Visual indica filtro ativo (ring dourado)
- `data-testid="filter-icms-{status}"` para automação

**2. Colunas Ordenáveis em Todas as Abas**
- **Por Produto**: 8 colunas ordenáveis (Produto, NCM, Qtd, Valor, Alíq. Prat., Alíq. Esp., Diverg., Status)
- **Por NCM**: 6 colunas ordenáveis (NCM, Qtd Itens, Valor Total, Alíq. Prat., Alíq. Esp., Status)
- **Regras**: 6 colunas ordenáveis (Tipo, Chave, Descrição, Alíq. Int., Alíq. Inter., Base Legal)
- Ícones de seta indicam direção da ordenação

**3. Correção de Produtos ST**
- Produtos com CST 10, 30, 60, 70 (Substituição Tributária) agora têm alíquota esperada 0%
- Não acusa mais divergência incorreta para vendas de produtos ST
- Flag `is_st` adicionado nos dados do produto

#### Validador PIS/COFINS - NCM Completo ✅

**1. NCM de 8 Dígitos**
- Agrupamento agora por NCM completo (8 dígitos) ao invés de 4
- Permite diferenciação de tributação por desdobramento
- Regras podem ser criadas para NCM específico ou prefixo (fallback)

### Sessão Anterior (18/02/2026)

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
- [ ] Refatorar server.py - extrair lógica dos validadores para módulos separados

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
        └── ValidadorICMS.js       # Atualizado - filtros e ordenação
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

#### RegraICMS
```python
{
  "tipo": "ncm" | "produto",
  "chave": str,
  "aliquota_interna": float,
  "aliquota_interestadual_sul_sudeste": float,
  "aliquota_interestadual_outros": float,
  "aliquota_st": float,
  "aplica_st": bool,
  "excecoes": [...]
}
```

---

## Credenciais de Teste
- **URL:** `https://pis-cofins-rules.preview.emergentagent.com`
- **Usuário:** `alberto.lemes@businessconta.com.br` / `@Ahl142536`
- **Empresa:** COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Competência:** 01/2026

---

**Última Atualização:** 18/02/2026
**Status:** Todas as tarefas P0 concluídas, melhorias de UI/UX implementadas
