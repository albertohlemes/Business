# AURION - Sistema de Inteligência Tributária Operacional

## Visão Geral
Sistema fiscal brasileiro completo para apuração de impostos (PIS/COFINS, ICMS, IRPJ/CSLL), análise tributária, validação de documentos fiscais e gestão de grupos empresariais (Matriz-Filial).

## Última Atualização: 27/02/2026 (Sessão 6)

### Correções e Melhorias - Sessão 6 (27/02/2026)

**BUG CRÍTICO CORRIGIDO: Benefício Fiscal ICMS de Restaurante não aplicado na versão agregada**

**Problema identificado:**
- Empresas com benefício fiscal de restaurante/bar (onde NENHUM produto gera crédito ICMS) ainda mostravam créditos indevidos
- O bug ocorria APENAS quando a empresa tinha mais de 500 documentos
- A função `_get_icms_aggregated` (otimizada para grandes volumes) não aplicava a regra de benefício fiscal

**Causa raiz:**
Na função `_get_icms_aggregated` (linha 26924), o código verificava apenas:
```python
is_desconsiderado = (is_despesa and desconsiderar_despesas) or (is_st and desconsiderar_st)
```
Faltava a verificação: `or beneficio_zera_tudo`

**Solução aplicada:**
1. Adicionada verificação de `beneficio_zera_tudo` para tipos de benefício `restaurante`, `bar`, `lanchonete`
2. Adicionada verificação para lista de produtos contendo "TODOS"
3. Quando ativo, TODO o ICMS de entrada é desconsiderado (zerado)
4. Adicionada variável `icms_beneficio_desc` para rastrear separadamente o valor desconsiderado por benefício
5. Atualizado o retorno `desconsiderados.beneficio_fiscal` para mostrar:
   - `valor_icms`: valor total desconsiderado
   - `tipo_beneficio`: tipo do benefício (restaurante, bar, etc.)
   - `motivo`: descrição do motivo da exclusão
6. Atualizado `flags` para incluir `beneficio_fiscal_icms`, `tipo_beneficio_fiscal`, `beneficio_zera_tudo`

**Arquivos modificados:**
- `/app/backend/server.py` - função `_get_icms_aggregated` (linhas 26924-27330)

**Resultado esperado:**
- Empresa MAC (M & A DE MORAES RESTAURANTE) com competência 02/2026 deve mostrar:
  - Crédito ICMS: R$ 0,00
  - Desconsiderados > Benefício Fiscal: valor total de ICMS das entradas
  - Flags > beneficio_zera_tudo: true

---

**INVESTIGAÇÃO: Bug de Importação Silenciosa do SIEG**

**Problema reportado:**
- Empresa "DI PIETRA PORCELANATOS" mostrava importação SIEG bem-sucedida, mas nenhum documento era salvo no banco
- A API SIEG retornava 12 XMLs, mas a contagem de documentos no banco era zero

**Melhorias implementadas na lógica de filtro:**

1. **Função `filtrar_xmls_novos()` aprimorada** (`sieg_smart_sync.py`):
   - Adicionado logging detalhado para diagnóstico
   - Adicionado suporte a formato alternativo de chave NFe (`<infNFe Id="NFe...">`)
   - Adicionado contador de XMLs sem chave detectável
   - XMLs vazios são agora logados e ignorados corretamente

2. **Função `get_chaves_ja_importadas()` aprimorada** (`sieg_smart_sync.py`):
   - Adicionada busca por campo alternativo `chave_acesso`
   - Adicionado diagnóstico quando existem documentos mas nenhuma chave é encontrada
   - Logging detalhado do total de documentos vs chaves encontradas

3. **Verificação de duplicatas melhorada** (`server.py`):
   - Verificação de duplicata agora só ocorre se `chave_nfe` não estiver vazia
   - Para documentos sem chave, verificação alternativa por `numero_nfe` + `emitente_cnpj`/`destinatario_cnpj`
   - Logging detalhado dos primeiros documentos processados para diagnóstico

