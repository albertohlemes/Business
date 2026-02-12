import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, ChevronRight, ChevronLeft, Check, 
  FileText, Tag, Gift, Upload, Sparkles, 
  Store, Factory, Wrench, Layers, Save,
  AlertCircle, CheckCircle2, Info, Search, RefreshCw, Fuel
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 1, title: 'Dados Básicos', icon: Building2, description: 'Informações da empresa' },
  { id: 2, title: 'Atividade', icon: Store, description: 'Tipo de atividade' },
  { id: 3, title: 'Tributação', icon: FileText, description: 'Regime tributário' },
  { id: 4, title: 'Classificação', icon: Tag, description: 'Palavras-chave' },
  { id: 5, title: 'Benefícios', icon: Gift, description: 'Benefícios fiscais' },
  { id: 6, title: 'Finalizar', icon: Check, description: 'Revisão e conclusão' },
];

const ATIVIDADES = [
  { value: 'comercio', label: 'Comércio', icon: Store, description: 'Compra e venda de mercadorias' },
  { value: 'industria', label: 'Indústria', icon: Factory, description: 'Produção e transformação' },
  { value: 'servicos', label: 'Serviços', icon: Wrench, description: 'Prestação de serviços' },
  { value: 'mista', label: 'Mista', icon: Layers, description: 'Comércio + Serviços' },
];

const REGIMES = [
  { value: 'simples_nacional', label: 'Simples Nacional', description: 'Regime simplificado para ME e EPP' },
  { value: 'lucro_presumido', label: 'Lucro Presumido', description: 'Presunção de lucro sobre receita' },
  { value: 'lucro_real', label: 'Lucro Real', description: 'Apuração sobre lucro contábil' },
];

// Tipos de Benefício Fiscal ICMS
const TIPOS_BENEFICIO_FISCAL = [
  { value: 'reducao_base', label: 'Redução de Base de Cálculo', description: 'Reduz a base de cálculo do ICMS' },
  { value: 'credito_presumido', label: 'Crédito Presumido', description: 'Crédito presumido sobre o ICMS' },
  { value: 'isencao', label: 'Isenção', description: 'Isenção total do ICMS' },
  { value: 'diferimento', label: 'Diferimento', description: 'Posterga o pagamento do ICMS' },
];

// Tipos de Estabelecimento para Benefício Fiscal
const TIPOS_ESTABELECIMENTO_BENEFICIO = [
  { 
    value: 'restaurante', 
    label: 'Restaurante / Bar / Lanchonete', 
    icon: '🍽️',
    description: 'Estabelecimento de alimentação - exclui todos os produtos da cesta básica',
    sugestao_exclusao: 'TODOS',
    palavras_excluir: ['carne', 'frango', 'peixe', 'arroz', 'feijao', 'oleo', 'acucar', 'leite', 'ovos', 'farinha', 'macarrao', 'frutas', 'verduras', 'legumes', 'sal', 'cafe', 'manteiga', 'margarina', 'queijo', 'presunto', 'linguica', 'bacon', 'salsicha', 'sorvete', 'refrigerante', 'cerveja', 'bebidas', 'temperos', 'molhos']
  },
  { 
    value: 'casa_carnes', 
    label: 'Casa de Carnes / Açougue', 
    icon: '🥩',
    description: 'Comércio de carnes - exclui todas as carnes da cesta básica',
    sugestao_exclusao: 'CARNES',
    palavras_excluir: ['carne', 'bovina', 'suina', 'frango', 'peixe', 'linguica', 'bacon', 'presunto', 'salsicha', 'mortadela', 'costela', 'picanha', 'alcatra', 'patinho', 'filé', 'maminha', 'cupim', 'acém', 'paleta', 'peito', 'coxa', 'sobrecoxa', 'asa', 'tilapia', 'salmao', 'bacalhau', 'camarao', 'frios', 'embutidos']
  },
  { 
    value: 'padaria', 
    label: 'Padaria / Confeitaria', 
    icon: '🥖',
    description: 'Comércio de pães e derivados - exclui farináceos e derivados',
    sugestao_exclusao: 'FARINACEOS',
    palavras_excluir: ['pao', 'farinha', 'trigo', 'bolo', 'biscoito', 'bolacha', 'macarrao', 'fermento', 'açúcar', 'leite', 'ovos', 'manteiga', 'margarina', 'creme', 'chocolate', 'doces', 'salgados', 'rosca', 'sonho', 'croissant']
  },
  { 
    value: 'hortifruti', 
    label: 'Hortifruti / Sacolão', 
    icon: '🥬',
    description: 'Comércio de frutas, verduras e legumes',
    sugestao_exclusao: 'HORTIFRUTI',
    palavras_excluir: ['frutas', 'verduras', 'legumes', 'alface', 'tomate', 'cebola', 'batata', 'cenoura', 'banana', 'maça', 'laranja', 'limao', 'abacaxi', 'manga', 'mamao', 'uva', 'melancia', 'melao', 'morango', 'pepino', 'abobrinha', 'berinjela', 'pimentao', 'couve', 'repolho', 'brocolis', 'espinafre']
  },
  { 
    value: 'mercado', 
    label: 'Mercado / Mercearia', 
    icon: '🛒',
    description: 'Comércio varejista misto - exclui itens básicos específicos',
    sugestao_exclusao: 'BASICOS',
    palavras_excluir: ['arroz', 'feijao', 'oleo', 'acucar', 'sal', 'cafe', 'leite', 'farinha', 'macarrao', 'fuba', 'aveia', 'sardinha', 'atum']
  },
  { 
    value: 'laticinios', 
    label: 'Laticínios / Frios', 
    icon: '🧀',
    description: 'Comércio de laticínios e derivados de leite',
    sugestao_exclusao: 'LATICINIOS',
    palavras_excluir: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao', 'creme', 'nata', 'ricota', 'mussarela', 'provolone', 'parmesao', 'gorgonzola', 'frios', 'presunto', 'mortadela']
  },
  { 
    value: 'bebidas', 
    label: 'Distribuidora de Bebidas', 
    icon: '🍺',
    description: 'Comércio de bebidas em geral',
    sugestao_exclusao: 'BEBIDAS',
    palavras_excluir: ['cerveja', 'refrigerante', 'agua', 'suco', 'vinho', 'destilados', 'cachaca', 'vodka', 'whisky', 'energetico', 'isotônico', 'cha', 'mate']
  },
  { 
    value: 'outros', 
    label: 'Outros / Personalizado', 
    icon: '📦',
    description: 'Defina manualmente os produtos a excluir',
    sugestao_exclusao: 'PERSONALIZADO',
    palavras_excluir: []
  },
];

