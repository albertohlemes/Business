# Business Contabilidade - Sistema de Fechamento Fiscal

## Visão Geral
Sistema de fechamento fiscal automatizado com classificação inteligente de produtos, validação de CFOPs e geração de relatórios para o SPED.

## Funcionalidades Principais

### 1. Central de Fechamento (Wizard de 7 Etapas)
- **Etapa 1**: Notas Canceladas
- **Etapa 2**: Devoluções
- **Etapa 3**: Alertas de CFOP
- **Etapa 4**: Classificação de Produtos
- **Etapa 5**: PIS/COFINS Entradas
- **Etapa 6**: PIS/COFINS Saídas
- **Etapa 7**: Reforma Tributária

### 2. Classificação Inteligente
- Classificação automática via IA (Gemini)
- Alertas de CFOP divergentes
- Edição manual de CFOP por produto
- Memória IA para regras aprendidas

### 3. Importação em Lote
- Upload de XMLs de NF-e/NFC-e
- Processamento em background
- Relatórios de importação

---

## Changelog

### 15/02/2026 - NOVO FLUXO DE EDIÇÃO DE CFOP ✅

**Implementação completa do fluxo de edição de CFOP conforme solicitação do usuário:**

1. **CFOP Original no Header (Amarelo)** ✅
   - O card de alerta agora exibe o CFOP **original da NF de saída** (5910, 5949, 6106, etc.) em destaque amarelo
   - Label "CFOP Original" sobre o badge
   - Exibe também descrição da operação, quantidade de produtos e valor total

2. **Seletor de CFOP Destino no Header** ✅
   - Input para digitar ou colar o CFOP de destino (4 dígitos)
   - Botões rápidos com CFOPs sugeridos (ex: 1102 - COMPRA PARA REVENDA)
   - Dropdown para selecionar categoria manualmente (Auto, REVENDA, INSUMO, DESPESA, etc.)
   - Seta visual "→" indicando a conversão

3. **Coluna CFOP Editável nos Produtos** ✅
   - Ao selecionar CFOP destino no header, todos os produtos herdam automaticamente
   - Cada produto pode ter seu CFOP editado individualmente (exceções)
   - Clique no CFOP abre modo de edição inline com input + botões confirmar/cancelar
   - Exceções são destacadas em roxo com tag "Exceção"

4. **Botão "Confirmar" com Processamento Completo** ✅
   - Só habilitado quando há CFOP destino válido (4 dígitos)
   - Ao confirmar:
     - Salva regra geral para todos os produtos
     - Salva exceções individuais, sobrepondo a regra geral
     - Todas as regras são persistidas na "Memória IA" (`learned_rules`)
   - Feedback visual com contador de exceções

5. **Tags de Categoria em MAIÚSCULAS** ✅
   - Todas as tags de categoria exibidas em uppercase em toda a aplicação
   - Ex: "REVENDA", "INSUMO", "DESPESA", "ATIVO IMOBILIZADO"

**Arquivos modificados:**
- `/app/frontend/src/pages/ClassificacaoInteligente.js` - UI completa refatorada