4. **Novo endpoint de diagnóstico** (`GET /api/sieg/debug-import/{company_id}`):
   - Simula o processo de importação SEM salvar dados
   - Retorna análise detalhada de cada etapa:
     - Chaves já importadas
     - XMLs baixados do SIEG
     - Análise de entradas (com_chave, sem_chave, duplicados, novos)
     - Análise de saídas
     - Diagnóstico final com causa provável

**Status:** O bug não pode ser reproduzido no ambiente de preview pois a empresa "DI PIETRA" não está cadastrada. As melhorias de logging e diagnóstico permitirão identificar a causa raiz quando o problema ocorrer novamente.

---

### Feature: Colunas "Serviço" e "Retenções" em NFS-e (Sessão 5)

**Status:** Implementado, aguardando verificação com dados reais

**Implementação:**
- Frontend: `/app/frontend/src/pages/Documents.js` (linhas 2839-2954)
  - Coluna "Serviço" mostra `doc.servicos?.[0]?.descricao` ou `doc.discriminacao_servico`
  - Coluna "Retenções" mostra `doc.total_retencoes` formatado como moeda
  - Ambas colunas visíveis apenas nas abas `servicos_tomados` e `servicos_prestados`
  
- Backend: `/app/backend/server.py` (linhas 12580-12596)
  - Calcula `total_retencoes` somando: ISS, PIS, COFINS, CSLL, IR, INSS, outras retenções
  - Extrai `discriminacao_servico` do array de serviços se não existir

---

### Correções e Melhorias - Sessão 5 (27/02/2026)

**BUG CRÍTICO CORRIGIDO: CFOPs de operações distintas não convertidos na importação SIEG**

**Problema identificado:**
- Notas de entrada importadas via SIEG com CFOPs de saída do fornecedor (5xxx/6xxx) **não estavam sendo convertidos** para CFOPs de entrada (1xxx/2xxx)
- Exemplo: Bonificação recebida de fornecedor com CFOP 5910 deveria ser convertida para 1910, mas permanecia como 5910
- Isso causava erros graves na apuração de PIS/COFINS:
  - CFOPs de saída (5910, 5920, 5202, etc.) apareciam na seção de **DÉBITOS** (saídas)
  - Valores de créditos ficavam incorretos
  - Totais de entradas vs saídas não batiam

**CFOPs afetados:**
| CFOP Original | CFOP Corrigido | Descrição |
|---------------|----------------|-----------|
| 5910 | 1910 | Bonificação/Doação |
| 5920 | 1920 | Remessa para Armazém |
| 5921 | 1921 | Retorno de Vasilhame |
| 5202 | 1202 | Devolução de compra |
| 6910 | 2910 | Bonificação/Doação (interestadual) |
| 6920 | 2920 | Remessa para Armazém (interestadual) |

**Solução aplicada:**
1. Corrigida a lógica de processamento de "operações distintas" na importação SIEG (`server.py` linhas 7510-7588)
2. Criada tabela `CFOP_OPERACAO_DISTINTA_CONVERSAO` com mapeamento correto
3. CFOPs de saída (5xxx/6xxx) são agora convertidos para entrada (1xxx/2xxx)
4. CFOP original preservado em `cfop_original_emissor`
5. Script de correção de dados existentes: `/app/backend/scripts/fix_cfop_sieg_entries.py`

**Dados corrigidos no banco:**
- 78 documentos corrigidos
- 128 produtos corrigidos
- Conversões: 5910→1910 (53), 5202→1202 (46), 5920→1920 (10), 5921→1921 (6), 6910→2910 (8), 6920→2920 (4)

**Resultado após correção:**
- Apuração PIS/COFINS COMERCIAL RS (02/2026):
  - Créditos PIS: R$ 126.274,37
  - Créditos COFINS: R$ 581.626,82
  - Débitos PIS: R$ 100.254,58
  - Débitos COFINS: R$ 461.783,39
  - Saldo credor: R$ 163.992,17

---

### Correções e Melhorias - Sessão 4 (continuação)

**BUG CRÍTICO CORRIGIDO: Classificação CST PIS/COFINS incorreta**