const WizardEmpresa = ({ companyId, onComplete, onCancel }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [anexosSugeridos, setAnexosSugeridos] = useState([]);
  
  // Dados do formulário - COMPLETO igual ao modal antigo
  const [formData, setFormData] = useState({
    // === DADOS BÁSICOS ===
    cnpj: '',
    codigo_empresa: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    endereco: '',
    cidade: '',
    uf: 'SP',
    cep: '',
    cnae_principal: '',
    cnae_principal_descricao: '',
    cnaes: [],
    atividade_principal: '',
    logo_url: '',
    
    // === ATIVIDADE ===
    tipo_atividade: 'comercio',
    tipos_servico: [],
    atividade_locacao: false,
    perfis_comerciais: ['varejo'],
    aplicacao_em_servicos: false,
    is_transportadora: false,
    tipo_transporte: 'carga',
    
    // === TRIBUTAÇÃO ===
    regime_tributario: 'lucro_presumido',
    anexos_simples: [],
    anexos_confirmados: false,
    controla_fator_r: false,
    folha_pagamento_12m: 0,
    
    // Flags de contribuinte
    equiparado_industria: false,
    apura_icms: false,
    apura_icms_st: false,
    apura_pis_cofins: true,
    apura_iss: false,
    
    // Flags de desconsiderar ICMS
    desconsiderar_icms_despesas: false,
    desconsiderar_icms_st: false,
    
    // === PRESUNÇÃO (Lucro Presumido) ===
    percentual_presuncao_irpj: 8.0,
    percentual_presuncao_csll: 12.0,
    percentual_presuncao_irpj_comercio: 8.0,
    percentual_presuncao_csll_comercio: 12.0,
    percentual_presuncao_irpj_servico: 32.0,
    percentual_presuncao_csll_servico: 32.0,
    percentual_presuncao_irpj_industria: 8.0,
    percentual_presuncao_csll_industria: 12.0,
    
    // === CLASSIFICAÇÃO - PALAVRAS-CHAVE ===
    produtos_comercializados: [],
    produtos_aplicacao_servico: [],
    insumos_producao: [],
    produtos_despesa: [],
    produtos_ativo_imobilizado: [],
    produtos_combustivel: [],
    classificacao_inteligente: '',
    
    // === PRESUNÇÃO - LUCRO PRESUMIDO ===
    percentual_presuncao: 8,
    percentual_presuncao_comercio: 8,
    percentual_presuncao_servicos: 32,
    
    // === BENEFÍCIOS FISCAIS ===
    beneficio_fiscal_icms: false,
    tipo_beneficio_fiscal: '',
    tipo_estabelecimento_beneficio: '',
    percentual_reducao_icms: 0,
    produtos_sem_credito_icms: [],
    produtos_sem_credito_descricao: '',
    credito_presumido_icms_percent: 20.0,
    palavras_exclusao_personalizadas: [],
    
    // === SALDO CREDOR INICIAL ===
    possui_saldo_credor: false,
    saldo_credor_icms: 0,
    saldo_credor_pis: 0,
    saldo_credor_cofins: 0,
    competencia_saldo_inicial: '',
    
    // === CERTIFICADO DIGITAL ===
    certificado_digital_arquivo: '',
    certificado_digital_senha: '',
    certificado_digital_validade: '',
    
    // === RESPONSÁVEIS ===
    responsavel_ids: [],
  });

  // Formatar CNPJ
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  // Sugerir anexos do Simples por CNAEs
  const sugerirAnexosPorCnaes = (cnaes) => {
    const todosAnexos = new Set();
    const divisaoIndustria = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'];
    const divisaoComercio = ['45', '46', '47'];
    
    for (const cnae of cnaes) {
      if (!cnae) continue;
      const codigo = cnae.substring(0, 2);
      if (divisaoIndustria.includes(codigo)) todosAnexos.add('II');
      if (divisaoComercio.includes(codigo)) todosAnexos.add('I');
      // Serviços
      if (['49', '50', '51', '52', '53', '55', '56', '58', '59', '60', '61', '62', '63', '64', '65', '66', '68', '69', '70', '71', '72', '73', '74', '75', '77', '78', '79', '80', '81', '82', '84', '85', '86', '87', '88', '90', '91', '92', '93', '94', '95', '96'].includes(codigo)) {
        todosAnexos.add('III');
      }
    }
    return Array.from(todosAnexos).sort();
  };

  // Buscar dados na Receita Federal
  const buscarCNPJ = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      toast.error('Digite um CNPJ válido com 14 dígitos');
      return;
    }

    setLoadingCNPJ(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/cnpj/${cnpjLimpo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      
      // Determinar tipo de atividade com base no CNAE
      let tipoAtividade = 'comercio';
      const cnaePrincipal = data.cnae_principal || '';
      if (cnaePrincipal.startsWith('10') || cnaePrincipal.startsWith('11') || 
          cnaePrincipal.startsWith('12') || cnaePrincipal.startsWith('13') ||
          cnaePrincipal.startsWith('20') || cnaePrincipal.startsWith('21') ||
          cnaePrincipal.startsWith('22') || cnaePrincipal.startsWith('23') ||
          cnaePrincipal.startsWith('24') || cnaePrincipal.startsWith('25') ||
          cnaePrincipal.startsWith('26') || cnaePrincipal.startsWith('27') ||
          cnaePrincipal.startsWith('28') || cnaePrincipal.startsWith('29') ||
          cnaePrincipal.startsWith('30') || cnaePrincipal.startsWith('31') ||
          cnaePrincipal.startsWith('32') || cnaePrincipal.startsWith('33')) {
        tipoAtividade = 'industria';
      } else if (cnaePrincipal.startsWith('45') || cnaePrincipal.startsWith('46') || 
                 cnaePrincipal.startsWith('47')) {
        tipoAtividade = 'comercio';
      } else if (cnaePrincipal.startsWith('49') || cnaePrincipal.startsWith('50') ||
                 cnaePrincipal.startsWith('51') || cnaePrincipal.startsWith('52') ||
                 cnaePrincipal.startsWith('53') || cnaePrincipal.startsWith('55') ||
                 cnaePrincipal.startsWith('56') || cnaePrincipal.startsWith('58') ||
                 cnaePrincipal.startsWith('59') || cnaePrincipal.startsWith('60') ||
                 cnaePrincipal.startsWith('61') || cnaePrincipal.startsWith('62') ||
                 cnaePrincipal.startsWith('63') || cnaePrincipal.startsWith('64') ||
                 cnaePrincipal.startsWith('65') || cnaePrincipal.startsWith('66') ||
                 cnaePrincipal.startsWith('68') || cnaePrincipal.startsWith('69') ||
                 cnaePrincipal.startsWith('70') || cnaePrincipal.startsWith('71') ||
                 cnaePrincipal.startsWith('72') || cnaePrincipal.startsWith('73') ||
                 cnaePrincipal.startsWith('74') || cnaePrincipal.startsWith('75') ||
                 cnaePrincipal.startsWith('77') || cnaePrincipal.startsWith('78') ||
                 cnaePrincipal.startsWith('79') || cnaePrincipal.startsWith('80') ||
                 cnaePrincipal.startsWith('81') || cnaePrincipal.startsWith('82')) {
        tipoAtividade = 'servicos';
      }
      
      setFormData(prev => ({
        ...prev,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        endereco: data.logradouro || '',
        cidade: data.municipio || '',
        uf: data.uf || 'SP',
        cnae_principal: data.cnae_principal || '',
        cnae_principal_descricao: data.cnae_principal_descricao || '',
        cnaes: data.cnaes_secundarios || [],
        tipo_atividade: tipoAtividade,
        atividade_principal: data.cnae_principal_descricao || '',
      }));
      
      // Sugerir anexos automaticamente
      const todosOsCnaes = [data.cnae_principal, ...(data.cnaes_secundarios || [])].filter(Boolean);
      const anexos = sugerirAnexosPorCnaes(todosOsCnaes);
      setAnexosSugeridos(anexos);
      
      const qtdCnaes = data.cnaes_secundarios?.length || 0;
      toast.success(`Dados carregados da Receita Federal! ${qtdCnaes > 0 ? `${qtdCnaes} CNAEs secundários importados.` : ''} Anexos sugeridos: ${anexos.join(', ') || 'Nenhum'}`);
    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err);
      toast.error(err.response?.data?.detail || 'Erro ao consultar CNPJ na Receita Federal');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  // Estado para palavras-chave temporárias
  const [newKeyword, setNewKeyword] = useState({
    comercializados: '',
    insumos: '',
    despesa: '',
    servico: '',
    imobilizado: '',
    combustivel: '',
    sem_credito: '',
  });
  
  // Estado para IA de classificação
  const [descricaoAtividade, setDescricaoAtividade] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  
  // Função para gerar palavras-chave via IA
  const gerarPalavrasChaveIA = async () => {
    if (!descricaoAtividade.trim()) {
      toast.error('Descreva as atividades da empresa primeiro');
      return;
    }
    
    setLoadingIA(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/api/classificacao/gerar-palavras-chave`, {
        descricao: descricaoAtividade,
        tipo_atividade: formData.tipo_atividade,
        cnae_principal: formData.cnae_principal,
        cnae_descricao: formData.cnae_principal_descricao,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sugestoes = response.data;
      
      // Preencher automaticamente as categorias
      if (sugestoes.produtos_comercializados?.length > 0) {
        setFormData(prev => ({
          ...prev,
          produtos_comercializados: [...new Set([...prev.produtos_comercializados, ...sugestoes.produtos_comercializados])]
        }));
      }
      if (sugestoes.insumos_producao?.length > 0) {
        setFormData(prev => ({
          ...prev,
          insumos_producao: [...new Set([...prev.insumos_producao, ...sugestoes.insumos_producao])]
        }));
      }
      if (sugestoes.produtos_despesa?.length > 0) {
        setFormData(prev => ({
          ...prev,
          produtos_despesa: [...new Set([...prev.produtos_despesa, ...sugestoes.produtos_despesa])]
        }));
      }
      if (sugestoes.produtos_aplicacao_servico?.length > 0) {
        setFormData(prev => ({
          ...prev,
          produtos_aplicacao_servico: [...new Set([...prev.produtos_aplicacao_servico, ...sugestoes.produtos_aplicacao_servico])]
        }));
      }
      if (sugestoes.ativo_imobilizado?.length > 0) {
        setFormData(prev => ({
          ...prev,
          ativo_imobilizado: [...new Set([...prev.ativo_imobilizado, ...sugestoes.ativo_imobilizado])]
        }));
      }
      if (sugestoes.combustivel?.length > 0) {
        setFormData(prev => ({
          ...prev,
          combustivel: [...new Set([...prev.combustivel, ...sugestoes.combustivel])]
        }));
      }
      
      const totalSugestoes = (sugestoes.produtos_comercializados?.length || 0) +
                             (sugestoes.insumos_producao?.length || 0) +
                             (sugestoes.produtos_despesa?.length || 0) +
                             (sugestoes.produtos_aplicacao_servico?.length || 0) +
                             (sugestoes.ativo_imobilizado?.length || 0) +
                             (sugestoes.combustivel?.length || 0);
      
      toast.success(`${totalSugestoes} palavras-chave sugeridas pela IA!`);
    } catch (err) {
      console.error('Erro ao gerar palavras-chave:', err);
      toast.error('Erro ao consultar IA. Tente novamente.');
    } finally {
      setLoadingIA(false);
    }
  };

  // Carregar dados da empresa se for edição
  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const company = response.data;
      setFormData({
        // Dados básicos
        cnpj: company.cnpj || '',
        codigo_empresa: company.codigo_empresa || '',
        razao_social: company.razao_social || '',
        nome_fantasia: company.nome_fantasia || '',
        inscricao_estadual: company.inscricao_estadual || '',
        inscricao_municipal: company.inscricao_municipal || '',
        endereco: company.endereco || '',
        cidade: company.cidade || '',
        uf: company.uf || 'SP',
        cep: company.cep || '',
        cnae_principal: company.cnae_principal || '',
        cnae_principal_descricao: company.cnae_principal_descricao || '',
        cnaes: company.cnaes || [],
        atividade_principal: company.atividade_principal || '',
        logo_url: company.logo_url || '',
        
        // Atividade
        tipo_atividade: company.tipo_atividade || 'comercio',
        tipos_servico: company.tipos_servico || [],
        atividade_locacao: company.atividade_locacao || false,
        perfis_comerciais: company.perfis_comerciais || ['varejo'],
        aplicacao_em_servicos: company.aplicacao_em_servicos || false,
        is_transportadora: company.is_transportadora || false,
        tipo_transporte: company.tipo_transporte || 'carga',
        
        // Tributação
        regime_tributario: company.regime_tributario || 'lucro_presumido',
        anexos_simples: company.anexos_simples || [],
        anexos_confirmados: company.anexos_confirmados || false,
        controla_fator_r: company.controla_fator_r || false,
        folha_pagamento_12m: company.folha_pagamento_12m || 0,
        equiparado_industria: company.equiparado_industria || false,
        apura_icms: company.apura_icms || false,
        apura_icms_st: company.apura_icms_st || false,
        apura_pis_cofins: company.apura_pis_cofins !== false,
        apura_iss: company.apura_iss || false,
        desconsiderar_icms_despesas: company.desconsiderar_icms_despesas || false,
        desconsiderar_icms_st: company.desconsiderar_icms_st || false,
        
        // Presunção
        percentual_presuncao_irpj: company.percentual_presuncao_irpj || 8.0,
        percentual_presuncao_csll: company.percentual_presuncao_csll || 12.0,
        percentual_presuncao_irpj_comercio: company.percentual_presuncao_irpj_comercio || 8.0,
        percentual_presuncao_csll_comercio: company.percentual_presuncao_csll_comercio || 12.0,
        percentual_presuncao_irpj_servico: company.percentual_presuncao_irpj_servico || 32.0,
        percentual_presuncao_csll_servico: company.percentual_presuncao_csll_servico || 32.0,
        percentual_presuncao_irpj_industria: company.percentual_presuncao_irpj_industria || 8.0,
        percentual_presuncao_csll_industria: company.percentual_presuncao_csll_industria || 12.0,
        
        // Classificação
        produtos_comercializados: company.produtos_comercializados || [],
        produtos_aplicacao_servico: company.produtos_aplicacao_servico || [],
        insumos_producao: company.insumos_producao || [],
        produtos_despesa: company.produtos_despesa || [],
        ativo_imobilizado: company.ativo_imobilizado || [],
        combustivel: company.combustivel || [],
        classificacao_inteligente: company.classificacao_inteligente || '',
        
        // Benefícios
        beneficio_fiscal_icms: company.beneficio_fiscal_icms || false,
        tipo_beneficio_fiscal: company.tipo_beneficio_fiscal || '',
        tipo_estabelecimento_beneficio: company.tipo_estabelecimento_beneficio || '',
        percentual_reducao_icms: company.percentual_reducao_icms || 0,
        produtos_sem_credito_icms: company.produtos_sem_credito_icms || [],
        produtos_sem_credito_descricao: company.produtos_sem_credito_descricao || '',
        credito_presumido_icms_percent: company.credito_presumido_icms_percent || 20.0,
        palavras_exclusao_personalizadas: company.palavras_exclusao_personalizadas || [],
        
        // Saldo Credor
        possui_saldo_credor: company.possui_saldo_credor || false,
        saldo_credor_icms: company.saldo_credor_icms || 0,
        saldo_credor_pis: company.saldo_credor_pis || 0,
        saldo_credor_cofins: company.saldo_credor_cofins || 0,
        competencia_saldo_inicial: company.competencia_saldo_inicial || '',
        
        // Certificado
        certificado_digital_arquivo: company.certificado_digital_arquivo || '',
        certificado_digital_senha: company.certificado_digital_senha || '',
        certificado_digital_validade: company.certificado_digital_validade || '',
        
        // Responsáveis
        responsavel_ids: company.responsavel_ids || [],
      });
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
      toast.error('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addKeyword = (category) => {
    const keyword = newKeyword[category]?.trim();
    if (!keyword) return;
    
    const fieldMap = {
      comercializados: 'produtos_comercializados',
      insumos: 'insumos_producao',
      despesa: 'produtos_despesa',
      servico: 'produtos_aplicacao_servico',
      ativo_imobilizado: 'produtos_ativo_imobilizado',
      combustivel: 'produtos_combustivel',
      sem_credito: 'produtos_sem_credito_icms',
    };
    
    const field = fieldMap[category];
    if (field && !formData[field]?.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), keyword]
      }));
    }
    
    setNewKeyword(prev => ({ ...prev, [category]: '' }));
  };

  const removeKeyword = (category, keyword) => {
    const fieldMap = {
      comercializados: 'produtos_comercializados',
      insumos: 'insumos_producao',
      despesa: 'produtos_despesa',
      servico: 'produtos_aplicacao_servico',
      ativo_imobilizado: 'produtos_ativo_imobilizado',
      combustivel: 'produtos_combustivel',
      sem_credito: 'produtos_sem_credito_icms',
    };
    
    const field = fieldMap[category];
    if (field) {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field] || []).filter(k => k !== keyword)
      }));
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.codigo_empresa?.trim()) {
          toast.error('Código da Empresa é obrigatório');
          return false;
        }
        if (!formData.razao_social) {
          toast.error('Razão Social é obrigatória');
          return false;
        }
        if (!formData.cnpj) {
          toast.error('CNPJ é obrigatório');
          return false;
        }
        return true;
      case 2:
        if (!formData.tipo_atividade) {
          toast.error('Selecione o tipo de atividade');
          return false;
        }
        return true;
      case 3:
        if (!formData.regime_tributario) {
          toast.error('Selecione o regime tributário');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      if (companyId) {
        // Atualizar empresa existente
        await axios.put(`${API}/api/companies/${companyId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Empresa atualizada com sucesso!');
      } else {
        // Criar nova empresa
        await axios.post(`${API}/api/companies`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Empresa criada com sucesso!');
      }
      
      if (onComplete) {
        onComplete();
      } else {
        navigate('/empresas');
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  // Renderizar conteúdo de cada step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* CNPJ com botão de busca */}
            <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#C8A951]/30">
              <label className="block text-sm font-medium text-[#C8A951] mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Consultar CNPJ na Receita Federal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                  className="flex-1 px-4 py-3 bg-[#141414] border border-[#C8A951]/30 rounded-lg text-white focus:border-[#C8A951] focus:outline-none font-mono"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <button
                  type="button"
                  onClick={buscarCNPJ}
                  disabled={loadingCNPJ}
                  className="px-6 py-3 bg-[#C8A951] text-[#0C0C0C] rounded-lg font-semibold hover:bg-[#D4B85C] disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {loadingCNPJ ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Buscar
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-[#666] mt-2">
                Digite o CNPJ e clique em Buscar para preencher automaticamente os dados da empresa
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Código da Empresa */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Código da Empresa *
                </label>
                <input
                  type="text"
                  value={formData.codigo_empresa}
                  onChange={(e) => handleChange('codigo_empresa', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Ex: 0001"
                />
              </div>
              
              {/* Inscrição Estadual */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  value={formData.inscricao_estadual}
                  onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Número da IE"
                />
              </div>
              
              {/* Inscrição Municipal */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Inscrição Municipal
                </label>
                <input
                  type="text"
                  value={formData.inscricao_municipal}
                  onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Número da IM"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  value={formData.razao_social}
                  onChange={(e) => handleChange('razao_social', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Nome completo da empresa"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.nome_fantasia}
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Nome comercial"
                />
              </div>
              
              {/* CEP */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              
              {/* UF */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  UF
                </label>
                <input
                  type="text"
                  value={formData.uf}
                  onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="SP"
                />
              </div>
              
              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Nome da cidade"
                />
              </div>
              
              {/* Endereço */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>
            
            {/* CNAE se disponível - MOSTRANDO TODOS */}
            {formData.cnae_principal && (
              <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                <label className="block text-sm font-medium text-[#C8A951] mb-2">
                  CNAE Principal
                </label>
                <p className="text-white font-mono">{formData.cnae_principal}</p>
                {formData.cnae_principal_descricao && (
                  <p className="text-sm text-[#A1A1AA] mt-1">{formData.cnae_principal_descricao}</p>
                )}
                
                {/* Lista todos os CNAEs secundários */}
                {formData.cnaes?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#2A2A2A]">
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                      CNAEs Secundários ({formData.cnaes.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.cnaes.map((cnae, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-white font-mono bg-[#0C0C0C] px-2 py-1 rounded">
                            {typeof cnae === 'object' ? cnae.codigo : cnae}
                          </span>
                          {typeof cnae === 'object' && cnae.descricao && (
                            <span className="text-[#666] truncate">{cnae.descricao}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 2:
        // Detectar se é transportadora pelo CNAE
        const isTransportadoraByCnae = () => {
          const cnaePrincipal = formData.cnae_principal || '';
          const cnaesTransporte = ['49', '50', '51', '52', '53']; // Transporte terrestre, aquático, aéreo, armazenagem, correio
          return cnaesTransporte.some(c => cnaePrincipal.startsWith(c));
        };
        
        // Auto-set transportadora baseado no CNAE (apenas na primeira vez)
        if (isTransportadoraByCnae() && formData.is_transportadora === false && !formData._transportadora_checked) {
          handleChange('is_transportadora', true);
          handleChange('_transportadora_checked', true);
        }
        
        return (
          <div className="space-y-6">
            <p className="text-[#A1A1AA] mb-4">
              Selecione o tipo de atividade principal da empresa:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {ATIVIDADES.map(ativ => {
                const Icon = ativ.icon;
                const isSelected = formData.tipo_atividade === ativ.value;
                
                return (
                  <button
                    key={ativ.value}
                    onClick={() => handleChange('tipo_atividade', ativ.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#C8A951] bg-[#C8A951]/10'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-[#C8A951]' : 'text-[#666]'}`} />
                      <span className={`font-medium ${isSelected ? 'text-white' : 'text-[#A1A1AA]'}`}>
                        {ativ.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C8A951] ml-auto" />}
                    </div>
                    <p className="text-sm text-[#666]">{ativ.description}</p>
                  </button>
                );
              })}
            </div>
            
            {/* Perfis Comerciais (para comércio/mista) */}
            {['comercio', 'mista'].includes(formData.tipo_atividade) && (
              <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                <label className="block text-sm font-medium text-[#C8A951] mb-3">
                  Perfis Comerciais (pode selecionar mais de um)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'industria', label: 'Indústria', desc: 'Fabrica ou transforma produtos' },
                    { value: 'distribuidor', label: 'Distribuidor', desc: 'Distribuição atacadista' },
                    { value: 'varejo', label: 'Varejo', desc: 'Venda ao consumidor final' },
                  ].map(perfil => (
                    <button
                      key={perfil.value}
                      type="button"
                      onClick={() => {
                        const perfis = formData.perfis_comerciais || [];
                        const newPerfis = perfis.includes(perfil.value)
                          ? perfis.filter(p => p !== perfil.value)
                          : [...perfis, perfil.value];
                        handleChange('perfis_comerciais', newPerfis);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.perfis_comerciais?.includes(perfil.value)
                          ? 'border-[#C8A951] bg-[#C8A951]/10'
                          : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <span className="text-white text-sm font-medium">{perfil.label}</span>
                      <p className="text-xs text-[#666] mt-1">{perfil.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Checkbox: Equiparado à Indústria - SÓ PARA COMÉRCIO */}
            {formData.tipo_atividade === 'comercio' && (
              <label className="flex items-center gap-3 cursor-pointer bg-[#141414] p-4 rounded-lg border border-[#2A2A2A]">
                <input
                  type="checkbox"
                  checked={formData.equiparado_industria}
                  onChange={(e) => handleChange('equiparado_industria', e.target.checked)}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                />
                <div>
                  <span className="text-white font-medium">Equiparado à Indústria</span>
                  <p className="text-xs text-[#666]">Empresa que importa ou compra para industrialização por encomenda</p>
                </div>
              </label>
            )}
            
            {/* Checkbox: Atividade de Locação - SÓ PARA SERVIÇOS ou MISTA */}
            {['servicos', 'mista'].includes(formData.tipo_atividade) && (
              <label className="flex items-center gap-3 cursor-pointer bg-[#141414] p-4 rounded-lg border border-yellow-500/30">
                <input
                  type="checkbox"
                  checked={formData.atividade_locacao}
                  onChange={(e) => handleChange('atividade_locacao', e.target.checked)}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0C0C0C] text-yellow-500 focus:ring-yellow-500"
                />
                <div>
                  <span className="text-yellow-400 font-medium">Atividade de Locação de Bens</span>
                  <p className="text-xs text-[#666]">Marque se a empresa realiza locação de bens móveis (não incide ISS)</p>
                </div>
              </label>
            )}
            
            {/* Checkbox: Transportadora - com auto-detecção por CNAE */}
            <label className="flex items-center gap-3 cursor-pointer bg-[#141414] p-4 rounded-lg border border-[#2A2A2A]">
              <input
                type="checkbox"
                checked={formData.is_transportadora}
                onChange={(e) => handleChange('is_transportadora', e.target.checked)}
                className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
              />
              <div className="flex-1">
                <span className="text-white font-medium">Transportadora</span>
                <p className="text-xs text-[#666]">Empresa que presta serviço de transporte de cargas ou passageiros</p>
              </div>
              {isTransportadoraByCnae() && (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                  Detectado pelo CNAE
                </span>
              )}
            </label>
            
            {/* Tipo de Transporte (se for transportadora) */}
            {formData.is_transportadora && (
              <div className="ml-8">
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Tipo de Transporte</label>
                <select
                  value={formData.tipo_transporte}
                  onChange={(e) => handleChange('tipo_transporte', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                >
                  <option value="carga">Carga</option>
                  <option value="passageiros">Passageiros</option>
                  <option value="misto">Misto</option>
                </select>
              </div>
            )}
          </div>
        );
        
      case 3:
        // Função para determinar impostos automaticamente
        const getImpostosAutomaticos = () => {
          const impostos = { icms: false, icms_st: false, pis_cofins: false, iss: false };
          const regime = formData.regime_tributario;
          const atividade = formData.tipo_atividade;
          
          if (regime === 'simples_nacional') {
            // Simples Nacional - impostos já inclusos, mas pode ter ST
            if (['comercio', 'industria', 'mista'].includes(atividade)) {
              impostos.icms_st = true; // ST pode ser cobrado mesmo no Simples
            }
          } else if (regime === 'lucro_presumido' || regime === 'lucro_real') {
            if (['comercio', 'industria', 'mista'].includes(atividade)) {
              impostos.icms = true;
              impostos.icms_st = true;
              impostos.pis_cofins = true;
            }
            if (['servicos', 'mista'].includes(atividade)) {
              impostos.iss = true;
              impostos.pis_cofins = true;
            }
          }
          return impostos;
        };
        
        // Auto-set impostos ao mudar regime/atividade
        const impostosAuto = getImpostosAutomaticos();
        
        return (
          <div className="space-y-6">
            <div>
              <p className="text-[#A1A1AA] mb-4">
                Selecione o regime tributário da empresa:
              </p>
              <div className="space-y-3">
                {REGIMES.map(regime => {
                  const isSelected = formData.regime_tributario === regime.value;
                  
                  return (
                    <button
                      key={regime.value}
                      onClick={() => {
                        handleChange('regime_tributario', regime.value);
                        // Auto-sugerir anexos se Simples Nacional
                        if (regime.value === 'simples_nacional' && formData.cnaes?.length > 0) {
                          const anexos = sugerirAnexosPorCnaes(formData.cnaes);
                          handleChange('anexos_simples', anexos);
                        }
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[#C8A951] bg-[#C8A951]/10'
                          : 'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-medium ${isSelected ? 'text-white' : 'text-[#A1A1AA]'}`}>
                            {regime.label}
                          </span>
                          <p className="text-sm text-[#666] mt-1">{regime.description}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-6 h-6 text-[#C8A951]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Anexos do Simples Nacional */}
            {formData.regime_tributario === 'simples_nacional' && (
              <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                <label className="block text-sm font-medium text-[#C8A951] mb-3">
                  Anexos do Simples Nacional
                </label>
                {anexosSugeridos.length > 0 && (
                  <p className="text-xs text-blue-400 mb-3">
                    Sugeridos com base nos CNAEs: {anexosSugeridos.join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {['I', 'II', 'III', 'IV', 'V'].map(anexo => (
                    <button
                      key={anexo}
                      onClick={() => {
                        const anexos = formData.anexos_simples || [];
                        const newAnexos = anexos.includes(anexo)
                          ? anexos.filter(a => a !== anexo)
                          : [...anexos, anexo];
                        handleChange('anexos_simples', newAnexos);
                      }}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        formData.anexos_simples?.includes(anexo)
                          ? 'bg-[#C8A951]/20 border-[#C8A951] text-[#C8A951]'
                          : 'bg-[#0C0C0C] border-[#2A2A2A] text-[#666]'
                      }`}
                    >
                      Anexo {anexo}
                    </button>
                  ))}
                </div>
                
                {/* Fator R - SÓ aparece se Anexo V estiver marcado */}
                {formData.anexos_simples?.includes('V') && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.controla_fator_r}
                        onChange={(e) => handleChange('controla_fator_r', e.target.checked)}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                      />
                      <div>
                        <span className="text-white">Apura Fator R</span>
                        <p className="text-xs text-[#666]">Para verificar enquadramento entre Anexo III e V</p>
                      </div>
                    </label>
                    
                    {formData.controla_fator_r && (
                      <div className="mt-3 ml-8">
                        <label className="block text-sm text-[#A1A1AA] mb-1">Folha de Pagamento (últimos 12 meses)</label>
                        <input
                          type="number"
                          value={formData.folha_pagamento_12m}
                          onChange={(e) => handleChange('folha_pagamento_12m', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Campos de Presunção para Lucro Presumido */}
            {formData.regime_tributario === 'lucro_presumido' && (
              <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                <label className="block text-sm font-medium text-[#C8A951] mb-3">
                  Percentuais de Presunção (Lucro Presumido)
                </label>
                <p className="text-xs text-[#666] mb-4">
                  Defina os percentuais de presunção que serão aplicados no cálculo do IRPJ e CSLL
                </p>
                
                {/* Se for MISTA, mostra dois campos */}
                {formData.tipo_atividade === 'mista' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#A1A1AA] mb-1">
                        Presunção Comércio/Indústria (%)
                      </label>
                      <input
                        type="number"
                        value={formData.percentual_presuncao_comercio || 8}
                        onChange={(e) => handleChange('percentual_presuncao_comercio', parseFloat(e.target.value) || 8)}
                        className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                        placeholder="8%"
                        min="1"
                        max="32"
                      />
                      <p className="text-xs text-[#666] mt-1">Padrão: 8% para comércio e indústria</p>
                    </div>
                    <div>
                      <label className="block text-sm text-[#A1A1AA] mb-1">
                        Presunção Serviços (%)
                      </label>
                      <input
                        type="number"
                        value={formData.percentual_presuncao_servicos || 32}
                        onChange={(e) => handleChange('percentual_presuncao_servicos', parseFloat(e.target.value) || 32)}
                        className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                        placeholder="32%"
                        min="1"
                        max="32"
                      />
                      <p className="text-xs text-[#666] mt-1">Padrão: 32% para serviços</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-1">
                      Percentual de Presunção (%)
                    </label>
                    <input
                      type="number"
                      value={formData.percentual_presuncao || (formData.tipo_atividade === 'servicos' ? 32 : 8)}
                      onChange={(e) => handleChange('percentual_presuncao', parseFloat(e.target.value) || 8)}
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder={formData.tipo_atividade === 'servicos' ? '32%' : '8%'}
                      min="1"
                      max="32"
                    />
                    <p className="text-xs text-[#666] mt-1">
                      {formData.tipo_atividade === 'servicos' 
                        ? 'Padrão: 32% para prestação de serviços' 
                        : 'Padrão: 8% para comércio e indústria'}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Impostos que a empresa apura - Preenchido automaticamente */}
            <div className="border-t border-[#2A2A2A] pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#A1A1AA]">Impostos que a empresa apura:</p>
                <button
                  type="button"
                  onClick={() => {
                    handleChange('apura_icms', impostosAuto.icms);
                    handleChange('apura_icms_st', impostosAuto.icms_st);
                    handleChange('apura_pis_cofins', impostosAuto.pis_cofins);
                    handleChange('apura_iss', impostosAuto.iss);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Auto-preencher
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { field: 'apura_icms', label: 'ICMS' },
                  { field: 'apura_icms_st', label: 'ICMS ST' },
                  { field: 'apura_pis_cofins', label: 'PIS/COFINS' },
                  { field: 'apura_iss', label: 'ISS' },
                ].map(imposto => (
                  <button
                    key={imposto.field}
                    onClick={() => handleChange(imposto.field, !formData[imposto.field])}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      formData[imposto.field]
                        ? 'bg-[#C8A951]/20 border-[#C8A951] text-[#C8A951]'
                        : 'bg-[#141414] border-[#2A2A2A] text-[#666]'
                    }`}
                  >
                    {formData[imposto.field] && <Check className="w-4 h-4 inline mr-1" />}
                    {imposto.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Flags de Desconsiderar ICMS */}
            <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-[#A1A1AA] mb-3 text-sm">Configurações adicionais de ICMS:</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.desconsiderar_icms_despesas}
                    onChange={(e) => handleChange('desconsiderar_icms_despesas', e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951]"
                  />
                  <span className="text-white text-sm">Desconsiderar ICMS de despesas (não gera crédito)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.desconsiderar_icms_st}
                    onChange={(e) => handleChange('desconsiderar_icms_st', e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951]"
                  />
                  <span className="text-white text-sm">Desconsiderar ICMS ST para fins de classificação</span>
                </label>
              </div>
            </div>
            
            {/* Saldo Credor Inicial */}
            <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={formData.possui_saldo_credor}
                  onChange={(e) => handleChange('possui_saldo_credor', e.target.checked)}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951]"
                />
                <span className="text-white font-medium">Possui Saldo Credor Inicial</span>
              </label>
              
              {formData.possui_saldo_credor && (
                <div className="grid grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-1">Competência Inicial</label>
                    <input
                      type="text"
                      value={formData.competencia_saldo_inicial}
                      onChange={(e) => handleChange('competencia_saldo_inicial', e.target.value)}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="01/2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-1">Saldo ICMS</label>
                    <input
                      type="number"
                      value={formData.saldo_credor_icms}
                      onChange={(e) => handleChange('saldo_credor_icms', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-1">Saldo PIS</label>
                    <input
                      type="number"
                      value={formData.saldo_credor_pis}
                      onChange={(e) => handleChange('saldo_credor_pis', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-1">Saldo COFINS</label>
                    <input
                      type="number"
                      value={formData.saldo_credor_cofins}
                      onChange={(e) => handleChange('saldo_credor_cofins', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 4:
        // Determinar se deve mostrar campo Revenda ou Materiais para Aplicação
        const isServicos = formData.tipo_atividade === 'servicos';
        const isMista = formData.tipo_atividade === 'mista';
        const isComercioOuIndustria = ['comercio', 'industria'].includes(formData.tipo_atividade);
        
        return (
          <div className="space-y-6">
            {/* Seção IA - Gerar Palavras-Chave Automaticamente */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Classificação Inteligente com IA</h3>
                  <p className="text-sm text-[#A1A1AA]">Descreva as atividades da empresa e a IA irá sugerir palavras-chave</p>
                </div>
              </div>
              
              <textarea
                value={descricaoAtividade}
                onChange={(e) => setDescricaoAtividade(e.target.value)}
                className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                rows={4}
                placeholder="Ex: Empresa de comércio de materiais de construção. Vendemos cimento, areia, tijolos, telhas, tintas, ferramentas, materiais elétricos e hidráulicos. Também fornecemos para construtoras e empreiteiros..."
              />
              
              <button
                onClick={gerarPalavrasChaveIA}
                disabled={loadingIA || !descricaoAtividade.trim()}
                className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loadingIA ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Palavras-Chave Automaticamente
                  </>
                )}
              </button>
            </div>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium">Dica: Use palavras genéricas</p>
                  <p className="text-sm text-blue-400/70 mt-1">
                    Cadastre palavras como "carne", "fruta", "limpeza" - o sistema expandirá automaticamente
                    para incluir produtos relacionados (picanha, banana, detergente, etc.)
                  </p>
                </div>
              </div>
            </div>
            
            {/* REVENDA - Só para Comércio/Indústria */}
            {isComercioOuIndustria && (
              <div className="bg-[#141414] rounded-lg p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Store className="w-5 h-5 text-green-400" />
                  Produtos para Revenda
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword.comercializados}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, comercializados: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword('comercializados')}
                    className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                    placeholder="Ex: eletrônicos, roupas, calçados..."
                  />
                  <button
                    onClick={() => addKeyword('comercializados')}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.produtos_comercializados.map(keyword => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {keyword}
                      <button onClick={() => removeKeyword('comercializados', keyword)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* MATERIAIS PARA APLICAÇÃO EM SERVIÇOS - Para Serviços (substitui Revenda) */}
            {isServicos && (
              <div className="bg-[#141414] rounded-lg p-4 border border-purple-500/30">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-400" />
                  Materiais para Aplicação em Serviços
                </h3>
                <p className="text-xs text-[#666] mb-3">Ex: Peças para manutenção, materiais de construção aplicados em obras</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword.servico}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, servico: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword('servico')}
                    className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Ex: peças, componentes, materiais..."
                  />
                  <button
                    onClick={() => addKeyword('servico')}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.produtos_aplicacao_servico.map(keyword => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm flex items-center gap-1"
                    >
                      {keyword}
                      <button onClick={() => removeKeyword('servico', keyword)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* MISTA: Mostra REVENDA + MATERIAIS PARA APLICAÇÃO */}
            {isMista && (
              <>
                {/* Revenda para parte comercial */}
                <div className="bg-[#141414] rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Store className="w-5 h-5 text-green-400" />
                    Produtos para Revenda (Atividade Comercial)
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newKeyword.comercializados}
                      onChange={(e) => setNewKeyword(prev => ({ ...prev, comercializados: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword('comercializados')}
                      className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="Ex: eletrônicos, roupas, calçados..."
                    />
                    <button
                      onClick={() => addKeyword('comercializados')}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.produtos_comercializados.map(keyword => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm flex items-center gap-1"
                      >
                        {keyword}
                        <button onClick={() => removeKeyword('comercializados', keyword)} className="hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Materiais para aplicação na parte de serviços */}
                <div className="bg-[#141414] rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-purple-400" />
                    Materiais para Aplicação em Serviços (Atividade de Serviços)
                  </h3>
                  <p className="text-xs text-[#666] mb-3">Ex: Peças para manutenção, materiais de construção aplicados em obras</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newKeyword.servico}
                      onChange={(e) => setNewKeyword(prev => ({ ...prev, servico: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword('servico')}
                      className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="Ex: peças, componentes, materiais..."
                    />
                    <button
                      onClick={() => addKeyword('servico')}
                      className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.produtos_aplicacao_servico.map(keyword => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm flex items-center gap-1"
                      >
                        {keyword}
                        <button onClick={() => removeKeyword('servico', keyword)} className="hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Insumos */}
            <div className="bg-[#141414] rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-400" />
                Insumos de Produção
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword.insumos}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, insumos: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword('insumos')}
                  className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Ex: carne, fruta, legume, farinha..."
                />
                <button
                  onClick={() => addKeyword('insumos')}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.insumos_producao.map(keyword => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm flex items-center gap-1"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword('insumos', keyword)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* Despesas */}
            <div className="bg-[#141414] rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                Despesas / Uso e Consumo
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword.despesa}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, despesa: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword('despesa')}
                  className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Ex: limpeza, escritório, manutenção..."
                />
                <button
                  onClick={() => addKeyword('despesa')}
                  className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.produtos_despesa.map(keyword => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm flex items-center gap-1"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword('despesa', keyword)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* ATIVO IMOBILIZADO - NOVO */}
            <div className="bg-[#141414] rounded-lg p-4 border border-cyan-500/30">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                Ativo Imobilizado
              </h3>
              <p className="text-xs text-[#666] mb-3">Máquinas, equipamentos, veículos, móveis e utensílios para uso permanente</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword.ativo_imobilizado || ''}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, ativo_imobilizado: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword('ativo_imobilizado')}
                  className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Ex: computador, máquina, veículo, móvel..."
                />
                <button
                  onClick={() => addKeyword('ativo_imobilizado')}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.produtos_ativo_imobilizado || []).map(keyword => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm flex items-center gap-1"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword('ativo_imobilizado', keyword)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* COMBUSTÍVEL - NOVO */}
            <div className="bg-[#141414] rounded-lg p-4 border border-red-500/30">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Fuel className="w-5 h-5 text-red-400" />
                Combustível
              </h3>
              <p className="text-xs text-[#666] mb-3">Gasolina, diesel, etanol, GNV e derivados de petróleo</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword.combustivel || ''}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, combustivel: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword('combustivel')}
                  className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-red-500 focus:outline-none"
                  placeholder="Ex: gasolina, diesel, etanol..."
                />
                <button
                  onClick={() => addKeyword('combustivel')}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.produtos_combustivel || []).map(keyword => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm flex items-center gap-1"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword('combustivel', keyword)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            {/* Explicação */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-400 font-medium">Produtos sem Direito a Crédito de ICMS</p>
                  <p className="text-sm text-blue-400/70 mt-1">
                    Cadastre nomes de produtos ou NCMs (mesmo incompletos) que não dão direito a crédito de ICMS.
                    A IA utilizará essas informações na análise de benefícios fiscais nos menus de análises.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Campo único para adicionar produtos/NCMs */}
            <div className="bg-[#141414] rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                Produtos/NCMs sem Crédito
              </h3>
              <p className="text-xs text-[#666] mb-4">
                Digite o nome do produto ou NCM (pode ser parcial, ex: "carne", "02", "2202") e pressione Enter ou clique em Adicionar.
              </p>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={formData.produtos_sem_credito_descricao || ''}
                  onChange={(e) => handleChange('produtos_sem_credito_descricao', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const item = (formData.produtos_sem_credito_descricao || '').trim().toLowerCase();
                      if (item && !(formData.produtos_sem_credito_icms || []).includes(item)) {
                        handleChange('produtos_sem_credito_icms', [...(formData.produtos_sem_credito_icms || []), item]);
                        handleChange('produtos_sem_credito_descricao', '');
                        toast.success(`"${item}" adicionado!`);
                      }
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="Ex: carne, 02, 2202, frango, picanha..."
                  data-testid="input-produto-ncm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const item = (formData.produtos_sem_credito_descricao || '').trim().toLowerCase();
                    if (item && !(formData.produtos_sem_credito_icms || []).includes(item)) {
                      handleChange('produtos_sem_credito_icms', [...(formData.produtos_sem_credito_icms || []), item]);
                      handleChange('produtos_sem_credito_descricao', '');
                      toast.success(`"${item}" adicionado!`);
                    }
                  }}
                  className="px-6 py-3 bg-[#C8A951]/20 text-[#C8A951] rounded-lg hover:bg-[#C8A951]/30 transition-colors font-medium"
                >
                  Adicionar
                </button>
              </div>
              
              {/* Lista de itens cadastrados */}
              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-[#0C0C0C] rounded-lg border border-[#2A2A2A]">
                {(formData.produtos_sem_credito_icms || []).length === 0 ? (
                  <span className="text-[#666] text-sm">Nenhum produto/NCM cadastrado</span>
                ) : (
                  (formData.produtos_sem_credito_icms || []).map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm flex items-center gap-2 border border-orange-500/30"
                    >
                      {item}
                      <button 
                        type="button"
                        onClick={() => {
                          const novaLista = formData.produtos_sem_credito_icms.filter((_, i) => i !== index);
                          handleChange('produtos_sem_credito_icms', novaLista);
                        }}
                        className="hover:text-white text-lg leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              
              {(formData.produtos_sem_credito_icms || []).length > 0 && (
                <p className="text-xs text-[#666] mt-2">
                  {(formData.produtos_sem_credito_icms || []).length} item(ns) cadastrado(s)
                </p>
              )}
            </div>
            
            {/* Exemplos */}
            <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-sm text-[#A1A1AA] font-medium mb-2">Exemplos de uso:</p>
              <ul className="text-xs text-[#666] space-y-1">
                <li>• <span className="text-orange-400">carne</span> → Exclui todos os produtos que contenham "carne" na descrição</li>
                <li>• <span className="text-orange-400">02</span> → Exclui produtos com NCM iniciando em 02 (carnes)</li>
                <li>• <span className="text-orange-400">2202</span> → Exclui produtos com NCM 2202 (bebidas)</li>
                <li>• <span className="text-orange-400">arroz</span> → Exclui produtos que contenham "arroz"</li>
              </ul>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-medium">Tudo pronto para salvar!</span>
              </div>
              <p className="text-sm text-green-400/70 mt-1">
                Revise os dados abaixo e clique em "Finalizar" para salvar a empresa.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Resumo dos dados */}
              <div className="bg-[#141414] rounded-lg p-4">
                <h3 className="text-[#C8A951] font-medium mb-3">Dados Básicos</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[#666]">Razão Social:</span>
                  <span className="text-white">{formData.razao_social || '-'}</span>
                  <span className="text-[#666]">CNPJ:</span>
                  <span className="text-white">{formData.cnpj || '-'}</span>
                  <span className="text-[#666]">UF:</span>
                  <span className="text-white">{formData.uf || '-'}</span>
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-lg p-4">
                <h3 className="text-[#C8A951] font-medium mb-3">Tributação</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[#666]">Atividade:</span>
                  <span className="text-white capitalize">{formData.tipo_atividade || '-'}</span>
                  <span className="text-[#666]">Regime:</span>
                  <span className="text-white capitalize">{formData.regime_tributario?.replace('_', ' ') || '-'}</span>
                  <span className="text-[#666]">Impostos:</span>
                  <span className="text-white">
                    {[
                      formData.apura_icms && 'ICMS',
                      formData.apura_pis_cofins && 'PIS/COFINS',
                      formData.apura_iss && 'ISS'
                    ].filter(Boolean).join(', ') || '-'}
                  </span>
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-lg p-4">
                <h3 className="text-[#C8A951] font-medium mb-3">Palavras-chave para Classificação</h3>
                <div className="space-y-2 text-sm">
                  {formData.produtos_comercializados?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Revenda: </span>
                      <span className="text-green-400">{formData.produtos_comercializados.join(', ')}</span>
                    </div>
                  )}
                  {formData.produtos_aplicacao_servico?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Aplicação em Serviços: </span>
                      <span className="text-purple-400">{formData.produtos_aplicacao_servico.join(', ')}</span>
                    </div>
                  )}
                  {formData.insumos_producao?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Insumos: </span>
                      <span className="text-blue-400">{formData.insumos_producao.join(', ')}</span>
                    </div>
                  )}
                  {formData.produtos_despesa?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Despesas: </span>
                      <span className="text-orange-400">{formData.produtos_despesa.join(', ')}</span>
                    </div>
                  )}
                  {formData.produtos_ativo_imobilizado?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Ativo Imobilizado: </span>
                      <span className="text-cyan-400">{formData.produtos_ativo_imobilizado.join(', ')}</span>
                    </div>
                  )}
                  {formData.produtos_combustivel?.length > 0 && (
                    <div>
                      <span className="text-[#666]">Combustível: </span>
                      <span className="text-red-400">{formData.produtos_combustivel.join(', ')}</span>
                    </div>
                  )}
                  {(!formData.produtos_comercializados?.length && !formData.insumos_producao?.length && 
                    !formData.produtos_despesa?.length && !formData.produtos_aplicacao_servico?.length &&
                    !formData.produtos_ativo_imobilizado?.length && !formData.produtos_combustivel?.length) && (
                    <span className="text-[#666]">Nenhuma palavra-chave cadastrada</span>
                  )}
                </div>
              </div>
              
              {/* Produtos sem crédito */}
              {formData.produtos_sem_credito_icms?.length > 0 && (
                <div className="bg-[#141414] rounded-lg p-4">
                  <h3 className="text-[#C8A951] font-medium mb-3">Produtos/NCMs sem Crédito</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.produtos_sem_credito_icms.map((item, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
                    </span>
                    <span className="text-[#666]">Estabelecimento:</span>
                    <span className="text-white">
                      {TIPOS_ESTABELECIMENTO_BENEFICIO.find(e => e.value === formData.tipo_estabelecimento_beneficio)?.label || '-'}
                    </span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8A951]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="wizard-empresa">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#C8A951] text-black'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-[#2A2A2A] text-[#666]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-[#C8A951]' : 'text-[#666]'}`}>
                    {step.title}
                  </span>
                </div>
                
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-[#2A2A2A]'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">
            {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-[#666]">{STEPS[currentStep - 1].description}</p>
        </div>
        
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onCancel || (() => navigate('/empresas'))}
          className="px-4 py-2 text-[#A1A1AA] hover:text-white transition-colors"
        >
          Cancelar
        </button>
        
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          
          {currentStep < STEPS.length ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#B8994A] transition-colors flex items-center gap-2 font-medium"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={saveCompany}
              disabled={saving}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Finalizar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardEmpresa;
