# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Última Atualização: 16/12/2025

### Bug Corrigido: Dados de ICMS, PIS, COFINS não aparecendo nos relatórios

**Problema Identificado:**
Os pipelines de agregação do MongoDB estavam usando nomes de campos incorretos para buscar dados de impostos:
- Usava `$produtos.valor_icms` (incorreto)
- O campo correto é `$produtos.v_icms` (conforme salvo no parsing XML)

O mesmo problema afetava:
- Base de ICMS (`bc_icms` vs `v_bc_icms`)
- Valor de PIS (`valor_pis` vs `v_pis`)
- Valor de COFINS (`valor_cofins` vs `v_cofins`)
- Valor de IPI (`valor_ipi` vs `v_ipi`)
- ICMS ST (`valor_icms_st` vs `v_icms_st`)

**Correção Aplicada:**
Todos os pipelines de agregação foram atualizados para usar fallback entre os dois formatos:
```javascript
"$ifNull": ["$produtos.v_icms", {"$ifNull": ["$produtos.valor_icms", 0]}]
```

**Endpoints Corrigidos:**
- Dashboard de stats histórico (linha ~9820)
- Apuração PIS/COFINS agregada (linha ~11289)
- Apuração Período simplificada (linha ~11879)
- Apuração Movimento (linha ~20954)
- Apuração ICMS agregada (linha ~21526)
- Apuração IPI agregada (linha ~23001)
- PIS/COFINS Apuração (linha ~23303)

### Lógica de Classificação com IA (Hierarquia de 6 Regras)
A classificação de produtos segue uma hierarquia estrita:
1. **CFOP de Devolução** - Automático para CFOPs de devolução
2. **Regras Aprendidas (learned_rules)** - Cache de classificações anteriores (manuais ou IA)
3. **NCM de Vendas** - Match com produtos vendidos pelo mesmo NCM
4. **Palavras-chave de Vendas** - Match com descrições de produtos vendidos
5. **Palavras-chave da Empresa** - Cadastradas no perfil da empresa
6. **IA Gemini** - Último recurso, usa LLM para classificar

**IMPORTANTE**: Classificações manuais SEMPRE sobrepõem regras anteriores e são salvas em `learned_rules` para uso futuro.

### Paleta de Cores
- **Azul** - Entradas/Compras
- **Verde/Emerald** - Saídas/Créditos
- **Amber/Orange** - Alertas/Pendências
- **Cyan/Teal** - Devoluções, Jobs em Background
- **Slate** - Contribuições (CSLL, PIS, COFINS)
- **Vermelho** - Valores a Pagar/Erros

## Diretriz Principal do Wizard de Fechamento
O **Wizard de Fechamento** é uma **réplica manual exata** da **Importação com IA**:
- **Se importou SEM IA**: O Wizard faz o trabalho que a IA faria manualmente
- **Se importou COM IA**: O Wizard serve como validador

| Etapa Wizard | O que a IA faz na Importação | O que o Wizard faz |
|--------------|------------------------------|-------------------|
| 1 - Canceladas | Detecta via cStat=101/151 | Confirma e marca canceladas |
| 2 - Devoluções | Desconsiderada CFOP devolução | Desconsiderada notas de terceiros |
| 3 - Alertas CFOP | Gera alertas pendentes | Resolve todos alertas CFOP |
| 4 - Classificação | Classifica com IA | Classifica com IA |
| 5 - PIS/COFINS Entrada | Calcula CST | Calcula/Corrige CST |
| 6 - PIS/COFINS Saída | Calcula CST | Calcula/Corrige CST |
| 7 - Reforma Tributária | Calcula IVA Dual | Visualiza cálculo |

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Cache**: cachetools (cache em memória com TTL de 5 minutos)
- **Principais Bibliotecas**: JSZip (extração ZIP no cliente), PyMuPDF (extração PDF)

## Funcionalidades Implementadas

### Sistema de Cache Inteligente
- Cache em memória para resultados de agregações pesadas
- TTL de 5 minutos
- Invalidação automática em operações de CRUD de documentos
- Endpoints de gerenciamento: `/api/cache/stats` e `/api/cache/clear`

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

### Wizard de Fechamento
- `GET /api/wizard-fechamento/status/{company_id}` - Status atual
- `GET /api/wizard-fechamento/step/{company_id}/{step_id}` - Dados de etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/complete` - Completar etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/go` - Navegar para etapa
- `GET /api/wizard-fechamento/relatorio/{company_id}` - Gerar relatório PDF/Excel

### Apurações
- `GET /api/apuracao-icms/{company_id}` - Apuração de ICMS com Top 10 NCMs
- `GET /api/apuracao-pis-cofins/{company_id}` - Apuração PIS/COFINS
- `GET /api/apuracao-ipi/{company_id}` - Apuração de IPI
- `GET /api/pis-cofins/divergencias/{company_id}` - Divergências de PIS/COFINS
- `GET /api/relatorio-divergencias-saida/{company_id}` - Divergências nas saídas
- `GET /api/relatorio-divergencias-entrada/{company_id}` - Divergências nas entradas

### Cache
- `GET /api/cache/stats` - Estatísticas do cache
- `POST /api/cache/clear` - Limpar cache

## Issues Pendentes

### P0 (Alta Prioridade)
- [ ] Validação com usuário: Página de PIS/COFINS travando na base de produção (otimização feita, pendente validação)
- [ ] Validação com usuário: ICMS, NCMs, divergências agora devem aparecer após correção dos pipelines

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
