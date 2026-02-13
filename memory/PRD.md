# Aurion - Sistema de Fechamento Fiscal

## Problema Original
Sistema de fechamento fiscal completo com suporte a múltiplos regimes tributários (Simples Nacional, Lucro Real, Lucro Presumido). Inclui importação de XMLs de NF-e, SPED, PGDAS e geração de relatórios fiscais.

## Arquitetura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Processamento em Background**: Celery + Redis
- **Principais Bibliotecas**: JSZip (extração ZIP no cliente), PyMuPDF (extração PDF)

## Funcionalidades Implementadas

### Wizard de Fechamento Fiscal (8 Etapas)
1. **Notas Canceladas** - Confirmar e processar notas fiscais canceladas
2. **Devoluções de Fornecedores** - Identificar devoluções e excluir notas referenciadas
3. **CFOPs Distintos** (NOVO) - Revisar CFOPs de operações distintas (remessa, conserto, etc.)
4. **Classificação de CFOPs** - Converter e classificar CFOPs dos produtos
5. **PIS/COFINS Entradas** - Corrigir CST de PIS e COFINS nas entradas
6. **PIS/COFINS Saídas** - Corrigir CST de PIS e COFINS nas saídas
7. **Reforma Tributária** - Calcular IVA Dual (CBS + IBS)
8. **Concluído** - Fechamento fiscal finalizado

### Devoluções com Correlação de Nota Original
- Detecta automaticamente notas de terceiros com CFOP de entrada
- Busca e correlaciona a nota original referenciada
- Permite excluir ambas as notas (devolução + original) da apuração
- CFOPs considerados: CFOPS_DEVOLUCAO_TERCEIROS_GLOBAL

### CFOPs Distintos (Nova Etapa)
- Lista todos os CFOPs de operações não-comerciais
- Opções para cada CFOP: Ignorar, Desconsiderar, Converter
- Suporta: remessa, conserto, comodato, consignação, demonstração, etc.

### Importação Rápida (sem IA)
- Flag `skip_ai` em todas as portas de upload
- Quando ativo: pula classificação IA, mantém CFOPs originais
- Ainda aplica CST de PIS/COFINS

### Upload em Background (Celery + Redis)
- Redis instalado e rodando
- Celery worker ativo
- Fallback automático para streaming se Redis cair

## Endpoints Principais

### Wizard de Fechamento
- `GET /api/wizard-fechamento/status/{company_id}` - Status atual
- `GET /api/wizard-fechamento/step/{company_id}/{step_id}` - Dados de etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/complete` - Completar etapa
- `POST /api/wizard-fechamento/step/{company_id}/{step_id}/go` - Navegar para etapa

### Upload de XMLs
- `POST /api/upload-documents` - Upload direto
- `POST /api/upload-documents-streaming` - Upload streaming
- `POST /api/xml/upload-background` - Upload em background (Celery)
- `GET /api/xml/job-status/{job_id}` - Status do job

### Importação em Lote
- `POST /api/batch-import/upload-estrutura` - Upload de ZIP

## Bugs Corrigidos (13/02/2026)

1. ✅ **Upload em Background** - Redis/Celery configurados e funcionando
2. ✅ **Limite de 200 documentos** - Removido limite, contagem total correta
3. ✅ **Discrepância Central vs Wizard** - Lógica unificada
4. ✅ **Barra de Progresso 95%** - Proporcionalização melhorada
5. ✅ **Modal de Seleção** - Pode fechar sem selecionar empresa
6. ✅ **Importação em Lote** - Liberada para todos os usuários
7. ✅ **Detecção de Cancelamento** - XMLs de cancelamento detectados

## Bugs Pendentes

### P1 - NF de fevereiro aparecendo em janeiro
- Bug recorrente na alocação de competência fiscal
- Verificar campo de data usado (`dhEmi` vs `dhSaiEnt`)

### P1 - Problema de Deploy
- Atualizações não aparecem em produção
- Investigar CI/CD e cache

### P2 - Discrepância Dashboard vs SPED
- Valores totais não batem entre dashboard e registro E110

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Changelog

### 13/02/2026 (Sessão Atual)
- ✅ Adicionada nova etapa no Wizard: "CFOPs Distintos"
- ✅ Devoluções agora correlacionam e excluem nota original
- ✅ Validada importação rápida sem IA
- ✅ Redis e Celery configurados e funcionando
- ✅ Fallback automático para streaming quando background falha
- ✅ Limite de 200 removido nos steps do Wizard
- ✅ Atualizado WIZARD_STEPS para 8 etapas

### 13/02/2026 (Sessão Anterior)
- ✅ Wizard de Fechamento Fiscal implementado
- ✅ Central de Fechamento com cards de etapas
- ✅ Botões de processamento por etapa
- ✅ Barra de progresso durante processamento
