# AURION - Sistema de Fechamento Fiscal Premium

## Problema Original
Sistema de contabilidade fiscal para escritórios de contabilidade brasileiros, com funcionalidades de:
- Upload e processamento de XMLs de notas fiscais (NF-e, NFC-e, NFS-e)
- Classificação de produtos com IA
- Apuração mensal de impostos (ICMS, PIS, COFINS)
- Geração de arquivos SPED Fiscal
- Análise tributária inteligente

## Rebranding (v2.0 - Fevereiro 2026)
- **Nome**: AURION (significado: ouro/energia)
- **Slogan**: "Seu Núcleo de Inteligência Operacional"
- **Paleta de Cores Ultra Premium**:
  - Base: #0C0C0C (Preto suave)
  - Primária: #2A2A2A (Cinza quente)
  - Acento: #C8A951 (Dourado fosco - uso mínimo)

## Arquitetura

### Backend (FastAPI)
- `/app/backend/server.py` - Monolito principal
- `/app/backend/services/` - Serviços auxiliares
- `/app/backend/sieg_service.py` - Integração SIEG

### Frontend (React)
- `/app/frontend/src/pages/` - Páginas da aplicação
- `/app/frontend/src/components/` - Componentes reutilizáveis
- `/app/frontend/src/context/` - Context providers

## Funcionalidades Implementadas

### Sistema de Usuários e Perfis ✅
- **Super Admin**: Acesso total, gerencia todos os usuários
- **Master**: Vê todas as empresas, pode filtrar por responsável
- **Operacional**: Vê apenas empresas designadas

### Cadastro de Empresa Completo ✅ (Restaurado v2.8.0)
**Campos do Formulário:**
- Código/ID da Empresa
- CNPJ (com busca automática na Receita Federal)
- Razão Social, Nome Fantasia
- Regime Tributário (Simples, Presumido, Real)
- Tipo de Atividade (Comércio, Indústria, Serviços, Mista)
- Presunção IRPJ (%) e CSLL (%) - apenas para Lucro Presumido
- CNAE Principal e Descrição
- Classificação Inteligente (IA)
- Flags de Contribuinte:
  - Equiparado a Indústria
  - Apura ICMS
  - Apura ICMS ST
- Usuários Responsáveis
- Localização: Cidade, UF, CEP
- **Inscrição Estadual (IE)**
- **Inscrição Municipal (IM)**
- **Classificação de Produtos (para IA):**
  - Produtos Comercializados (REVENDA)
  - Insumos de Produção (INSUMO)
  - Produtos de Despesa (DESPESA)
  - Ativo Imobilizado
  - Combustível
- **Certificado Digital:**
  - Nome do Arquivo (.pfx)
  - Senha do Certificado
  - Data de Validade

### Módulos de Apuração ✅
- **PIS/COFINS** (`/pis-cofins`): Apuração completa com comparativo de regimes
- **ICMS** (`/apuracao-icms`): Créditos e Débitos por CFOP
- **ISS** (`/apuracao-iss`): Apuração para serviços
- **IPI** (`/apuracao-ipi`): Apuração para indústrias
- **ICMS ST**: Aba dentro de Apuração ICMS
- **RET** (`/ret`): Rota de Eficiência Tributária com IA

### Menu Dinâmico ✅
O menu lateral é atualizado dinamicamente baseado no perfil da empresa:
- PIS/COFINS: Sempre visível
- ICMS: Comércio, Indústria, Mista ou flag `apura_icms`
- ISS: Serviços ou Mista
- IPI: Indústria ou flag `equiparado_industria`
- RET: Sempre visível

### Nova Navegação de Documentos ✅
- Nível 1: ENTRADAS (verde) / SAÍDAS (azul)
- Nível 2: Tipos de documentos (NF-e, NFC-e, CT-e, Serviços)
- Nível 3: Lista de documentos com upload integrado

## Credenciais de Teste
- **Email**: admin@test.com
- **Senha**: 123456

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
- [ ] Upload real de arquivo de certificado digital (.pfx)
- [ ] Validação de certificado digital

### P2 - Média Prioridade
- [ ] Refatorar server.py em módulos (routers)
- [ ] Implementar sistema de licenças
- [ ] Dashboard de estatísticas do escritório

### P3 - Futuro
- [ ] Multi-tenancy completo
- [ ] Relatórios customizáveis
- [ ] Exportação em múltiplos formatos
- [ ] Funcionalidades Simples Nacional

