# Portal DP - Documento de Requisitos do Produto

**Última atualização**: 2026-02-06

## Changelog Recente
- **2026-02-06**: Melhorado visual da memória de cálculo do Dissídio com totalizadores em cada agrupamento
- **2026-02-06**: Adicionado "Era/Ficou" para cada verba, exclusão de impostos do retroativo
- **2026-02-06**: UI redesenhada com gradientes, cards modernos e badges coloridos

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Tesseract OCR + openpyxl (Excel)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **OCR**: Tesseract (local, gratuito) - PyMuPDF para PDFs
- **IA (Fallback)**: Google AI Studio / Emergent LLM (apenas para casos complexos)
- **Sistema Interno de Folha**: SCI Único (não tem API de integração)

## Funcionalidades Implementadas

### Autenticação e Base
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas com busca CNPJ na Receita Federal
- ✅ CRUD Colaboradores
- ✅ Seletor de Empresa + Competência no header
- ✅ Dashboard com estatísticas (filtra por empresa e competência)
- ✅ Código da empresa (#XXXX) aparece antes do nome em toda a UI
- ✅ Selects priorizam a empresa selecionada no contexto

### Admissão de Colaboradores (eSocial)
- ✅ Formulário completo com template eSocial (5 abas, 60+ campos)
- ✅ Extração automática por OCR híbrido (Tesseract local + IA fallback)
- ✅ Suporte a documentos manuscritos e escaneados
- ✅ Suporte a múltiplos colaboradores por documento
- ✅ Modal de revisão com navegação entre colaboradores
- ✅ Botão "Salvar Todos" para salvamento em lote

### Dissídio Coletivo (COMPLETO)
- ✅ Upload de convenção coletiva (PDF)
- ✅ Extração por IA dos dados (sindicato, percentual, data-base, piso)
- ✅ Modal de prévia com tabela de colaboradores afetados
- ✅ Download Excel da prévia
- ✅ Aprovação/Rejeição com aplicação automática

### Validação de Folha por Colaborador (NOVO - 05/02/2026)
- ✅ **Extração de Múltiplos Colaboradores**: Processa folha de pagamento completa e extrai cada funcionário individualmente
- ✅ **Comparação Individual com Mês Anterior**: Cada colaborador é comparado com seu correspondente no mês anterior
  - Calcula variação percentual por campo (proventos, descontos, líquido, etc.)
  - Detecta divergências significativas (>10%) com classificação de severidade
  - Identifica colaboradores novos (não encontrados no mês anterior)
- ✅ **Cruzamento com Arquivos de Apoio**: 
  - Extrai referências do documento de apoio (Ex: "João - 15 horas extras")
  - Cruza com os dados do holerite de cada colaborador
  - Detecta divergências (Ex: Apoio diz 15 HE, holerite mostra 7 = DIVERGÊNCIA)
- ✅ **Visualização por Colaborador**:
  - Tabela com Status/Nome/Líquido/Variação/Problemas por colaborador
  - Estatísticas: OK / Atenção / Divergente
  - Impacto financeiro total calculado
- ✅ **OCR Local (Tesseract)**: Zero custo de API para extração de texto

### Informes de Rendimento (COMPLETO)
- ✅ Comparação **eSocial vs SCI Único**
- ✅ IA identifica divergências em rendimentos, IR, INSS, FGTS
- ✅ Histórico de comparações

### Importação de Médias para SCI Único
- ✅ Upload do relatório de médias da antiga contabilidade
- ✅ IA extrai dados de médias salariais
- ✅ Modal de revisão com edição de valores
- ✅ Geração de arquivo para importar no SCI Único (Excel ou TXT)

### Relatórios Exportáveis (COMPLETO)
- ✅ Colaboradores: Excel com dados cadastrais
- ✅ Dissídios: Excel com histórico de reajustes
- ✅ Validações de Folha: Excel com histórico
- ✅ Prévia de Dissídio: Excel com novos salários calculados

## APIs Principais

### Autenticação
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

### Clientes/Empresas
- `GET /api/receita/{cnpj}`, CRUD `/api/clientes`

### Colaboradores
- CRUD `/api/colaboradores`
- `POST /api/colaboradores/importar-hibrido` - Extração OCR híbrida
- `POST /api/colaboradores/salvar-lote` - Salva múltiplos em lote

### Dissídio
- CRUD `/api/dissidios`
- `GET /api/dissidios/{id}/previa`, `POST /api/dissidios/simular`
- `PUT /api/dissidios/{id}/aprovar`, `PUT /api/dissidios/{id}/rejeitar`

### Validação de Folha
- `GET /api/validacoes` - Lista validações (filtro por cliente opcional)
- `GET /api/validacoes/{id}` - Detalhes completos com array de colaboradores
- `POST /api/validacoes/validar-completa` - Inicia validação assíncrona, retorna `job_id`
- `GET /api/validacoes/job-status/{job_id}` - Consulta status do job (polling)
- `DELETE /api/validacoes/{id}` - Exclusão individual
- `POST /api/validacoes/delete-batch` - Exclusão em lote

### Informes de Rendimento
- `GET /api/informes/historico`, `POST /api/informes/comparar`

### Médias (SCI Único)
- `GET /api/medias/importacoes`, `POST /api/medias/extrair`
- `POST /api/medias/salvar`, `POST /api/medias/gerar-importacao`

### Relatórios Excel
- `GET /api/relatorios/colaboradores/excel`
- `GET /api/relatorios/dissidios/excel`
- `GET /api/relatorios/validacoes/excel`
- `GET /api/relatorios/dissidio/{id}/previa/excel`

## Backlog

### P1 (Próximos)
- 🔲 Ajustar formato do arquivo de médias quando tiver layout do SCI Único
- 🔲 Histórico de alterações por colaborador

### P2 (Futuros)
- 🔲 Relatórios em PDF
- 🔲 Notificações de dissídios pendentes
- 🔲 Comparativo mensal automático de folha
- 🔲 Dashboard com métricas por cliente
- 🔲 Análise de padrões de erros recorrentes

## Credenciais de Teste
- Email: teste@emergent.com
- Senha: Teste123!
- Empresa: Empresa Nova (CNPJ 98765432000188)
- Cliente ID: 897c7b37-a18f-4e66-9562-961697a460b3

## Última Atualização
- **Data**: 06/02/2026
- **Funcionalidade**: Polling Assíncrono para Validação de Folha
- **Mudanças**:
  - Refatorado `POST /api/validacoes/validar-completa` para processamento em background
  - Novo endpoint `GET /api/validacoes/job-status/{job_id}` para consultar progresso
  - Frontend atualizado para usar polling (2s) em vez de requisição síncrona
  - Barra de progresso real com steps: "Enviando", "Extraindo", "Analisando IA", "Validando"
  - Novos endpoints de exclusão: DELETE individual e POST batch
- **Problema Resolvido**: UI travava durante validação de documentos com IA (operação longa)
- **Resultado**: ✅ 100% dos testes passaram (Backend 12/12, Frontend OK)
- **Relatório**: /app/test_reports/iteration_13.json

---

### Histórico de Atualizações Anteriores
- **05/02/2026**: Validação de Folha POR COLABORADOR
  - Extração de múltiplos colaboradores
  - Comparação individual com mês anterior
  - Cruzamento com arquivos de apoio
  - ✅ Backend 16/16, Frontend OK
