# Portal DP - Documento de Requisitos do Produto

**Última atualização**: 2026-02-06

## Changelog Recente
- **2026-02-06**: ✅ NOVO: **Exportar Resumo da CCT para PDF** - Botão para exportar o resumo da convenção coletiva em PDF com logo da Business Contabilidade
- **2026-02-06**: ✅ NOVO: **Gestão Centralizada de Convenções Coletivas (CCT)** - Upload único de CCT no cadastro da empresa, análise automática por IA, e consumo pelos módulos de Dissídio e Rescisão
- **2026-02-06**: ✅ NOVO: Widget no Dashboard com alertas de CCTs vencidas ou próximas do vencimento
- **2026-02-06**: ✅ REFATORADO: Validação de Rescisão etapa 3 agora busca CCT do cadastro do cliente automaticamente
- **2026-02-06**: ✅ REFATORADO: Cálculo de Dissídio Retroativo agora pode usar CCT cadastrada no cliente
- **2026-02-06**: ✅ Indicador visual de status da CCT (OK/A Vencer/Vencida) nos cards de empresas
- **2026-02-06**: ✅ NOVO: Validação de Rescisão redesenhada com fluxo guiado em 4 etapas (Termo → Apoio → Convenção → FGTS)
- **2026-02-06**: ✅ CORREÇÃO CRÍTICA: Importação de colaboradores agora extrai dados corretamente usando IA (corrigido problema onde arquivos TXT não eram processados pela IA)
- **2026-02-06**: ✅ Importação de colaboradores extrai todos os campos: nome, cpf, sexo, estado_civil, endereco, cidade, uf, cep, rg, pis, ctps, nome_mae, nome_pai, dados bancários, dependentes
- **2026-02-06**: ✅ IA agora distingue corretamente dados do funcionário dos dados da empresa (não confunde mais nome da empresa com nome do funcionário)
- **2026-02-06**: ✅ Implementada tabela de proporcionalidade por data de admissão (auto-calculada ou extraída da convenção)
- **2026-02-06**: ✅ Implementado cálculo retroativo proporcional baseado na data de admissão do colaborador
- **2026-02-06**: ✅ Adicionada seção de vigência da convenção em destaque no Step 2 (Revisar Dados)
- **2026-02-06**: ✅ Implementada validação de piso salarial no cálculo de dissídio retroativo
- **2026-02-06**: ✅ Adicionado botão de exportação de PDF do resumo da convenção na lista de cálculos anteriores
- **2026-02-06**: ✅ Novo endpoint `GET /api/calculos-dissidio/{id}/exportar-convencao-pdf`
- **2026-02-06**: Adicionado botão de excluir (lixeira) nos cálculos de dissídio + Melhorado contraste das cores
- **2026-02-06**: Melhorias de UX - Código (#XXXX) antes do nome da empresa, competência com barra (MM/AAAA)
- **2026-02-06**: Implementada exportação de resumo da convenção em PDF com papel timbrado
- **2026-02-06**: Menu reorganizado em categorias: Conversões, Validações, Cálculos, Controles
- **2026-02-06**: Implementados endpoints de Conversão de Apontamentos, Conversão Admissional e Validação de Rescisão
- **2026-02-06**: UI redesenhada com tema escuro profissional e identidade visual da Business Contabilidade

## Problema Original
Portal para o Departamento Pessoal de escritório de contabilidade com foco em automatização de processos e conferências automatizadas.

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB + Tesseract OCR + openpyxl (Excel) + reportlab (PDF)
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **OCR**: Tesseract (local, gratuito) - PyMuPDF para PDFs
- **IA**: Emergent LLM Key (emergentintegrations) com gemini-2.0-flash
- **Sistema Interno de Folha**: SCI Único (não tem API de integração)

## Funcionalidades Implementadas

### Autenticação e Base
- ✅ Autenticação JWT (login/registro)
- ✅ CRUD Clientes/Empresas com busca CNPJ na Receita Federal
- ✅ CRUD Colaboradores
- ✅ Seletor de Empresa + Competência no header
- ✅ Dashboard com estatísticas e gráfico de evolução
- ✅ Importação de empresas em lote (CSV/XLSX)

### Gestão de Convenções Coletivas (NOVO - 06/02/2026)
- ✅ **Upload e Análise de CCT**: Upload único no cadastro da empresa com análise automática por IA
- ✅ **Extração Completa**: Sindicato, vigência, pisos salariais, benefícios, jornada, estabilidades, rescisão
- ✅ **Alertas de Vencimento**: Widget no Dashboard com CCTs vencidas ou próximas do vencimento
- ✅ **Integração Automática**: Módulos de Dissídio e Rescisão consomem a CCT cadastrada automaticamente
- ✅ **Exportar para PDF**: Gera PDF profissional com logo da empresa contendo todo o resumo da CCT (NOVO)

### Módulo Conversões (NOVO - 06/02/2026)
- ✅ **Conversão de Apontamentos**: Converte arquivos do cliente (imagens, emails, planilhas) para layout SCI Único
- ✅ **Conversão Admissional**: Extrai dados de documentos admissionais e valida campos obrigatórios para eSocial

### Módulo Validações
- ✅ **Validação de Folha**: Comparação com mês anterior e cruzamento com arquivos de apoio
- ✅ **Tabela de Colaboradores em Colunas**: Divergências com Apoio e Variação vs Mês Anterior em colunas separadas
- ✅ **Validação de Rescisão** (NOVO): Valida cálculos rescisórios usando IA
- ✅ **Informes de Rendimento**: Comparação eSocial vs SCI Único

### Módulo Cálculos
- ✅ **Dissídio Coletivo**: Upload de convenção, extração por IA, cálculo de retroativo
- ✅ **Validação de Piso Salarial**: Verifica se colaboradores estão abaixo do piso da função no cálculo retroativo
- ✅ **Proporcionalidade por Data de Admissão**: Calcula retroativo proporcional para funcionários admitidos durante o período retroativo
- ✅ **Tabela de Proporcionalidade**: Exibida na revisão de dados (extraída da convenção ou auto-calculada)
- ✅ **Vigência da Convenção**: Destacada em seção especial na tela de revisão
- ✅ **Exportação PDF do Resumo**: Gera PDF em papel timbrado da Business Contabilidade
- ✅ **Exportação PDF a partir de Cálculos Anteriores**: Botão para exportar PDF da convenção na lista de cálculos
- ✅ **Médias Salariais**: Importação e geração de arquivo para SCI Único

### Módulo Controles
- ✅ Dashboard com métricas de negócio
- ✅ Gestão de Empresas com importação em lote
- ✅ Widget de Alertas de CCTs vencendo no Dashboard

## APIs Principais

### Autenticação
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

### Clientes/Empresas
- `GET /api/receita/{cnpj}`, CRUD `/api/clientes`
- `POST /api/clientes/importar-lote` - Importação em lote
- `POST /api/clientes/{cliente_id}/convencao` - Upload e análise de CCT
- `DELETE /api/clientes/{cliente_id}/convencao` - Remove CCT do cadastro
- `GET /api/clientes/{cliente_id}/convencao/export-pdf` - Exporta resumo da CCT para PDF (NOVO)

### Colaboradores
- CRUD `/api/colaboradores`
- `POST /api/colaboradores/importar` - Extração de dados de documentos (PDF, imagem, texto) usando IA
- `POST /api/colaboradores/salvar-lote` - Salva múltiplos colaboradores de uma vez

### Dissídio
- CRUD `/api/dissidios`
- `POST /api/convencao/analisar` - Análise de convenção por IA
- `POST /api/dissidio/calcular-retroativo` - Cálculo de retroativo (agora pode usar CCT cadastrada)
- `POST /api/convencao/exportar-resumo-pdf` - Exportação em PDF
- `GET /api/calculos-dissidio/{id}/exportar-convencao-pdf` - Exporta PDF da convenção a partir de cálculo existente

### Conversões
- `POST /api/conversao/apontamentos` - Converte para SCI Único
- `POST /api/conversao/admissional` - Extrai dados admissionais

### Validações
- `POST /api/validacoes/validar-completa` - Validação de folha
- `POST /api/validacao/rescisao/etapa1` - Análise do termo de rescisão
- `POST /api/validacao/rescisao/etapa2` - Validação com apoio
- `POST /api/validacao/rescisao/etapa3` - Validação com convenção (pode usar CCT cadastrada)
- `POST /api/validacao/rescisao/etapa4` - Validação FGTS

### Dashboard
- `GET /api/dashboard/completo` - Métricas completas para o dashboard
- `GET /api/dashboard/convencoes-vencimento` - Alertas de CCTs vencendo (NOVO)

## Backlog

### P0 (Concluídos nesta sessão)
- ✅ **NOVO: Exportar CCT para PDF** com logo da Business Contabilidade
- ✅ **NOVO: Gestão Centralizada de Convenções Coletivas (CCT)**
- ✅ **CORREÇÃO CRÍTICA**: Importação de colaboradores com IA funcionando corretamente
- ✅ Exportação do resumo da convenção em PDF
- ✅ Exportação de PDF a partir de cálculos anteriores
- ✅ Validação de piso salarial no cálculo retroativo
- ✅ Reorganização do menu em categorias
- ✅ Conversão de Apontamentos
- ✅ Conversão Admissional
- ✅ Validação de Rescisão

### P1 (Próximos)
- 🔲 **Validar Módulos de Dissídio e Rescisão** - Verificar se estão usando corretamente a CCT do histórico
- 🔲 **Refatoração do server.py** - Arquivo com +7000 linhas precisa ser dividido em routers (CRÍTICO)
- 🔲 Validação de Informes de Rendimento
- 🔲 Importação de colaboradores em lote

### P2 (Futuros)
- 🔲 Notificações de dissídios pendentes
- 🔲 Exportação de relatórios do dashboard
- 🔲 Análise de padrões de erros recorrentes

## Credenciais de Teste
- Email: admin@teste.com
- Senha: admin123

## Arquitetura do Frontend (Menu)

```
CONVERSÕES
├── Apontamentos → SCI  (/conversao-apontamentos)
└── Docs Admissionais   (/conversao-admissional)

VALIDAÇÕES
├── Validação de Folha  (/validacao)
├── Validação de Rescisão (/validacao-rescisao)
└── Informes de Rendimento (/informes)

CÁLCULOS
├── Dissídio Coletivo   (/dissidio)
└── Médias              (/medias)

CONTROLES
├── Dashboard           (/)
└── Empresas            (/clientes)
```

## Última Atualização
- **Data**: 06/02/2026
- **Funcionalidades Implementadas**:
  - **CORREÇÃO CRÍTICA**: Importação de colaboradores com IA (corrigido bug onde arquivos TXT causavam erro "The document has no pages")
  - Arquivos TXT agora têm seu conteúdo enviado diretamente na mensagem da IA
  - Arquivos PDF e imagens continuam sendo enviados como anexos
  - Extração de todos os campos: nome, cpf, sexo, estado_civil, endereco, cidade, uf, cep, rg, pis, ctps, nome_mae, nome_pai, banco, agencia, conta, dependentes
  - Tabela de proporcionalidade por data de admissão (auto-calculada ou extraída da convenção)
  - Cálculo retroativo proporcional baseado na data de admissão do colaborador
  - Seção de vigência da convenção em destaque (background azul com ícone de calendário)
  - Endpoint `GET /api/calculos-dissidio/{id}/exportar-convencao-pdf` para exportar PDF do resumo
  - Validação de piso salarial no cálculo retroativo (campo `alertas_piso` na resposta)
  - Botão de exportação de PDF na lista de "Cálculos Anteriores"
- **Resultado**: ✅ 100% dos testes passaram (Backend 9/9 para importação de colaboradores)
- **Relatório**: /app/test_reports/iteration_17.json

---

### Histórico de Atualizações Anteriores
- **06/02/2026**: Exportação de resumo da convenção em PDF com papel timbrado
- **06/02/2026**: Polling Assíncrono para Validação de Folha
- **05/02/2026**: Validação de Folha POR COLABORADOR
- **04/02/2026**: Implementação inicial do portal
