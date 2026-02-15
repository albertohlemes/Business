# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Última Atualização: 16/12/2025

### Correções Aplicadas Nesta Sessão

#### 0. Bug Corrigido: Impostos zerados no Dashboard (ICMS, PIS, COFINS)

**Problema Identificado:**
Os impostos no Dashboard principal estavam aparecendo zerados mesmo com vendas de R$ 969.649,80. A causa raiz foi na função `_get_dashboard_stats_aggregated` (usada quando há mais de 5.000 documentos) que tentava ler o campo `icms_total` do documento, mas os impostos estão armazenados a nível de **PRODUTO** nos campos `v_icms`, `v_pis`, `v_cofins`.

**Correção Aplicada:**
- Adicionado um pipeline de agregação separado (`pipeline_impostos`) que usa `$unwind` para expandir o array de produtos
- O pipeline agora soma `produtos.v_icms`, `produtos.v_pis`, `produtos.v_cofins` corretamente
- Usa `$ifNull` para compatibilidade com campos alternativos (`valor_icms`, `valor_pis`, `valor_cofins`)
- Agrupa por tipo (entrada/saida) para calcular débitos e créditos separadamente

**Status**: ✅ TESTADO E VALIDADO (15/15 testes passaram)

**Resultado**:
- ICMS da Republic: R$ 30.670,24 (antes: R$ 0,00)
- PIS/COFINS: R$ 0,00 (esperado para NFCe - tributação monofásica)

#### 1. Bug Corrigido: Exclusão em massa travando o sistema (~14.000 documentos)

**Problema Identificado:**
Ao excluir grandes volumes de documentos (ex: 14.000 NFCe), o sistema travava porque:
- `delete_many` era executado com milhares de IDs de uma só vez, causando timeout
- `preview_delete_documents` carregava todos os documentos em memória (até 15.000)
- Não havia invalidação de cache após exclusão em massa

**Correção Aplicada:**
- **Processamento em Lotes (BATCH_SIZE=500)**: Todas as funções de exclusão em massa agora processam em lotes de 500 documentos
- **Preview otimizado**: Usa agregação MongoDB com `allowDiskUse=True` ao invés de carregar tudo em memória
- **Cache invalidado**: Após exclusões, o cache da empresa/competência é invalidado
- **Tratamento de erros**: Se um lote falhar, continua com os próximos

**Endpoints Refatorados:**
- `POST /api/xml/documents/preview-delete` - Preview com agregação MongoDB
- `POST /api/xml/documents/delete-bulk` - Exclusão em lotes de 500
- `DELETE /api/documents/{company_id}/{competencia}` - Exclusão por competência em lotes

**Status**: ✅ TESTADO E VALIDADO (17/17 testes passaram)

#### 1. Bug Corrigido: Dados de ICMS, PIS, COFINS não aparecendo nos relatórios

**Problema Identificado:**
Os pipelines de agregação do MongoDB estavam usando nomes de campos incorretos:
- Usava `$produtos.valor_icms` (incorreto)
- O campo correto é `$produtos.v_icms` (conforme salvo no parsing XML)

**Correção Aplicada:**
Todos os pipelines de agregação foram atualizados para usar fallback entre os dois formatos:
```javascript
"$ifNull": ["$produtos.v_icms", {"$ifNull": ["$produtos.valor_icms", 0]}]
```

#### 2. Bug Corrigido: Top 10 NCMs zerados nas versões agregadas

**Problema Identificado:**
Quando há mais de 10.000 documentos, as funções agregadas (`_get_icms_aggregated`, `_get_pis_cofins_aggregated`, `_get_ipi_aggregated`) eram chamadas, mas retornavam arrays vazios para Top 10 NCMs.

**Correção Aplicada:**
Adicionado pipeline de agregação separado em cada função agregada para calcular Top 10 NCMs por crédito e débito:
- `_get_icms_aggregated`: Agora calcula top_ncms_credito e top_ncms_debito
- `_get_pis_cofins_aggregated`: Agora calcula top_ncms_credito e top_ncms_debito
- `_get_ipi_aggregated`: Agora calcula top_10_credito e top_10_debito

#### 3. Bug Corrigido: Vilões e Oportunidades derrubando o sistema

**Problema Identificado:**
O endpoint `/api/viloes-oportunidades/{company_id}` fazia `.to_list(15000)` duas vezes (entradas e saídas), carregando até 30.000 documentos na memória, causando timeout/crash.

