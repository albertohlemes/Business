# API Documentation - FiscalWave

## Estrutura do Backend

O backend está atualmente em `server.py` (26k+ linhas). Este documento serve como índice para navegação e planejamento de refatoração futura.

## Módulos Lógicos Identificados

### 1. Autenticação e Usuários (Linhas 3181-3816)
- `POST /auth/register` - Cadastro de usuário
- `POST /auth/login` - Login
- `GET /auth/me` - Perfil atual
- `PUT /auth/me/preferences` - Preferências
- `GET /auth/users` - Listar usuários
- `POST /auth/users` - Criar usuário
- `GET /auth/users/{id}` - Detalhes usuário
- `PUT /auth/users/{id}` - Atualizar usuário
- `DELETE /auth/users/{id}` - Desativar usuário
- `POST /auth/users/{id}/reactivate` - Reativar
- `POST /auth/users/{id}/promote-master` - Promover a Master
- `POST /auth/users/{id}/demote-operacional` - Rebaixar a Operacional
- `DELETE /auth/users/{id}/permanent` - Exclusão permanente
- `GET /auth/permissions/available` - Permissões disponíveis
- `GET /auth/users/{id}/permissions` - Permissões do usuário
- `PUT /auth/users/{id}/permissions` - Atualizar permissões
- `POST /auth/users/{id}/permissions/toggle` - Toggle permissão

### 2. Empresas (Linhas 3863-4182)
- `POST /companies/{id}/responsaveis` - Adicionar responsável
- `DELETE /companies/{id}/responsaveis/{user_id}` - Remover responsável
- `DELETE /companies/{id}` - Deletar empresa
- `POST /companies` - Criar empresa
- `POST /companies/gerar-keywords-ia` - Gerar keywords com IA
- `GET /companies` - Listar empresas
- `GET /companies/responsaveis` - Listar responsáveis
- `GET /companies/{id}` - Detalhes empresa
- `PUT /companies/{id}` - Atualizar empresa

### 3. Documentos e Upload (Linhas 4183-7429)
- `DELETE /documents/{company_id}/competencia/{competencia}` - Deletar por competência
- `DELETE /documents/{document_id}` - Deletar documento
- `POST /xml/reimport-init` - Iniciar reimportação
- `GET /xml/reimport-progress/{task_id}` - Progresso reimportação
- `POST /xml/reimport-execute/{task_id}` - Executar reimportação
- `POST /xml/upload` - Upload XML
- `POST /xml/upload-init` - Iniciar upload assíncrono
- `GET /xml/upload-progress/{upload_id}` - Progresso upload
- `GET /xml/upload-status/{upload_id}` - Status upload
- `POST /xml/upload-stream` - Upload streaming
- `GET /xml/historico-importacoes/{company_id}` - Histórico importações
- `GET /xml/documents` - Listar documentos
- `GET /xml/documents/{document_id}` - Detalhes documento
- `POST /xml/reprocess/{document_id}` - Reprocessar documento
- `POST /xml/reprocess-batch` - Reprocessar em lote
- `POST /xml/reimport-batch` - Reimportar em lote
- `GET /xml/validate-integrity/{document_id}` - Validar integridade
- `GET /xml/integrity-summary/{company_id}` - Resumo integridade

### 4. Dashboard e Estatísticas (Linhas 8248-8975)
- `GET /dashboard/stats/{company_id}` - Estatísticas principais
- `GET /inconsistencias/{company_id}` - Dashboard de inconsistências

### 5. Apurações Fiscais (Linhas 9210-9954)
- `GET /apuracao-pis-cofins/{company_id}` - Apuração PIS/COFINS
- `GET /apuracao-periodo/{company_id}` - Apuração por período

### 6. Relatórios (Linhas 10138-11788)
- `GET /relatorio-notas-canceladas/{company_id}` - Notas canceladas
- `GET /relatorio-notas-canceladas/{company_id}/exportar` - Exportar canceladas
- `GET /relatorio-devolucoes-fornecedor/{company_id}` - Devoluções
- `GET /relatorio-devolucoes-fornecedor/{company_id}/exportar` - Exportar devoluções
- `GET /relatorio-divergencias-saida/{company_id}` - Divergências saída
- `GET /relatorio-divergencias-entrada/{company_id}` - Divergências entrada
- `GET /relatorio-agrupado-aliquota/{company_id}` - Agrupado por alíquota
- `GET /relatorio-agrupado-aliquota/{company_id}/exportar` - Exportar agrupado