**Problema identificado:**
- CFOPs de saída (5xxx, 6xxx) apareciam na seção de créditos (entradas)
- CFOPs de entrada (1xxx, 2xxx) poderiam aparecer na seção de débitos (saídas)
- Isso acontecia porque o sistema usava o campo `tipo` do documento como referência, mas em devoluções esse campo pode não corresponder ao CFOP

**Solução aplicada:**
- Alterado para usar o **primeiro dígito do CFOP** como referência primária
- CFOPs 1, 2, 3 → sempre tratados como ENTRADA
- CFOPs 5, 6, 7 → sempre tratados como SAÍDA
- Corrigido em 3 funções principais:
  - `calcular_pis_cofins_unificado()`
  - `calcular_pis_cofins_por_cst()`
  - `calcular_confronto_cfop_cst()`

**Arquivos modificados:**
- `/app/backend/server.py` - linhas ~1631, ~1911, ~2105

**Resultado após correção:**
| CFOP | CST Antes | CST Correto | Status |
|------|-----------|-------------|--------|
| 1102 (Compra) | 98 ❌ | 50 ✅ | CORRIGIDO |
| 5102 (Venda) | 49 ❌ | 01 ✅ | CORRIGIDO |
| 5910 (Outras saídas) | 50 ❌ | 49 ✅ | CORRIGIDO |
| 1406 (Exceção) | 50 ❌ | 98 ✅ | CORRIGIDO |

### Correções e Melhorias - Sessão 4
- **CORRIGIDO CRÍTICO**: Filtro de NFs Ausentes não considerava notas de entrada emitidas pela empresa
  - Problema: Notas de entrada emitidas pela própria empresa (devoluções, retornos - CFOP 1xxx, 2xxx) não eram consideradas na sequência numérica
  - Impacto: Total Ausentes era 494 quando deveria ser 470 (24 notas a mais incorretamente)
  - Solução: Removido filtro `$or: [{tipo: saida}]` e agora busca todas notas onde `emitente_cnpj = CNPJ da empresa`
  - Resultado: Total Emitidas passou de 3.636 para 3.660, Total Ausentes de 494 para 470
  
- **INVESTIGADO**: NF 377217 não existe no SIEG (nota provavelmente inutilizada/rejeitada)
  - Verificado: NF 377216 emitida às 19:40:45, NF 377218 emitida às 19:40:48 (apenas 3 segundos)
  - A NF 377217 deveria ter sido emitida entre esses horários mas não existe
  - Conclusão: Número foi inutilizado ou a nota foi rejeitada na emissão
  - A nota está corretamente marcada como "ausente" no relatório

- **NOVO**: Endpoint de resincronização por data específica
  - `POST /api/sieg/resync-data/{company_id}` - permite reimportar notas de uma data específica
  - Útil para corrigir falhas pontuais de sincronização sem reprocessar o mês inteiro
  - Parâmetro: `data_especifica` (formato YYYY-MM-DD)
  - Baixa apenas notas daquele dia específico, evitando rate limits

- **MELHORADO**: Serviço SIEG com suporte a `data_fim_override`
  - Permite buscar notas de um período específico (não só a partir de uma data)
  - Usado pelo endpoint de resync para buscar apenas 1 dia

## Sessão 3 - 26/02/2026
- **CORRIGIDO CRÍTICO**: Bug que impedia download de saídas do SIEG
  - Problema: Sincronização trazia apenas entradas, não trazia saídas
  - Causa: Faltava `import asyncio` no arquivo `sieg_service.py`
  - Solução: Adicionado import correto; agora baixa entradas E saídas
- **CORRIGIDO**: Bug crítico de valores PIS/COFINS no Dashboard
  - Problema: Dashboard mostrava valores diferentes da página PIS/COFINS e Fechamento Mensal
  - Causa: Versão "pequena" do Dashboard (<=500 docs) usava cálculo manual próprio, diferente da versão agregada
  - Solução: Ambas as versões agora usam `calcular_pis_cofins_unificado()` para 100% de consistência
- **CORRIGIDO**: CFOP de operações especiais mantido original
  - Problema: CFOP 1921 (retorno vasilhame) estava sendo convertido para 1102
  - Causa: CFOPs de entrada especiais (19xx) não estavam na lista de operações distintas
  - Solução: Adicionados CFOPs 1910-1949 e 2910-2949 à lista; código não converte mais o CFOP