## Integrações
- **Gemini (IA)**: Classificação de produtos via Emergent LLM Key
- **SIEG**: Cofre de XMLs
- **Receita Federal**: Consulta CNPJ
- **XLSX**: Importação em lote de empresas

## Changelog

### v2.9.0 (09/02/2026) - RET Completo e CNAEs Secundários Automáticos

**CNAEs Secundários Automáticos:**
- Ao buscar CNPJ no cadastro de empresa, os CNAEs secundários são importados automaticamente da Receita Federal
- Backend atualizado para retornar `cnaes_secundarios` da BrasilAPI

**RET - Rota de Eficiência Tributária (Reescrito):**
- **Aba CMV/CPV (Nova)**:
  - Campos de Estoque Inicial e Final com botão "Salvar Estoque"
  - Cálculo automático: CMV = Estoque Inicial + Compras - Estoque Final
  - Exibição do Lucro Bruto (Receita - CMV)

- **Aba Ponto de Equilíbrio (Nova)**:
  - Demonstrativo com Receita Total, CMV e Lucro Bruto
  - **Despesas para Equilibrar**: Valor necessário para zerar lucro tributável
  - **Economia Potencial em IRPJ+CSLL**: Economia se atingir o ponto de equilíbrio
  - Dica para o empresário com sugestões de despesas dedutíveis

- **Aba Comparativo Regimes (Nova)**:
  - Simulação de Lucro Presumido com base nas receitas escrituradas
  - Separação por atividade (Comércio/Indústria e Serviços) se empresa for mista
  - Cálculo de IRPJ (15% + adicional 10%) e CSLL (9%)
  - Total consolidado de IRPJ + CSLL

- **Dashboard Dinâmico**:
  - Cards de impostos só aparecem para contribuintes (baseado no cadastro da empresa)
  - ICMS: apenas se tipo_atividade = comercio, industria, mista ou flag apura_icms
  - ISS: apenas se tipo_atividade = servicos ou mista
  - IPI: apenas se tipo_atividade = industria ou flag equiparado_industria
  - ICMS ST: apenas se flag apura_icms_st
  - PIS/COFINS: sempre visível

### v2.8.0 (09/02/2026) - Restauração Completa do Cadastro de Empresa
- **Campos de Presunção restaurados**: Presunção IRPJ (%) e CSLL (%) agora aparecem quando regime = Lucro Presumido
- **Presunção por Atividade (NOVO)**: Quando tipo de atividade = "Mista", exibe campos separados:
  - 📦 Atividade de Comércio: Presunção IRPJ Comércio (8%), CSLL Comércio (12%)
  - 🛠️ Atividade de Serviços: Presunção IRPJ Serviços (32%), CSLL Serviços (32%)
- **CNAEs Secundários (NOVO)**: Campo para adicionar múltiplos CNAEs secundários conforme cartão CNPJ
- **Campos de Classificação de Produtos restaurados**:
  - Produtos Comercializados (para classificação REVENDA) - cor azul
  - Insumos de Produção (para classificação INSUMO) - cor verde
  - Produtos de Despesa (sempre classificados como DESPESA) - cor vermelha
  - Ativo Imobilizado - cor âmbar
  - Combustível - cor roxa
- **Campos de Inscrição melhorados**:
  - Inscrição Estadual (IE) - campo completo
  - Inscrição Municipal (IM) - campo completo
  - CEP - campo adicionado
- **Seção Localização e Inscrições reorganizada** em um card único
- **Certificado Digital**: Campos para arquivo, senha e validade
- **Backend atualizado**: Modelos Company, CompanyCreate e CompanyUpdate incluem todos os novos campos

### v2.7.0 (08/02/2026) - RET, IPI e ICMS ST
- Nova Página RET - Rota de Eficiência Tributária
- Nova Página Apuração IPI
- Nova Aba ICMS ST
- Menu dinâmico baseado no perfil da empresa

### v2.6.0 (08/02/2026) - Reestruturação do Menu de Apuração
- Nova Página Apuração ICMS
- Nova Página Apuração ISS
- Melhorias em PIS/COFINS (Top 10, CFOP+CST)

### v2.5.0 (08/02/2026)
- Novo Módulo PIS/COFINS Completo
- Comparativo de Regimes
- Análise de Divergências

### Versões Anteriores
- v2.4.0: Exclusão em massa de documentos
- v2.3.0: Validação de upload por tipo, IA para extração
- v2.2.0: Nova navegação de documentos em 3 níveis
- v2.1.0: Importação em lote de empresas
- v2.0.0: Rebranding AURION
