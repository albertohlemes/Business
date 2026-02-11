import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, ChevronRight, ChevronLeft, Check, 
  FileText, Tag, Gift, Upload, Sparkles, 
  Store, Factory, Wrench, Layers, Save,
  AlertCircle, CheckCircle2, Info
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

const WizardEmpresa = ({ companyId, onComplete, onCancel }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    // Dados básicos
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    endereco: '',
    cidade: '',
    uf: '',
    
    // Atividade
    tipo_atividade: '',
    
    // Tributação
    regime_tributario: '',
    apura_icms: true,
    apura_pis_cofins: true,
    apura_iss: false,
    
    // Classificação - palavras-chave
    produtos_comercializados: [],
    insumos_producao: [],
    produtos_despesa: [],
    produtos_aplicacao_servico: [],
    
    // Benefícios
    beneficio_fiscal_icms: false,
    percentual_reducao_icms: 0,
    tipo_beneficio: '',
  });

  // Estado para palavras-chave temporárias
  const [newKeyword, setNewKeyword] = useState({
    comercializados: '',
    insumos: '',
    despesa: '',
    servico: '',
  });

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
        razao_social: company.razao_social || '',
        nome_fantasia: company.nome_fantasia || '',
        cnpj: company.cnpj || '',
        inscricao_estadual: company.inscricao_estadual || '',
        endereco: company.endereco || '',
        cidade: company.cidade || '',
        uf: company.uf || '',
        tipo_atividade: company.tipo_atividade || '',
        regime_tributario: company.regime_tributario || '',
        apura_icms: company.apura_icms !== false,
        apura_pis_cofins: company.apura_pis_cofins !== false,
        apura_iss: company.apura_iss || false,
        produtos_comercializados: company.produtos_comercializados || [],
        insumos_producao: company.insumos_producao || [],
        produtos_despesa: company.produtos_despesa || [],
        produtos_aplicacao_servico: company.produtos_aplicacao_servico || [],
        beneficio_fiscal_icms: company.beneficio_fiscal_icms || false,
        percentual_reducao_icms: company.percentual_reducao_icms || 0,
        tipo_beneficio: company.tipo_beneficio || '',
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
    };
    
    const field = fieldMap[category];
    if (!formData[field].includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], keyword]
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
    };
    
    const field = fieldMap[category];
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(k => k !== keyword)
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
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
            <div className="grid grid-cols-2 gap-4">
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
              
              <div>
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
              
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              
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
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
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
          </div>
        );
        
      case 3:
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
                      onClick={() => handleChange('regime_tributario', regime.value)}
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
            
            <div className="border-t border-[#2A2A2A] pt-4">
              <p className="text-[#A1A1AA] mb-3">Impostos que a empresa apura:</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { field: 'apura_icms', label: 'ICMS' },
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
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
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
            
            {/* Revenda */}
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
            
            {/* Serviços - só mostra para empresas de serviço/mista */}
            {(formData.tipo_atividade === 'servicos' || formData.tipo_atividade === 'mista') && (
              <div className="bg-[#141414] rounded-lg p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-400" />
                  Materiais para Aplicação em Serviços
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword.servico}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, servico: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword('servico')}
                    className="flex-1 px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
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
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-[#141414] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-medium">Benefício Fiscal de ICMS</h3>
                  <p className="text-sm text-[#666]">Empresa possui redução de base de cálculo?</p>
                </div>
                <button
                  onClick={() => handleChange('beneficio_fiscal_icms', !formData.beneficio_fiscal_icms)}
                  className={`w-14 h-7 rounded-full transition-colors relative ${
                    formData.beneficio_fiscal_icms ? 'bg-[#C8A951]' : 'bg-[#2A2A2A]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      formData.beneficio_fiscal_icms ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {formData.beneficio_fiscal_icms && (
                <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                      Percentual de Redução (%)
                    </label>
                    <input
                      type="number"
                      value={formData.percentual_reducao_icms}
                      onChange={(e) => handleChange('percentual_reducao_icms', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                      placeholder="Ex: 20"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-1">
                      Tipo de Benefício
                    </label>
                    <select
                      value={formData.tipo_beneficio}
                      onChange={(e) => handleChange('tipo_beneficio', e.target.value)}
                      className="w-full px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="reducao_base">Redução de Base de Cálculo</option>
                      <option value="credito_presumido">Crédito Presumido</option>
                      <option value="isencao">Isenção</option>
                      <option value="diferimento">Diferimento</option>
                    </select>
                  </div>
                </div>
              )}
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
                <h3 className="text-[#C8A951] font-medium mb-3">Palavras-chave</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[#666]">Revenda: </span>
                    <span className="text-green-400">{formData.produtos_comercializados.join(', ') || 'Nenhuma'}</span>
                  </div>
                  <div>
                    <span className="text-[#666]">Insumos: </span>
                    <span className="text-blue-400">{formData.insumos_producao.join(', ') || 'Nenhuma'}</span>
                  </div>
                  <div>
                    <span className="text-[#666]">Despesas: </span>
                    <span className="text-orange-400">{formData.produtos_despesa.join(', ') || 'Nenhuma'}</span>
                  </div>
                </div>
              </div>
              
              {formData.beneficio_fiscal_icms && (
                <div className="bg-[#141414] rounded-lg p-4">
                  <h3 className="text-[#C8A951] font-medium mb-3">Benefício Fiscal</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-[#666]">Redução:</span>
                    <span className="text-white">{formData.percentual_reducao_icms}%</span>
                    <span className="text-[#666]">Tipo:</span>
                    <span className="text-white capitalize">{formData.tipo_beneficio?.replace('_', ' ') || '-'}</span>
                  </div>
                </div>
              )}
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