**Correção Aplicada:**
- Adicionada verificação de volume: se houver mais de 5.000 documentos, usa agregação otimizada
- Criada nova função `_get_viloes_oportunidades_aggregated` que usa pipeline de agregação do MongoDB
- Reduzido limite de busca para 5.000 documentos na versão normal
- Adicionada projection para carregar apenas campos necessários

### Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Cache**: cachetools (cache em memória com TTL de 5 minutos)
- **Principais Bibliotecas**: JSZip (extração ZIP no cliente), PyMuPDF (extração PDF)

## Funcionalidades Implementadas

### Sistema de Cache Inteligente
- Cache em memória para resultados de agregações pesadas
- TTL de 5 minutos
- Invalidação automática em operações de CRUD de documentos
- Endpoints de gerenciamento: `/api/cache/stats` e `/api/cache/invalidate/{company_id}`

### Sistema de Alertas de Variação
- Detecta variações bruscas (+/- 20% como padrão) em compras, vendas e impostos
- Compara com média dos últimos 12 meses
- Configurável por empresa via `limite_alerta_variacao`

### Wizard de Fechamento Fiscal (8 Etapas)
1. **Notas Canceladas** - Confirmar e processar notas fiscais canceladas
2. **Devoluções de Fornecedores** - Identificar devoluções e excluir notas referenciadas
3. **Alertas de CFOP** - Revisar CFOPs de operações distintas pendentes de revisão
4. **Classificação de CFOPs** - Converter e classificar CFOPs dos produtos
5. **PIS/COFINS Entradas** - Corrigir CST de PIS e COFINS nas entradas
6. **PIS/COFINS Saídas** - Corrigir CST de PIS e COFINS nas saídas
7. **Reforma Tributária** - Calcular IVA Dual (CBS + IBS)
8. **Concluído** - Fechamento fiscal finalizado

## Endpoints Principais

### Apurações
- `GET /api/apuracao-icms/{company_id}` - Apuração de ICMS com Top 10 NCMs
- `GET /api/pis-cofins/apuracao/{company_id}` - Apuração PIS/COFINS com Top 10 NCMs
- `GET /api/apuracao-ipi/{company_id}` - Apuração de IPI com Top 10 NCMs
- `GET /api/viloes-oportunidades/{company_id}` - Vilões e Oportunidades Tributárias (OTIMIZADO)

### Cache
- `GET /api/cache/stats` - Estatísticas do cache
- `POST /api/cache/invalidate/{company_id}` - Invalidar cache de uma empresa

## Issues Pendentes

### P0 (Alta Prioridade)
- [x] Impostos zerados no Dashboard (ICMS, PIS, COFINS) - CORRIGIDO 16/12/2025
- [x] Exclusão em massa travando o sistema (~14.000 docs) - CORRIGIDO 16/12/2025
- [x] Top 10 NCMs zerados na versão agregada - CORRIGIDO
- [x] Vilões e oportunidades derrubando sistema - CORRIGIDO
- [ ] Validação com usuário: Funcionalidades devem estar funcionando agora

### P1 (Média Prioridade)
- [ ] NF de fevereiro aparecendo nas entradas de janeiro
- [ ] Barra de progresso de importação XML travando
- [ ] Implementar visualização agrupada por dia na página de documentos
- [ ] Implementar relatórios por email para importação em lote

### P2 (Baixa Prioridade)
- [ ] Discrepância de valores entre Dashboard e SPED
- [ ] Botão de Login fica travado em "Processando..."

## Tarefas Futuras

### Refatoração Crítica (P0)
- [ ] Refatoração do monolito `server.py` (>31k linhas) - Risco técnico enorme

### Novas Funcionalidades (P1)
- [ ] Integração de CT-e (Conhecimento de Transporte Eletrônico)
- [ ] Testes automatizados para garantir estabilidade

## Schema do Banco de Dados

### collections.companies (campos relevantes)
- `limite_alerta_variacao: float` - Limiar percentual para alertas de variação (default: 20%)
- `desconsiderar_icms_despesas: bool` - Zerar ICMS de CFOPs de despesa
- `desconsiderar_icms_st: bool` - Zerar ICMS de CFOPs de mercadorias ST
- `beneficio_fiscal_icms: bool` - Empresa com benefício fiscal de ICMS

### collections.xml_documents.produtos (campos de impostos)
- `v_icms` - Valor do ICMS
- `v_bc_icms` - Base de cálculo do ICMS
- `p_icms` - Alíquota de ICMS
- `v_icms_st` - Valor do ICMS ST
- `v_pis` - Valor do PIS
- `v_cofins` - Valor do COFINS
- `v_ipi` - Valor do IPI

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`