### 7. Análises e Vilões/Oportunidades (Linhas 11789-12193)
- `GET /viloes-oportunidades/{company_id}` - Vilões e oportunidades

### 8. Classificação e IA (Linhas 13392-14320)
- `GET /reports/by-product/{company_id}` - Relatório por produto
- `GET /classification/suggestions/{company_id}` - Sugestões classificação
- `POST /products/classify-single` - Classificar produto único
- `POST /classification/ia-command/{company_id}` - Comando IA classificação
- `GET /reports/by-ncm/{company_id}` - Relatório por NCM

### 9. SPED Fiscal (Linhas 14378-15830)
- `GET /sped/export/{company_id}` - Exportar SPED
- `GET /sped/validar/{company_id}` - Validar SPED
- `GET /analise-tributaria-ia/{company_id}` - Análise tributária IA
- `POST /sped/exportar-e-validar/{company_id}` - Exportar e validar

### 10. ICMS, ISS, IPI (Linhas 18963-20465)
- `GET /apuracao-icms/{company_id}` - Apuração ICMS
- `GET /beneficio-fiscal-detalhes/{company_id}` - Detalhes benefício fiscal
- `GET /desconsiderados-detalhes/{company_id}` - Valores desconsiderados
- `GET /beneficio-fiscal-detalhes/{company_id}/exportar` - Exportar benefício
- `GET /apuracao-iss/{company_id}` - Apuração ISS
- `GET /apuracao-ipi/{company_id}` - Apuração IPI

### 11. PIS/COFINS Detalhado (Linhas 20466-21388)
- `GET /pis-cofins/apuracao/{company_id}` - Apuração PIS/COFINS
- `GET /pis-cofins/detalhamento/{company_id}` - Detalhamento
- `GET /pis-cofins/divergencias/{company_id}` - Divergências

### 12. Simples Nacional e RET (Linhas 22339-24106)
- `POST /dashboard/simples-nacional` - Dashboard Simples
- `GET /simples-nacional/{company_id}/exportar-produtos` - Exportar produtos
- `GET /relatorio-consolidado/{company_id}/exportar` - Relatório consolidado
- `PUT /companies/{company_id}/simples-nacional/anexos` - Atualizar anexos
- `PUT /companies/{company_id}/simples-nacional/folha` - Atualizar folha
- `GET /simples-nacional/sugerir-anexos/{cnpj}` - Sugerir anexos
- `POST /simples-nacional/difal/apuracao` - Apuração DIFAL
- `GET /simples-nacional/difal/detalhamento/{company_id}/{competencia}` - Detalhamento DIFAL
- `GET /simples-nacional/difal/aliquotas` - Tabela alíquotas
- `POST /simples-nacional/ret/comparativo` - Comparativo RET
- `POST /simples-nacional/{company_id}/importar-pgdas` - Importar PGDAS
- `GET /simples-nacional/{company_id}/historico-faturamento` - Histórico faturamento
- `PUT /simples-nacional/{company_id}/historico-faturamento/{competencia}` - Atualizar faturamento

### 13. Saldo Credor e Impostos Retidos (Linhas 24230-24577)
- `GET /saldo-credor/{company_id}` - Saldo credor
- `POST /saldo-credor/{company_id}/fechar-competencia` - Fechar competência
- `GET /saldo-credor/{company_id}/historico` - Histórico saldo
- `GET /impostos-retidos/{company_id}` - Impostos retidos

### 14. NFS-e (Linhas 24578-25022)
- `POST /nfse/preview` - Preview NFS-e
- `POST /nfse/import-with-cancellations` - Importar com cancelamentos
- `POST /nfse/import-cancellation-report` - Importar relatório cancelamento

### 15. Análise Horizontal e Notas Ausentes (Linhas 25023-25761)
- `GET /analise-horizontal/{company_id}` - Análise horizontal
- `POST /analise-horizontal/insights/{company_id}` - Insights análise
- `GET /notas-ausentes/{company_id}` - Notas ausentes
- `GET /notas-ausentes/{company_id}/exportar` - Exportar notas ausentes