- **CORRIGIDO**: Relatório de NFs Ausentes agora considera apenas saídas da empresa
  - Problema: Relatório mostrava gaps de notas de entrada emitidas pela empresa (falsos positivos)
  - Solução: Adicionado filtro `emitente_cnpj` para considerar apenas notas onde empresa é emitente
- **CORRIGIDO**: Texto "(SUA VENDA)" alterado para "NOTA REFERENCIADA"
  - O texto anterior causava confusão, fazendo parecer que a NF de saída estava sendo excluída
- **CORRIGIDO**: Apuração ICMS agora usa saldo credor inicial do cadastro
  - Problema: Menu ICMS/Apuração não considerava o saldo credor informado no cadastro da empresa
  - Causa: Código duplicado que não usava a função centralizada `buscar_saldos_credores_anteriores`
  - Solução: Ambas versões (normal e agregada) agora usam a função centralizada
- **NOVO**: Verificação proativa de CNPJ no SIEG
  - Endpoint `GET /api/sieg/verificar-cnpj/{company_id}` verifica se CNPJ está autorizado no cofre
  - Validação antes de iniciar sincronização com mensagem de erro clara
  - Card de alerta na UI do SIEG Monitor quando CNPJ não está cadastrado
  - Instruções passo-a-passo para resolver o problema
- **NOVO**: Endpoint de diagnóstico SIEG
  - `GET /api/sieg/diagnostico/{company_id}` retorna status completo da integração
  - Útil para debug de problemas de sincronização

## Sessão 2 - 26/02/2026
- **CORRIGIDO**: Estatísticas SIEG filtradas por competência selecionada
  - Problema: Totais (Docs SIEG, Docs Manuais) mostravam valores globais, não do mês
  - Solução: Endpoint `/sieg/painel/{company_id}` agora aceita `?competencia=` e filtra
- **CORRIGIDO**: Histórico SIEG com botão "Ver Relatório" funcional
  - Problema: Coluna "Ações" não mostrava botão pois faltava `id` e `tem_relatorio`
  - Solução: Backend agora retorna esses campos no histórico
- **MELHORADO**: Relatório detalhado de cada sincronização
  - Endpoint `/sieg/relatorio-sync/{company_id}/{sync_id}` retorna notas importadas
  - Exibe: número NF, emitente, valor, data, categoria classificada

## Sessão 1 - 26/02/2026
- **CORRIGIDO**: Parser de NFS-e (Nota Fiscal de Serviço Eletrônica) para formato SIEG
  - Problema: NFS-e importadas via SIEG estavam com dados em branco (número, emissor, valor)
  - Causa: Estrutura XML do SIEG usa `NFSe > infNFSe` (formato Nacional/SERPRO) diferente do ABRASF
  - Solução: Parser expandido para suportar múltiplas estruturas (Nacional, ABRASF, Betha, etc.)
  - Campos extraídos: nNFSe, emit.xNome, emit.CNPJ, valores.vServPrest, dhProc, DPS.toma
- **CORRIGIDO**: Botão "Sincronizar Agora" no menu SIEG não funcionava
  - Problema: Endpoint esperava FormData, mas frontend enviava JSON
  - Solução: Alterado `startSync()` para usar FormData com campo `competencia`
- **MELHORADO**: Feedback visual durante sincronização SIEG
  - Toast "Sincronização iniciada..." ao clicar
  - Toast final com estatísticas: importados, duplicados, erros
  - Spinner animado no botão durante processamento
- **MELHORADO**: Resiliência do serviço SIEG a erros de rede
  - Sistema de retry (até 3 tentativas) para erros 500+ e rate limit
  - Aguarda e retenta em caso de rate limit (429)
  - Continua com próximos tipos XML em caso de falha parcial
- **CORRIGIDO**: Scheduler SIEG carrega horário do banco ao iniciar e agenda inteligentemente
  - Se horário configurado ainda não passou hoje → executa hoje
  - Se já passou → executa amanhã
