# Portal DP - Departamento Pessoal

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

### Validação de Folha (REFATORADO - 05/02/2026)
- ✅ **Interface Unificada**: Uma única tela com 3 áreas de upload
  - **Holerite Atual** (obrigatório): Documento principal a ser validado
  - **Holerite Mês Anterior** (opcional): Para comparação mês a mês
  - **Arquivos de Apoio** (opcional, múltiplos): Emails, planilhas, imagens, PDFs
- ✅ **OCR Local (Tesseract)**: Extração gratuita e rápida de texto
  - Suporte a PDF, imagens (JPG, PNG), TXT, Excel
  - Parser inteligente para formato brasileiro (1.234,56) e americano (1234.56)
- ✅ **Análise Inteligente**:
  - Extração automática de funcionário, competência, proventos, descontos, líquido
  - Comparação com mês anterior (detecta variações >10%)
  - Identificação de divergências com severidade (alta/média/baixa)
  - Cálculo de impacto financeiro
- ✅ **Histórico Consultável**:
  - Validações agrupadas por competência
  - Badges de tipo (Análise Isolada, Comparação Mensal, Com Apoio)
  - Detalhes expandíveis por validação

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
- `GET /api/validacoes/{id}` - Detalhes completos
- `POST /api/validacoes/validar-completa` - Validação unificada com OCR local

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

## Última Atualização
- **Data**: 05/02/2026
- **Funcionalidade**: Validação de Folha de Pagamento (Refatoração completa)
- **Mudança**: Migração de API de IA paga para OCR local (Tesseract)
- **Resultado**: ✅ 100% dos testes passaram (Backend 17/17, Frontend OK)
- **Relatório**: /app/test_reports/iteration_11.json
