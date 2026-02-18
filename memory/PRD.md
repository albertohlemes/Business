# AURION - Sistema Fiscal Brasileiro
## Product Requirements Document

### Problema Original
Sistema de gestão fiscal para empresas brasileiras com validadores de PIS/COFINS e ICMS, permitindo auditoria de alíquotas, CSTs e integração de regras customizadas por empresa.

### Arquitetura
- **Frontend**: React (porta 3000)
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB
- **Preview URL**: https://icms-rules-hub.preview.emergentagent.com

### Funcionalidades Implementadas

#### Validador PIS/COFINS (Completo)
- [x] Regras baseadas em NCM completo (8 dígitos)
- [x] Filtros por tipo de tributação (Monofásico, Alíquota Zero, etc.)
- [x] Botões "Rever CST Entrada" e "Rever CST Saída"
- [x] Botão "Exportar Divergências" - gera CSV com NCMs divergentes
- [x] CFOPs de exceção tratados automaticamente
- [x] Integração de regras customizadas na apuração principal

#### Validador ICMS (Completo)
- [x] Contadores de status como filtros clicáveis
- [x] Colunas ordenáveis
- [x] Lógica corrigida para produtos ST
- [x] Edição de regras direto na lista

#### Integração de Regras (Completo)
- [x] Hierarquia: Exceção CFOP > Regra Customizada > Regra Padrão
- [x] Função `calcular_pis_cofins_unificado` usa regras da empresa
- [x] Wizard de fechamento integrado com regras customizadas

### Endpoints Principais
- `GET /api/validador-pis-cofins/{company_id}/dados` - Dados do validador
- `GET /api/pis-cofins/apuracao/{company_id}` - Apuração completa
- `POST /api/validador-pis-cofins/{company_id}/aplicar-regras` - Aplicar regras aos documentos
- `GET /api/validador-icms/{company_id}/regras` - Regras ICMS

### Tarefas Pendentes (P1)
- [ ] Totalizador por CST nos detalhamentos de CRÉDITOS/DÉBITOS
- [ ] Integrar classificação IA na importação de documentos

### Backlog (P2)
- [ ] **Refatoração do server.py** (CRÍTICO - arquivo monolítico)
- [ ] Pacote Docker para instalação On-Premise
- [ ] Popular página "Insights IA"
- [ ] Suíte de testes pytest mais abrangente

### Credenciais de Teste
- Email: alberto.lemes@businessconta.com.br
- Senha: @Ahl142536
- Empresa: COMERCIAL RS LTDA (d7f30ea1-9df3-4124-a561-12984ffff64b)
- Competência: 01/2026

### Última Atualização
- Data: 18/02/2026
- Status: Implementação P0 completa e testada