- **CORRIGIDO**: Bug do transporte de saldos credores
- **MELHORADO**: Cálculo ICMS-ST separado (entradas vs saídas) para contribuintes substitutos
- **MELHORADO**: UI do card SIEG na página de Documentos (banner simplificado + botão sync)
- **APRIMORADO**: Sincronização Inteligente SIEG (Smart Sync) - Validação de Devoluções com Valor
    - Número da última NF
    - Status da cobertura (Atualizado / X dias atrás)
    - Alerta de divergências de devolução pendentes de análise
  - Modo incremental: só processa XMLs novos (duplicados são ignorados)
  - Filtragem por chave NFe: evita reprocessar documentos já importados
  - Detecção de devoluções de fornecedor (finNFe=4, refNFe)
  - Verificação de cancelamentos posteriores
  - Logs detalhados: encontrados, novos, duplicados, importados, devoluções
- **CONCLUÍDO**: Qualquer usuário pode configurar horário de sincronização
- **CONCLUÍDO**: Centralização da Configuração SIEG - configuração movida para dentro da empresa
- **CONCLUÍDO**: Integração SIEG 100% funcional - download automático de XMLs funcionando
- Campos SIEG (`sieg_ativo`, `sieg_sync_automatico`, `sieg_frequencia`) na empresa
- WizardEmpresa com seção de Integração SIEG no step 5 (Benefícios)
- Endpoint de migração `/api/sieg/migrate-config` para dados antigos
- Scheduler lê configuração diretamente da coleção `companies`
- Paginação automática - baixa TODOS os XMLs (não apenas 50)
- Processamento completo igual ao upload manual:
  - Classificação com IA/cache/regras
  - Detecção de devoluções (finNFe=4, CFOP devolução, NFe referenciada)
  - Verificação de cancelamentos
  - Marcação de notas desconsideradas
- Painel de Monitoramento SIEG (/sieg-monitor) com 4 abas
- Job agendado (APScheduler) para sincronização automática diária

## Stack Tecnológica
- **Frontend**: React 18 + TailwindCSS + Lucide Icons
- **Backend**: FastAPI (Python) + APScheduler
- **Database**: MongoDB
- **Auth**: JWT
- **Integração**: SIEG Soluções (OAuth2/JWT)

## Funcionalidades Implementadas

### Core
- [x] Autenticação JWT com controle de permissões
- [x] Cadastro e gestão de empresas
- [x] Upload de XMLs (NF-e, CT-e, NFS-e) individual e em lote
- [x] Central de Fechamento (resumo mensal)
- [x] Dashboard com indicadores

### Impostos
- [x] **PIS/COFINS**: Apuração não-cumulativa com créditos/débitos por CST
- [x] **ICMS**: Apuração com créditos/débitos, ST e DIFAL
- [x] **IPI**: Apuração para indústrias
- [x] **ISS**: Apuração para serviços
- [x] **Impostos Retidos**: IRRF, CSRF, INSS, ISS
- [x] **Simples Nacional**: Cálculo DAS
- [x] **Transporte de Saldos Credores**: Saldos a recuperar são transportados para o próximo mês

### Análises
- [x] Vilões e Oportunidades (análise de créditos perdidos)
- [x] Comparativo de Regimes Tributários (Real vs Presumido)
- [x] Análise Horizontal (evolução temporal)
- [x] Reforma Tributária (simulação IBS/CBS)

### Matriz-Filial (NOVO - v01/2026)
- [x] **Grupos Empresariais**: Cadastro de grupos (matriz + filiais)
- [x] **Grupo Consolidado**: Nova página com 6 abas:
  1. **Indicadores**: Entradas, Compras, Saídas, Vendas, **Markup** consolidados + Impostos individualizados (PIS, COFINS, ICMS, IRPJ, CSLL) com badges CREDOR/DEVEDOR
  2. **ICMS**: Débito/Crédito/A Pagar ou A Recuperar por empresa e consolidado
  3. **PIS/COFINS**: Apuração centralizada com **saldos credores** exibidos corretamente
  4. **IRPJ/CSLL**: Base presumida e impostos devidos por empresa
  5. **RET**: Comparativo Lucro Real vs Presumido consolidado
  6. **Reforma Tributária**: Simulação IBS/CBS para o grupo