### 16. Exportações (Linhas 25762-26165)
- `GET /xml/exportar-categoria/{company_id}` - Exportar por categoria
- `POST /analise-horizontal/salvar-dados-manuais/{company_id}` - Salvar dados manuais
- `GET /analise-horizontal/dados-manuais/{company_id}` - Obter dados manuais
- `POST /analise-horizontal/importar-arquivo/{company_id}` - Importar arquivo

### 17. SIEG Integration (Linhas 4261-5027)
- `GET /sieg/count/{company_id}` - Contagem SIEG
- `POST /sieg/sync-init/{company_id}` - Iniciar sync
- `GET /sieg/sync-progress/{sync_id}` - Progresso sync
- `POST /sieg/sync-execute/{sync_id}` - Executar sync
- `POST /sieg/sync/{company_id}` - Sync completo
- `GET /sieg/status` - Status SIEG

### 18. Alertas CFOP (Linhas 12794-13334)
- `GET /alertas-cfop/{company_id}` - Listar alertas
- `GET /alertas-cfop/{company_id}/agrupado` - Alertas agrupados
- `POST /alertas-cfop/resolver-grupo` - Resolver grupo
- `POST /alertas-cfop/resolver-individual` - Resolver individual
- `POST /alertas-cfop/resolver-lote` - Resolver em lote
- `POST /alertas-cfop/resolver-ia` - Resolver com IA
- `POST /converter-cfop` - Converter CFOP

---

## Plano de Refatoração (FASE 2)

### Prioridade Alta (Endpoints mais utilizados)
1. Dashboard (`/dashboard/*`)
2. Autenticação (`/auth/*`)
3. Empresas (`/companies/*`)

### Prioridade Média
4. Upload de XMLs (`/xml/*`)
5. Apurações (`/apuracao-*`)
6. Relatórios (`/relatorio-*`)

### Prioridade Baixa
7. SPED (`/sped/*`)
8. Simples Nacional (`/simples-nacional/*`)
9. Análises especiais

### Estratégia de Migração

1. **Criar services/** para lógica de negócio
   - `services/dashboard_service.py`
   - `services/classification_service.py`
   - `services/tax_calculation_service.py`

2. **Criar routers/** com endpoints enxutos
   - `routers/dashboard.py` -> chama `dashboard_service`
   - `routers/classification.py` -> chama `classification_service`

3. **Migrar incrementalmente**
   - Mover um módulo por vez
   - Testar extensivamente antes de prosseguir
   - Manter backward compatibility

4. **Deprecar server.py gradualmente**
   - Comentar endpoints migrados
   - Manter funções auxiliares até migração completa

---

## Funções Auxiliares Importantes (server.py)

- `get_filtro_notas_ativas()` (linha 995) - Filtro padrão para notas não canceladas
- `check_company_access()` (linha 1180) - Verificação de acesso à empresa
- `require_company_access()` (linha 305) - Dependency de acesso
- `verify_company_access()` (linha 1216) - Verificação alternativa
- `has_permission()` (linha 275) - Verificação de permissão
- `check_permission()` (linha 291) - Dependency de permissão
- `get_user_permissions()` (linha 243) - Obter permissões do usuário
- `obter_cfop_por_categoria()` (linha 13549) - CFOP por categoria

---

## Modelos de Dados Principais

### Collections MongoDB
- `users` - Usuários do sistema
- `companies` - Empresas cadastradas
- `xml_documents` - Documentos fiscais (NFe, NFCe, CTe, NFSe)
- `cfop_rules` - Regras de CFOP
- `validation_exceptions` - Exceções de validação
- `ai_tasks` - Tarefas de IA em background
- `historico_importacoes` - Histórico de importações
- `estoque_competencia` - Estoque por competência
- `saldo_credor` - Saldos credores
- `historico_faturamento` - Faturamento mensal

### Schemas Pydantic
- Definidos em `models/schemas.py`
- Também duplicados no início de `server.py` (a ser consolidado)

---

*Última atualização: 2026-02-12*
