# Portal DP - Departamento Pessoal

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Emergent LLM (Gemini 2.5 Flash) + openpyxl (Excel)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **IA**: Gemini 2.5 Flash via Emergent LLM Key
- **Sistema Interno de Folha**: SCI Único (não tem API de integração)

## Funcionalidades Implementadas (05/02/2026)

### Autenticação e Base
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas com busca CNPJ na Receita Federal
- ✅ CRUD Colaboradores
- ✅ Seletor de Empresa + Competência no header
- ✅ Dashboard com estatísticas

### Admissão de Colaboradores (eSocial)
- ✅ Formulário completo com template eSocial (5 abas, 60+ campos)
- ✅ Extração automática por IA de documentos
- ✅ Suporte a documentos manuscritos e escaneados
- ✅ Modal de revisão antes de salvar
- ✅ **SUPORTE A MÚLTIPLOS VÍNCULOS (05/02/2026)**
  - Extração de TODOS os colaboradores de uma única ficha de registro
  - Navegação entre colaboradores extraídos com setas
  - Contador de colaboradores completos (com nome e CPF)
  - Opção de remover colaborador individual da lista
  - Botão "Salvar Todos" para salvamento em lote

### Dissídio Coletivo (COMPLETO)
- ✅ Upload de convenção coletiva (PDF)
- ✅ Extração por IA dos dados (sindicato, percentual, data-base, piso)
- ✅ **Modal de prévia com tabela de colaboradores afetados**
  - Salário atual, Percentual, Diferença R$, Novo salário, TOTAL
- ✅ Download Excel da prévia
- ✅ Aprovação/Rejeição com aplicação automática

### Validação de Folha (COMPLETO)
- ✅ **Aba 1 - Análise da Folha**: Detectar erros e inconsistências
- ✅ **Aba 2 - Comparar com Apoio**: Comparar holerite com relatório de referência
  - Aceita email, planilha, imagem, PDF
  - IA identifica divergências com valores lado a lado

### Informes de Rendimento (COMPLETO)
- ✅ Comparação **eSocial vs SCI Único**
- ✅ IA identifica divergências em rendimentos, IR, INSS, FGTS
- ✅ Histórico de comparações

### Importação de Médias para SCI Único (NOVO)
- ✅ Upload do relatório de médias da antiga contabilidade
- ✅ IA extrai dados de médias salariais (salário, HE, comissões, DSR, ad.noturno)
- ✅ Modal de revisão com edição de valores
- ✅ **Geração de arquivo para importar no SCI Único**
  - Formato Excel (.xlsx) ou Texto (.txt pipe-delimited)
  - Colunas: MATRÍCULA, CPF, NOME, COMPETÊNCIA, SALÁRIO, HE, COMISSÕES, DSR, AD.NOTURNO, OUTROS, TOTAL
  - *Formato ajustável quando tiver documentação do layout exato do SCI Único*

### Relatórios Exportáveis (COMPLETO)
- ✅ **Colaboradores**: Excel com dados cadastrais
- ✅ **Dissídios**: Excel com histórico de reajustes
- ✅ **Validações de Folha**: Excel com histórico de validações
- ✅ **Prévia de Dissídio**: Excel com novos salários calculados

## APIs Principais

### Autenticação
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

### Clientes/Empresas
- `GET /api/receita/{cnpj}`, CRUD `/api/clientes`

### Colaboradores
- CRUD `/api/colaboradores`, `POST /api/colaboradores/importar`
- `POST /api/colaboradores/salvar-lote` - Salva múltiplos colaboradores em lote
- `POST /api/colaboradores/importar-lote` - Importa de múltiplos arquivos

### Dissídio
- CRUD `/api/dissidios`
- `GET /api/dissidios/{id}/previa` - Prévia com tabela de salários
- `POST /api/dissidios/simular` - Simulação de reajuste
- `PUT /api/dissidios/{id}/aprovar`, `PUT /api/dissidios/{id}/rejeitar`
- `POST /api/convencao/analisar`

### Validação de Folha
- `GET /api/validacoes`
- `POST /api/validacoes/analisar`
- `POST /api/validacoes/comparar-apoio`

### Informes de Rendimento
- `GET /api/informes/historico`
- `POST /api/informes/comparar`

### Médias (SCI Único)
- `GET /api/medias/importacoes` - Lista importações
- `POST /api/medias/extrair` - Extrai dados com IA
- `POST /api/medias/salvar` - Salva no banco
- `POST /api/medias/gerar-importacao` - Gera XLS ou TXT para SCI Único

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

## Credenciais de Teste
- Email: teste@emergent.com
- Senha: Teste123!
- Empresa: Empresa Nova (CNPJ 98765432000188)

## Último Teste
- **Data**: 05/02/2026
- **Funcionalidade**: Importação de Múltiplos Colaboradores
- **Resultado**: ✅ 100% dos testes passaram (Backend 11/11, Frontend OK)
- **Relatório**: /app/test_reports/iteration_9.json