### Validadores
- [x] Validador PIS/COFINS (CST, alíquotas, NCM)
- [x] Validador ICMS (CST, CFOP, alíquotas)
- [x] Classificação Inteligente (NCM, CFOP)

### Integração SIEG (ATUALIZADO - 25/02/2026)
- [x] **Painel de Monitoramento**: Visualização do status de todas as empresas
- [x] **Configuração CENTRALIZADA na Empresa**: Campos `sieg_ativo`, `sieg_sync_automatico`, `sieg_frequencia` diretamente no cadastro da empresa
- [x] **WizardEmpresa**: Seção de Integração SIEG no step 5 (Benefícios)
- [x] **Migração de Dados**: Endpoint `/api/sieg/migrate-config` para migrar configurações antigas
- [x] **Histórico de Sincronizações**: Log de execuções com status, contadores, duração
- [x] **Notas Canceladas**: Visualização de NF-e canceladas/inutilizadas
- [x] **Job Agendado**: APScheduler para sync automático diário às 03:00
- [x] **Autenticação OAuth2**: Token JWT com cache de 23 horas

## Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Empresas
- `GET /api/empresas` - Listar empresas
- `GET /api/empresa/{company_id}/grupo-info` - Info de grupo (is_matriz, filiais)
- `GET /api/empresa/{company_id}/impostos-grupo` - Impostos consolidados do grupo

### Impostos
- `GET /api/pis-cofins/{company_id}` - Apuração PIS/COFINS
- `GET /api/icms/{company_id}` - Apuração ICMS
- `GET /api/inteligencia-tributaria/{company_id}` - Comparativo de regimes
- `GET /api/saldo-credor/{company_id}/listar` - Histórico de saldos credores

### Documentos
- `GET /api/documentos/{company_id}` - Listar documentos
- `POST /api/upload/{company_id}` - Upload de XMLs

### Integração SIEG
- `GET /api/sieg/painel` - Visão geral de todas as empresas (lê de `companies.sieg_*`)
- `GET /api/sieg/painel/{company_id}` - Detalhes de uma empresa
- `POST /api/sieg/config/{company_id}` - Configurar sync (atualiza empresa diretamente)
- `POST /api/sieg/migrate-config` - Migra configurações antigas para empresas
- `GET /api/sieg/historico/{company_id}` - Histórico de sincronizações
- `GET /api/sieg/cancelados/{company_id}` - Notas canceladas
- `GET /api/sieg/scheduler-status` - Status do job agendado
- `POST /api/sieg/sync/{company_id}` - Sincronizar manualmente

## Credenciais de Teste
- **Email**: alberto.lemes@businessconta.com.br
- **Senha**: @Ahl142536
- **Empresa Matriz**: COMERCIAL RS LTDA (ID: d7f30ea1-9df3-4124-a561-12984ffff64b)
- **Empresa Teste ANZEN**: ID: 24e47135-2657-47d5-a112-cd2c06357370
- **Grupo**: Grupo Comercial RS (com 1 filial: TEKNOLINK SJC)

## Backlog

### P0 (Crítico)
- [x] ~~Página Grupo Consolidado com 6 abas~~
- [x] ~~Markup (Vendas/Compras)~~
- [x] ~~Impostos individualizados com percentuais~~
- [x] ~~Saldos credores de PIS/COFINS exibidos corretamente~~
- [x] ~~Bug de tela em branco na página PIS/COFINS~~
- [x] ~~Bug recorrente: CFOPs de transferência aparecendo em Alertas~~ 
- [x] ~~Transporte de saldos credores entre competências~~ (CORRIGIDO 26/06/2026)
- [x] ~~Painel de Monitoramento SIEG~~ (IMPLEMENTADO 25/02/2026)

### P1 (Alta Prioridade)
- [x] ~~Centralizar configuração SIEG no cadastro da empresa~~ (CONCLUÍDO 25/02/2026)
- [ ] Processamento incorreto de CFOPs de transferência (BUG RECORRENTE)
- [ ] Refatoração do server.py (extrair rotas para APIRouter separados)
- [ ] Corrigir modal de seleção de empresa em páginas globais (sobrepõe UI)
- [ ] Corrigir bugs de cálculo e agregação no menu "Grupo Consolidado"
- [ ] Corrigir geração incorreta de natureza de operação no arquivo SPED para transferências
- [ ] Totalizador por CST nos detalhamentos de créditos/débitos PIS/COFINS

