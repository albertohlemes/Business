# Portal DP - Documento de Requisitos do Produto

**Última atualização**: 2026-02-06

## Changelog Recente
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

### Módulo Conversões (NOVO - 06/02/2026)
- ✅ **Conversão de Apontamentos**: Converte arquivos do cliente (imagens, emails, planilhas) para layout SCI Único
- ✅ **Conversão Admissional**: Extrai dados de documentos admissionais e valida campos obrigatórios para eSocial

### Módulo Validações
- ✅ **Validação de Folha**: Comparação com mês anterior e cruzamento com arquivos de apoio
- ✅ **Validação de Rescisão** (NOVO): Valida cálculos rescisórios usando IA
- ✅ **Informes de Rendimento**: Comparação eSocial vs SCI Único

### Módulo Cálculos
- ✅ **Dissídio Coletivo**: Upload de convenção, extração por IA, cálculo de retroativo
- ✅ **Validação de Piso Salarial**: Verifica se colaboradores estão abaixo do piso da função no cálculo retroativo
- ✅ **Exportação PDF do Resumo**: Gera PDF em papel timbrado da Business Contabilidade
- ✅ **Exportação PDF a partir de Cálculos Anteriores**: Botão para exportar PDF da convenção na lista de cálculos
- ✅ **Médias Salariais**: Importação e geração de arquivo para SCI Único

### Módulo Controles
- ✅ Dashboard com métricas de negócio
- ✅ Gestão de Empresas com importação em lote

## APIs Principais

### Autenticação
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

### Clientes/Empresas
- `GET /api/receita/{cnpj}`, CRUD `/api/clientes`
- `POST /api/clientes/importar-lote` - Importação em lote

### Colaboradores
- CRUD `/api/colaboradores`
- `POST /api/colaboradores/importar-hibrido` - Extração OCR híbrida

### Dissídio
- CRUD `/api/dissidios`
- `POST /api/convencao/analisar` - Análise de convenção por IA
- `POST /api/dissidio/calcular-retroativo` - Cálculo de retroativo (com validação de piso salarial)
- `POST /api/convencao/exportar-resumo-pdf` - Exportação em PDF
- `GET /api/calculos-dissidio/{id}/exportar-convencao-pdf` - Exporta PDF da convenção a partir de cálculo existente (NOVO)

### Conversões (NOVOS)
- `POST /api/conversao/apontamentos` - Converte para SCI Único
- `POST /api/conversao/admissional` - Extrai dados admissionais

### Validações
- `POST /api/validacoes/validar-completa` - Validação de folha
- `POST /api/validacao/rescisao` - Validação de rescisão (NOVO)

### Dashboard
- `GET /api/dashboard/completo` - Métricas completas para o dashboard

## Backlog

### P0 (Concluídos nesta sessão)
- ✅ Exportação do resumo da convenção em PDF
- ✅ Exportação de PDF a partir de cálculos anteriores
- ✅ Validação de piso salarial no cálculo retroativo
- ✅ Reorganização do menu em categorias
- ✅ Conversão de Apontamentos
- ✅ Conversão Admissional
- ✅ Validação de Rescisão

### P1 (Próximos)
- 🔲 **Refatoração do server.py** - Arquivo com +4000 linhas precisa ser dividido em routers
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
  - Endpoint `GET /api/calculos-dissidio/{id}/exportar-convencao-pdf` para exportar PDF do resumo da convenção
  - Validação de piso salarial no cálculo retroativo (campo `alertas_piso` na resposta)
  - Botão de exportação de PDF na lista de "Cálculos Anteriores" no frontend
  - Exibição de alertas de piso salarial no resultado do cálculo
- **Resultado**: ✅ 100% dos testes passaram (Backend 17/17)
- **Relatório**: /app/test_reports/iteration_15.json

---

### Histórico de Atualizações Anteriores
- **06/02/2026**: Exportação de resumo da convenção em PDF com papel timbrado
- **06/02/2026**: Polling Assíncrono para Validação de Folha
- **05/02/2026**: Validação de Folha POR COLABORADOR
- **04/02/2026**: Implementação inicial do portal
