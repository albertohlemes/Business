# PRD - Sistema de Classificação Fiscal (AURION)

## Problema Original
Sistema de análise fiscal para empresas com alto volume de documentos (14.000+ XMLs por mês). O sistema precisa processar páginas de análise (PIS/COFINS, RET, Reforma Tributária, Análise Horizontal, ICMS, Vilões/Oportunidades) sem travar e exibir dados corretos.

## Status Atual (16/02/2026)

### ✅ CORREÇÕES IMPLEMENTADAS NESTA SESSÃO

#### 1. Vilões e Oportunidades - Estrutura de Dados Corrigida
- **Problema**: Versão agregada retornava estrutura incompatível com frontend
- **Solução**: Refatorado `_get_viloes_oportunidades_aggregated()` para retornar `entrada_valor`, `saida_valor`, `icms.credito`, `icms.debito` etc.
- **Performance**: 0.32s para 14.700 documentos
- **Status**: ✅ TESTADO E FUNCIONANDO

#### 2. Análise Horizontal - Determinação de Tipo Corrigida
- **Problema**: Lógica incorreta `tipo not in ['saida', 'saída']` classificava tudo como entrada
- **Solução**: Pipeline de agregação agora usa CFOP como fallback quando tipo não está definido
- **Status**: ✅ TESTADO E FUNCIONANDO

#### 3. PIS/COFINS - Performance Otimizada
- **Problema**: Sistema travava com alto volume
- **Solução**: Versão agregada já existente, apenas validada
- **Performance**: 0.57s para 14.700 documentos (requisito: <5s)
- **Status**: ✅ TESTADO E FUNCIONANDO

#### 4. ICMS - CFOPs de Outros Estados
- **Problema**: Usuário reportou que CFOPs 2xxx não apareciam
- **Diagnóstico**: Sistema funciona corretamente - a empresa REPUBLIC não tem documentos de entrada
- **Validação**: Empresa COMERCIAL RS mostra 7 CFOPs 2xxx corretamente
- **Status**: ✅ FUNCIONANDO (problema era de dados, não de código)

### Resultados dos Testes (iteration_65)
- **Taxa de Sucesso**: 100% (15/15 testes)
- **Empresas Testadas**:
  - REPUBLIC (14.700 docs, apenas saídas) - Para teste de performance
  - COMERCIAL RS (4.495 docs, entradas e saídas com CFOPs 2xxx) - Para validação de dados

## Issues Pendentes

### P0 - Crítico
- **RET (Relatório de Entradas Tributáveis)**: Ainda não foi verificado nesta sessão

### P1 - Importante
- **Discrepância Dashboard vs ICMS**: Não investigado nesta sessão
- **Insights IA sem informação**: Não investigado nesta sessão

### P2 - Menor
- **Exceções CFOP**: Salvas com código errado
- **UI WizardFechamento**: Inconsistente
- **Pacote On-Premise**: Docker Compose + documentação

## Dados do Cliente

### Empresa REPUBLIC C.A PIZZA E CHOPP LTDA
- Company ID: `2bde03ac-7314-40b3-94cc-eb7827bccd55`
- Total Documentos: 14.700 (apenas saídas)
- CFOPs: 5101, 5405, 5102 (nenhum 1xxx ou 2xxx)
- **Nota**: Esta empresa NÃO tem documentos de entrada importados

### Empresa COMERCIAL RS LTDA (para referência)
- Company ID: `d7f30ea1-9df3-4124-a561-12984ffff64b`
- Total Documentos: 4.495 (429 entradas + 4.066 saídas)
- CFOPs 2xxx presentes: 2102, 2551, 2556, 2910, 2403, 2653, 2949

## Arquivos Principais
- `/app/backend/server.py` - Backend monolítico FastAPI
- `/app/frontend/src/pages/ViloesOportunidades.js` - Frontend Vilões
- `/app/frontend/src/pages/Apuracao.js` - Frontend ICMS

## Credenciais de Teste
- **Super Admin**: `alberto.lemes@businessconta.com.br` / `Business@2026`

## Próximos Passos Sugeridos
1. Investigar e corrigir endpoint RET se ainda estiver causando problemas
2. Verificar discrepância Dashboard vs ICMS
3. Corrigir Insights IA
4. Importar documentos de entrada para empresa REPUBLIC (problema de dados do cliente)
