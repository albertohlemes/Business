# Changelog - Aurion Fiscal

## [18/02/2026] - Correções de Segurança, Bugs Críticos e Cálculos

### Corrigido
- **BUG CRÍTICO**: Página de apuração PIS/COFINS exibindo tela em branco/valores zerados
  - Causa: Erro de indentação na função `calcular_pis_cofins_unificado()` 
  - Solução: Corrigida a indentação de 120+ linhas de código

- **BUG CRÍTICO**: `KeyError: 'quantidade'` na página PIS/COFINS (empresa ANZEN)
  - Causa: Inconsistência entre `'quantidade'` e `'qtd'` em `calcular_pis_cofins_por_cst()`
  - Solução: Padronizado para `'qtd'` em todas as ocorrências

- **BUG DE CÁLCULO**: Vilões e Oportunidades calculando PIS/COFINS para NCMs de alíquota zero
  - Causa: Endpoint `/api/viloes-oportunidades` aplicava alíquotas fixas a TODOS os NCMs
  - Solução: Adicionada verificação `is_ncm_aliquota_zero(ncm)` antes de calcular PIS/COFINS
  - NCMs afetados: 1902 (massas), 1901, 1905 (produtos de cesta básica), etc.
  - Arquivos: `server.py` linhas 15638-15662 e 16039-16064

### Segurança - Controle de Acesso Grupos Empresariais
- Botões "Novo Grupo", "Editar" e "Excluir" agora só aparecem para usuários com role `admin`, `super_admin` ou `master`
- Arquivo: `/app/frontend/src/pages/GruposEmpresariais.js`

### Verificado
- Endpoint `/api/pis-cofins/apuracao/` testado com sucesso para ANZEN
- NCM 19021900 agora mostra PIS/COFINS = R$ 0,00 em Vilões e Oportunidades

---

## [14/02/2026] - Otimização de Performance Global

### Adicionado
- Funções de agregação MongoDB para endpoints críticos:
  - `_get_pis_cofins_aggregated()` - Agregação para PIS/COFINS
  - `_get_apuracao_pis_cofins_aggregated()` - Agregação para apuração antiga
  - `_get_icms_aggregated()` - Já existia, confirmado funcionamento
  - `_get_ipi_aggregated()` - Nova função para IPI
  - `_get_apuracao_periodo_aggregated()` - Nova função para período
  - `_get_apuracao_movimento_aggregated()` - Nova função para movimento
- Constantes de segurança em `server.py`:
  - `SAFE_DOCUMENT_LIMIT = 10000`
  - `AGGREGATION_THRESHOLD = 5000`
- Função helper `safe_find_documents()` para consultas seguras

### Modificado
- Todos os `.to_list(100000)` → `.to_list(15000)` (54 ocorrências)
- Todos os `.to_list(50000)` → `.to_list(15000)` (3 ocorrências)
- Todos os `.to_list(None)` → Removidos ou substituídos por limite seguro (7 ocorrências)
- Endpoints com lógica condicional: contagem prévia → agregação se >5000 docs

### Corrigido
- **BUG CRÍTICO**: Sistema travava ao acessar páginas de apuração com >15.000 documentos
- Performance: Páginas que demoravam >30s ou travavam agora carregam em <2s

### Endpoints Afetados
- `/api/pis-cofins/apuracao/{company_id}`
- `/api/apuracao-pis-cofins/{company_id}`
- `/api/apuracao-icms/{company_id}`
- `/api/apuracao-ipi/{company_id}`
- `/api/apuracao-iss/{company_id}`
- `/api/apuracao-periodo/{company_id}`
- `/api/apuracao-movimento/{company_id}`
- `/api/pis-cofins/divergencias/{company_id}`
- `/api/pis-cofins/detalhamento/{company_id}`
- `/api/analise-aliquotas-saida/{company_id}`
- `/api/dashboard/stats/{company_id}` (já estava otimizado)

---

## [14/02/2026] - Correções Anteriores na Sessão

### Corrigido
- Lógica de devoluções com valor divergente
- Botões "Manter/Excluir/Reverter" no Wizard de Fechamento
- Endpoint `/api/documents/restore/{doc_id}` para reverter desconsideração
