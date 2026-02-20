# Changelog - Aurion Fiscal

## [19/02/2026] - Correção Completa Bug CFOPs de Transferência

### Corrigido
- **BUG CRÍTICO RECORRENTE**: CFOPs de transferência (5152, 5409, etc.) estavam gerando débitos/créditos indevidamente e aparecendo em alertas

**Causa Raiz Identificada:**
1. CFOPs de transferência estavam incluídos nas listas `CFOPS_OPERACOES_DISTINTAS_UPLOAD`
2. CFOPs de transferência de SAÍDA (5152, 5409) **NÃO** estavam nas listas `CFOPS_SEM_DEBITO` do serviço `pis_cofins_calculator.py`
3. CFOPs de transferência de ENTRADA (1152, 1409) **NÃO** estavam nas listas `CFOPS_SEM_CREDITO`
4. A verificação do `cfop_original_emissor` não era considerada em vários pontos do código

**Correções Aplicadas:**
1. Removidos CFOPs de transferência de AMBAS as listas `CFOPS_OPERACOES_DISTINTAS_UPLOAD` no `server.py`
2. Adicionados TODOS os CFOPs de transferência de SAÍDA em `CFOPS_SEM_DEBITO` no `pis_cofins_calculator.py`
3. Adicionados TODOS os CFOPs de transferência de ENTRADA em `CFOPS_SEM_CREDITO` no `pis_cofins_calculator.py`
4. Modificada a função `calcular_pis_cofins_unificado` para verificar `cfop_original_emissor` além do `cfop`
5. Modificada a função `calcular_pis_cofins_por_cst` para verificar `cfop_original_emissor` além do `cfop`
6. Adicionado filtro `is_cfop_transferencia()` nos endpoints `alertas-cfop`
7. Modificado o endpoint `aplicar-regras` (Rever CST) para:
   - Verificar CFOPs de transferência como PRIORIDADE ZERO
   - Converter CFOP de saída para entrada quando necessário (5152 → 1152)
   - Atribuir CST correto (98 para entrada, 49 para saída)
   - Marcar categoria como 'transferencia'
   - Remover flag `pendente_revisao_cfop`

**Arquivos modificados:**
- `/app/backend/server.py` (múltiplas linhas)
- `/app/backend/services/pis_cofins_calculator.py` (linhas 291-387)

**IMPORTANTE - Para corrigir dados existentes:**
O usuário deve clicar no botão "Rever CST" / "Aplicar Regras" na página de validação PIS/COFINS. Isso irá:
1. Converter CFOPs de transferência de saída para entrada (5152 → 1152)
2. Atribuir CST 98 para entradas e 49 para saídas
3. Remover os alertas de CFOP pendentes

### Adicionado
- Testes unitários em `/app/backend/tests/test_cfop_transferencia.py` (9 testes)
- Testes de API em `/app/backend/tests/test_transferencia_alertas.py` (7 testes)

---

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