### P2 (Média Prioridade)
- [ ] Pacote de instalação On-Premise com Docker
- [ ] Popular página Insights IA
- [ ] Suíte de testes pytest mais abrangente

## Arquitetura de Arquivos
```
/app/
├── backend/
│   ├── server.py          # FastAPI (monolito - precisa refatorar)
│   ├── sieg_service.py    # Integração com API SIEG (OAuth2/JWT)
│   ├── sieg_scheduler.py  # APScheduler para jobs automáticos
│   ├── models/            # Modelos Pydantic
│   └── utils/             # Utilitários
└── frontend/
    └── src/
        ├── components/
        │   └── Layout.js  # Menu lateral com condição isMatriz
        ├── pages/
        │   ├── SiegMonitor.js    # NOVO: Painel de Monitoramento SIEG
        │   ├── GrupoConsolidado.js  # 6 abas com markup, impostos individualizados
        │   ├── PisCofins.js
        │   ├── ApuracaoICMS.js
        │   └── ...
        └── context/
            └── AppContext.js  # Contexto global (empresa, competência)
```

## Changelog
- **26/02/2026**: **APRIMORAMENTO SIEG** - Validação de devoluções com comparação de valores implementada:
  - Se devolução tem valor igual à NF original: desconsiderar automaticamente
  - Se valor diferente: NÃO desconsiderar, registrar para análise do usuário
  - Novo card "Cobertura de Importação SIEG" no painel com data da última NF importada
  - Alerta de divergências de devolução pendentes de análise
- **25/02/2026**: **CENTRALIZAÇÃO SIEG CONCLUÍDA** - Configuração SIEG movida para dentro da empresa. Campos `sieg_ativo`, `sieg_sync_automatico`, `sieg_frequencia` adicionados aos modelos Pydantic. Scheduler refatorado para ler da coleção `companies`. Endpoint de migração criado. WizardEmpresa atualizado com seção SIEG.
- **25/02/2026**: **NOVO** - Painel de Monitoramento da Integração SIEG implementado. Inclui página /sieg-monitor com 4 abas (Visão Geral, Empresas, Histórico, Cancelados), job agendado via APScheduler para sync diário às 03:00, configuração de sync por empresa, e autenticação OAuth2/JWT com a API do SIEG.
- **26/06/2026**: **CORREÇÃO CRÍTICA** - Transporte de saldos credores entre competências agora funciona corretamente em todos os endpoints (Dashboard, Apuração ICMS, PIS/COFINS, RET, Reforma Tributária). Saldos são salvos na collection `saldos_credores` e transportados para o mês seguinte.
- **19/02/2026**: Bug de CFOPs de transferência corrigido
- **18/02/2026**: Adicionado Markup, impostos individualizados com badges CREDOR/DEVEDOR
- **18/02/2026**: Implementada página "Grupo Consolidado" com 6 abas
- **17/02/2026**: Corrigido bug no cálculo do Lucro Presumido hipotético
- **16/02/2026**: Backend Matriz-Filial: exclusão de CFOPs de transferência dos cálculos

## Credenciais SIEG (configuradas em backend/.env)
- `SIEG_CLIENT_ID`: aurion_nucleo_de_inteligencia_operacional_7e590204e5c5
- `SIEG_CLIENT_SECRET`: ************ (configurado)
- `SIEG_API_KEY`: %2bYImgKji%2fameDn0%2b5iH85w%3d%3d (API Key versão antiga - URL encoded)

## IMPORTANTE para Deploy
Após o deploy em produção, certifique-se de que:
1. A variável `SIEG_API_KEY` está configurada no backend/.env
2. A API Key deve estar URL-encoded (com %2b, %2f, %3d em vez de +, /, =)
3. A API SIEG tem limite de 50 XMLs por requisição (take=50)
4. A API Key precisa ter permissão "Acesso total" no painel SIEG
