# AURION - Sistema Fiscal Brasileiro
## Product Requirements Document

### Problema Original
Sistema de gestão fiscal para empresas brasileiras com validadores de PIS/COFINS e ICMS, permitindo auditoria de alíquotas, CSTs e integração de regras customizadas por empresa.

### Arquitetura
- **Frontend**: React (porta 3000)
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB
- **Preview URL**: https://validator-system.preview.emergentagent.com

### Funcionalidades Implementadas

#### Validador PIS/COFINS (Completo ✅)
- [x] Regras baseadas em NCM completo (8 dígitos)
- [x] Filtros por tipo de tributação (Monofásico, Alíquota Zero, etc.)
- [x] Botões "Rever CST Entrada" e "Rever CST Saída"
- [x] Botão "Exportar Divergências" - gera CSV com NCMs divergentes
- [x] CFOPs de exceção tratados automaticamente
- [x] Integração de regras customizadas na apuração principal

#### Validador ICMS (Completo ✅)
- [x] Contadores de status como filtros clicáveis
- [x] Colunas ordenáveis
- [x] Lógica corrigida para produtos ST
- [x] Edição de regras direto na lista

#### Classificação Inteligente com IA (Completo ✅)
- [x] Comando de IA em linguagem natural
- [x] learned_rules persistidas no banco
- [x] Integração na importação de documentos
- [x] Hierarquia: CFOP > Cache/Rules > NCMs Vendidos > IA

#### Sistema Matriz-Filial (Em Desenvolvimento 🔄)
- [x] CFOPs de transferência (1152, 2152, 5152, 6152, etc.) excluídos de PIS/COFINS
- [x] Constante `CFOPS_TRANSFERENCIA` centralizada em `fiscal_constants.py`
- [x] Função `is_cfop_transferencia()` para verificação
- [x] Detalhamento PIS/COFINS com categoria "Transferências" separada
- [x] Endpoint de consolidação do grupo atualizado para usar `calcular_pis_cofins_unificado`
- [ ] Interface frontend para cadastro de grupos empresariais
- [ ] Relatórios consolidados de IRPJ/CSLL para a matriz
- [ ] Carga tributária consolidada

#### Refatoração do Backend (Fase 1 Completa ✅)
- [x] Constantes fiscais em `/app/backend/utils/fiscal_constants.py`
- [x] Funções utilitárias de DB em `/app/backend/utils/db_utils.py`
- [x] Imports centralizados em `/app/backend/utils/constants.py`
- [x] Modelos ICMS em `/app/backend/models/icms_models.py`
- [x] Modelos PIS/COFINS em `/app/backend/models/pis_cofins_models.py`
- [ ] Extração completa dos endpoints para routers separados (Fase 2)

### CFOPs de Transferência (Não geram PIS/COFINS)
```python
CFOPS_TRANSFERENCIA = [
    # Entradas
    '1151', '1152', '1153', '1154', '1408', '1409',  # Internas
    '2151', '2152', '2153', '2154', '2408', '2409',  # Interestaduais
    # Saídas
    '5151', '5152', '5153', '5155', '5156', '5408', '5409',  # Internas
    '6151', '6152', '6153', '6155', '6156', '6408', '6409',  # Interestaduais
]
```

### Endpoints Principais
- `GET /api/validador-pis-cofins/{company_id}/dados` - Dados do validador
- `GET /api/pis-cofins/apuracao/{company_id}` - Apuração completa
- `GET /api/pis-cofins/detalhamento/{company_id}` - Detalhamento com transferências
- `GET /api/grupos-empresariais` - Lista grupos empresariais
- `POST /api/grupos-empresariais` - Criar grupo empresarial
- `GET /api/grupos-empresariais/{grupo_id}/consolidado` - Dashboard consolidado

### Tarefas Pendentes (P0)
- [ ] Interface frontend para gestão de grupos empresariais (matriz-filial)
- [ ] Relatório consolidado de IRPJ/CSLL para a matriz
- [ ] Carga tributária consolidada do grupo

### Tarefas Pendentes (P1)
- [ ] Totalizador por CST nos detalhamentos de CRÉDITOS/DÉBITOS
- [ ] Fase 2 da refatoração: extrair endpoints dos validadores para routers separados

### Backlog (P2)
- [ ] Pacote Docker para instalação On-Premise
- [ ] Popular página "Insights IA"
- [ ] Suíte de testes pytest mais abrangente

### Credenciais de Teste
- Email: alberto.lemes@businessconta.com.br
- Senha: @Ahl142536
- Empresa: COMERCIAL RS LTDA (d7f30ea1-9df3-4124-a561-12984ffff64b)
- Competência: 01/2026

### Última Atualização
- Data: 19/02/2026
- Status: CFOPs de transferência implementados - não geram mais PIS/COFINS