**Testado com:**
- testing_agent_v3_fork - 7/7 features verificadas
- Empresa: M & A DE MORAES (#6388), Competência: 01/2026
- 2 alertas CFOP (5929) pendentes, 283 regras na Memória IA

---

### 15/02/2026 - Backend da "Memória IA" ✅ (Sessão Anterior)

1. **Memória IA - Regras Permanentes** ✅
   - Toda edição manual de CFOP cria ou atualiza regra na `learned_rules`
   - Regra é usada para classificação automática em futuras importações
   - Lógica de `upsert` evita duplicatas (busca por código ou descrição)
   - Frontend exibe feedback: "Nova regra criada" ou "Regra atualizada"

2. **Endpoints Implementados:**
   - `POST /api/alertas-cfop/resolver-individual` - Salva CFOP + Memória IA
   - `GET /api/alertas-cfop/{company_id}/agrupado` - Retorna alertas agrupados
   - `GET /api/learned-rules/{company_id}` - Lista regras aprendidas

---

## Arquitetura

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **IA**: Gemini (para classificação de produtos)
- **Arquivo principal**: `/app/backend/server.py`

### Frontend
- **Framework**: React
- **UI**: Tailwind CSS + Shadcn/UI
- **Estado**: Context API
- **Arquivos principais**:
  - `/app/frontend/src/pages/WizardFechamento.js`
  - `/app/frontend/src/pages/ClassificacaoInteligente.js`
  - `/app/frontend/src/pages/AlertasPage.js`

### Coleções MongoDB
- `xml_documents` - Documentos fiscais (NF-e, NFC-e)
- `companies` - Empresas cadastradas
- `learned_rules` - Regras aprendidas pela Memória IA
- `users` - Usuários do sistema

---

## Roadmap

### P0 (Concluído) ✅
- [x] Sincronização de contagem de produtos entre Wizard e Classificação Inteligente
- [x] Navegação do menu do Wizard
- [x] Edição manual de CFOP por produto
- [x] **Memória IA** - Edição manual cria/atualiza regra permanente automaticamente
- [x] **NOVO FLUXO DE EDIÇÃO DE CFOP** - CFOP original no header, seletor de destino, exceções individuais

### P1 (Alta Prioridade)
- [ ] Replicar novo fluxo de UI no WizardFechamento.js (consistência)
- [ ] Visualização agrupada por dia na página de documentos
- [ ] Relatórios por email para importação em lote
- [ ] NF de fevereiro aparecendo em janeiro (bug)
- [ ] Lógica de devoluções com valor divergente

### P2 (Média Prioridade)
- [ ] Discrepância entre Dashboard e SPED
- [ ] Botão de Login travado em "Processando..."
- [ ] Integração de CT-e
- [ ] Refatoração do monolito server.py (dividir em rotas/modelos)

### P3 (Baixa Prioridade)
- [ ] Testes automatizados (pytest)
- [ ] Refatoração de componentes grandes (WizardFechamento, ClassificacaoInteligente)

---

## Credenciais de Teste
- **Super Admin**: alberto.lemes@businessconta.com.br / Business@2026

## Empresas de Teste
- **M & A DE MORAES** (#6388) - 2 alertas CFOP (5929), 283 regras na Memória IA (competência 01/2026)
- **SUNGROUP ENERGIA** (#0760) - Usada para validação de contagem

---

## Fluxo de Edição de CFOP (Novo)

```
┌─────────────────────────────────────────────────────────────────┐
│  CARD HEADER                                                    │
│  ┌──────────────┐     ┌─────────────────────────────────────┐   │
│  │ CFOP Original│     │ [ CFOP Destino ] [CATEGORIA▼]       │   │
│  │    5929      │  →  │ [ 1102         ] [ REVENDA  ▼]      │   │
│  │  (amarelo)   │     │                                     │   │
│  └──────────────┘     │ [1102 COMPRA PARA REVENDA]          │   │
│                       └─────────────────────────────────────┘   │
│  "Remessa p/ conserto" - 2 produtos • R$ 1.500,00   [CONFIRMAR] │
├─────────────────────────────────────────────────────────────────┤
│  LISTA DE PRODUTOS (expandida)                                  │
│  ┌─────────┬────────────────────┬───────────┬────────┬────────┐ │
│  │ NF      │ PRODUTO            │ CFOP ORIG │ CFOP   │ VALOR  │ │
│  ├─────────┼────────────────────┼───────────┼────────┼────────┤ │
│  │ 12345   │ Peça Motor ABC     │   5929    │ [1102] │ R$800  │ │
│  │ 12345   │ Filtro XYZ         │   5929    │ [1551] │ R$700  │ │ ← Exceção
│  └─────────┴────────────────────┴───────────┴────────┴────────┘ │
└─────────────────────────────────────────────────────────────────┘

Ao clicar em CONFIRMAR:
- Peça Motor ABC → Regra: 5929 → 1102 (REVENDA)
- Filtro XYZ     → Exceção: 5929 → 1551 (ATIVO IMOBILIZADO)
```
