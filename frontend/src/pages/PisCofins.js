import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Download, RefreshCw, BarChart3, Search, 
  Building2, Calculator, Scale, Package, ArrowUp, ArrowDown,
  ArrowUpDown, Layers
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mapeamento de NCMs para descrições curtas
const getNcmDescricao = (ncm) => {
  if (!ncm) return '-';
  
  // Pegar os primeiros 2 ou 4 dígitos para categorização
  const ncm2 = ncm.substring(0, 2);
  const ncm4 = ncm.substring(0, 4);
  
  // Mapeamento por capítulo/posição NCM
  const ncmMap = {
    // Capítulo 01 - Animais vivos
    '01': 'Animal',
    // Capítulo 02 - Carnes
    '02': 'Carne',
    '0201': 'Bovina',
    '0202': 'Bovina',
    '0203': 'Suína',
    '0204': 'Ovina',
    '0205': 'Equina',
    '0206': 'Miúdos',
    '0207': 'Frango',
    '0208': 'Caça',
    '0209': 'Toucinho',
    '0210': 'Defumado',
    // Capítulo 03 - Peixes
    '03': 'Peixe',
    // Capítulo 04 - Laticínios e ovos
    '04': 'Laticínio',
    '0401': 'Leite',
    '0402': 'Leite',
    '0403': 'Iogurte',
    '0404': 'Soro',
    '0405': 'Manteiga',
    '0406': 'Queijo',
    '0407': 'Ovo',
    '0408': 'Ovo',
    '0409': 'Mel',
    // Capítulo 05 - Produtos de origem animal
    '05': 'Animal',
    // Capítulo 06-14 - Vegetais
    '06': 'Planta',
    '07': 'Legume',
    '08': 'Fruta',
    '09': 'Café/Chá',
    '0901': 'Café',
    '0902': 'Chá',
    '0903': 'Mate',
    '0904': 'Pimenta',
    '0905': 'Baunilha',
    '0906': 'Canela',
    '0907': 'Cravo',
    '0908': 'Noz-moscada',
    '0909': 'Erva',
    '0910': 'Gengibre',
    '10': 'Cereal',
    '1001': 'Trigo',
    '1002': 'Centeio',
    '1003': 'Cevada',
    '1004': 'Aveia',
    '1005': 'Milho',
    '1006': 'Arroz',
    '1007': 'Sorgo',
    '1008': 'Cereal',
    '11': 'Farinha',
    '12': 'Semente',
    '1201': 'Soja',
    '1202': 'Amendoim',
    '13': 'Goma',
    '14': 'Vegetal',
    // Capítulo 15 - Gorduras e óleos
    '15': 'Óleo',
    '1507': 'Soja',
    '1508': 'Amendoim',
    '1509': 'Oliva',
    '1510': 'Oliva',
    '1511': 'Palma',
    '1512': 'Girassol',
    '1513': 'Coco',
    '1514': 'Canola',
    '1515': 'Vegetal',
    '1516': 'Vegetal',
    '1517': 'Margarina',
    // Capítulo 16 - Preparações de carne/peixe
    '16': 'Embutido',
    '1601': 'Linguiça',
    '1602': 'Conserva',
    '1603': 'Extrato',
    '1604': 'Peixe',
    '1605': 'Frutos-mar',
    // Capítulo 17 - Açúcares
    '17': 'Açúcar',
    '1701': 'Açúcar',
    '1702': 'Glicose',
    '1703': 'Melaço',
    '1704': 'Doce',
    // Capítulo 18 - Cacau e chocolate
    '18': 'Chocolate',
    '1801': 'Cacau',
    '1802': 'Casca',
    '1803': 'Massa',
    '1804': 'Manteiga',
    '1805': 'Cacau',
    '1806': 'Chocolate',
    // Capítulo 19 - Preparações de cereais
    '19': 'Massas',
    '1901': 'Malte',
    '1902': 'Macarrão',
    '1903': 'Tapioca',
    '1904': 'Cereal',
    '1905': 'Pão/Biscoito',
    // Capítulo 20 - Preparações de vegetais
    '20': 'Conserva',
    '2001': 'Pickles',
    '2002': 'Tomate',
    '2003': 'Cogumelo',
    '2004': 'Legume',
    '2005': 'Legume',
    '2006': 'Fruta',
    '2007': 'Geleia',
    '2008': 'Fruta',
    '2009': 'Suco',
    // Capítulo 21 - Preparações alimentícias diversas
    '21': 'Alimento',
    '2101': 'Café/Chá',
    '2102': 'Fermento',
    '2103': 'Molho',
    '2104': 'Sopa',
    '2105': 'Sorvete',
    '2106': 'Alimento',
    // Capítulo 22 - Bebidas
    '22': 'Bebida',
    '2201': 'Água',
    '2202': 'Refrigerante',
    '2203': 'Cerveja',
    '2204': 'Vinho',
    '2205': 'Vermute',
    '2206': 'Sidra',
    '2207': 'Álcool',
    '2208': 'Destilado',
    '2209': 'Vinagre',
    // Capítulo 23 - Resíduos e rações
    '23': 'Ração',
    // Capítulo 24 - Tabaco
    '24': 'Tabaco',
    // Capítulo 25-27 - Minerais
    '25': 'Mineral',
    '26': 'Minério',
    '27': 'Combustível',
    '2701': 'Carvão',
    '2709': 'Petróleo',
    '2710': 'Óleo',
    '2711': 'Gás',
    // Capítulos 28-38 - Produtos químicos
    '28': 'Químico',
    '29': 'Químico',
    '30': 'Medicamento',
    '31': 'Adubo',
    '32': 'Tinta',
    '33': 'Perfumaria',
    '3301': 'Essência',
    '3302': 'Aroma',
    '3303': 'Perfume',
    '3304': 'Cosmético',
    '3305': 'Cabelo',
    '3306': 'Higiene',
    '3307': 'Desodorante',
    '34': 'Sabão',
    '35': 'Proteína',
    '36': 'Explosivo',
    '37': 'Fotográfico',
    '38': 'Químico',
    // Capítulos 39-40 - Plásticos e borracha
    '39': 'Plástico',
    '40': 'Borracha',
    // Capítulos 41-43 - Couro e peles
    '41': 'Couro',
    '42': 'Couro',
    '43': 'Pele',
    // Capítulos 44-49 - Madeira e papel
    '44': 'Madeira',
    '45': 'Cortiça',
    '46': 'Palha',
    '47': 'Pasta',
    '48': 'Papel',
    '49': 'Impresso',
    // Capítulos 50-63 - Têxteis
    '50': 'Seda',
    '51': 'Lã',
    '52': 'Algodão',
    '53': 'Fibra',
    '54': 'Sintético',
    '55': 'Sintético',
    '56': 'Feltro',
    '57': 'Tapete',
    '58': 'Tecido',
    '59': 'Tecido',
    '60': 'Malha',
    '61': 'Vestuário',
    '62': 'Vestuário',
    '63': 'Têxtil',
    // Capítulos 64-67 - Calçados e acessórios
    '64': 'Calçado',
    '65': 'Chapéu',
    '66': 'Guarda-chuva',
    '67': 'Pena',
    // Capítulos 68-71 - Pedras e metais preciosos
    '68': 'Pedra',
    '69': 'Cerâmica',
    '70': 'Vidro',
    '71': 'Joia',
    // Capítulos 72-83 - Metais
    '72': 'Ferro',
    '73': 'Ferro',
    '74': 'Cobre',
    '75': 'Níquel',
    '76': 'Alumínio',
    '77': 'Reservado',
    '78': 'Chumbo',
    '79': 'Zinco',
    '80': 'Estanho',
    '81': 'Metal',
    '82': 'Ferramenta',
    '83': 'Metal',
    // Capítulos 84-85 - Máquinas e equipamentos
    '84': 'Máquina',
    '85': 'Eletrônico',
    '8501': 'Motor',
    '8502': 'Gerador',
    '8503': 'Peça',
    '8504': 'Transformador',
    '8506': 'Pilha',
    '8507': 'Bateria',
    '8508': 'Aspirador',
    '8509': 'Eletrodom.',
    '8510': 'Barbeador',
    '8516': 'Aquecedor',
    '8517': 'Telefone',
    '8518': 'Áudio',
    '8519': 'Áudio',
    '8521': 'Vídeo',
    '8523': 'Mídia',
    '8525': 'Câmera',
    '8527': 'Rádio',
    '8528': 'TV/Monitor',
    '8529': 'Peça',
    '8531': 'Alarme',
    '8536': 'Elétrico',
    '8537': 'Painel',
    '8539': 'Lâmpada',
    '8541': 'Semicondutor',
    '8542': 'Circuito',
    '8544': 'Cabo',
    // Capítulos 86-89 - Transporte
    '86': 'Ferroviário',
    '87': 'Veículo',
    '8701': 'Trator',
    '8702': 'Ônibus',
    '8703': 'Automóvel',
    '8704': 'Caminhão',
    '8705': 'Especial',
    '8706': 'Chassi',
    '8707': 'Carroceria',
    '8708': 'Autopeça',
    '8709': 'Rebocador',
    '8711': 'Moto',
    '8712': 'Bicicleta',
    '8713': 'Cadeira',
    '8714': 'Peça',
    '8716': 'Reboque',
    '88': 'Aeronave',
    '89': 'Embarcação',
    // Capítulos 90-92 - Instrumentos
    '90': 'Instrumento',
    '9001': 'Ótica',
    '9002': 'Lente',
    '9003': 'Armação',
    '9004': 'Óculos',
    '9018': 'Médico',
    '9019': 'Médico',
    '91': 'Relógio',
    '92': 'Instrumento',
    // Capítulos 93-97 - Diversos
    '93': 'Arma',
    '94': 'Móvel',
    '9401': 'Assento',
    '9402': 'Médico',
    '9403': 'Móvel',
    '9404': 'Colchão',
    '9405': 'Luminária',
    '9406': 'Construção',
    '95': 'Brinquedo',
    '96': 'Diversos',
    '97': 'Arte',
    '99': 'Especial'
  };
  
  // Tentar encontrar correspondência mais específica primeiro (4 dígitos), depois genérica (2 dígitos)
  return ncmMap[ncm4] || ncmMap[ncm2] || 'Produto';
};

const PisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [apuracao, setApuracao] = useState(null);
  const [divergencias, setDivergencias] = useState(null);
  const [detalhamento, setDetalhamento] = useState(null);
  const [activeTab, setActiveTab] = useState('apuracao'); // apuracao, detalhamento, comparativo, divergencias
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [agrupamentoDivergencias, setAgrupamentoDivergencias] = useState('notas'); // notas, ncms, produtos
  const [loadingDivergencias, setLoadingDivergencias] = useState(false);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);
  
  // Estados para ordenação
  const [sortField, setSortField] = useState('valor_base');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar apuração e detalhamento em paralelo
      const [apuracaoRes, detalhamentoRes] = await Promise.all([
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/pis-cofins/detalhamento/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers })
      ]);
      
      setApuracao(apuracaoRes.data);
      setDetalhamento(detalhamentoRes.data);
      
      // Buscar divergências com agrupamento padrão
      fetchDivergencias('notas');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchDivergencias = async (agrupamento) => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoadingDivergencias(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/pis-cofins/divergencias/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&agrupamento=${agrupamento}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDivergencias(response.data);
      setAgrupamentoDivergencias(agrupamento);
    } catch (err) {
      console.error('Erro ao carregar divergências:', err);
    } finally {
      setLoadingDivergencias(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia, fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Resumo
  const ResumoCard = ({ titulo, valor, subtitulo, icon: Icon, corIcone = 'bg-[#C8A951]', corValor = 'text-white' }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[#A1A1AA] text-sm">{titulo}</p>
          <p className={`text-xl font-bold ${corValor}`}>{formatCurrency(valor)}</p>
          {subtitulo && <p className="text-xs text-[#666]">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // Seção colapsável com detalhes
  const SecaoColapsavel = ({ titulo, subtitulo, children, sectionKey, badgeValue }) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">{titulo}</span>
            {badgeValue && (
              <span className="bg-[#C8A951]/20 text-[#C8A951] text-xs px-2 py-0.5 rounded-full">
                {badgeValue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#A1A1AA] text-sm">{subtitulo}</span>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-[#A1A1AA]" /> : <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />}
          </div>
        </button>
        {isExpanded && (
          <div className="border-t border-[#2A2A2A] p-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Tab de Apuração
  const TabApuracao = () => {
    if (!apuracao) return null;
    
    const regime = apuracao.empresa?.regime_tributario || 'LUCRO_REAL';
    const dadosRegime = regime.toUpperCase().includes('REAL') ? apuracao.lucro_real : apuracao.lucro_presumido;
    const tipoAtividade = selectedCompany?.tipo_atividade || 'comercio';
    const temServicos = tipoAtividade === 'servicos' || tipoAtividade === 'mista';
    
    // Determinar se é credor ou devedor
    const saldoPIS = dadosRegime.saldo.pis;
    const saldoCOFINS = dadosRegime.saldo.cofins;
    const saldoTotal = dadosRegime.saldo.total;
    
    const isPISCredor = saldoPIS < 0;
    const isCOFINSCredor = saldoCOFINS < 0;
    const isTotalCredor = saldoTotal < 0;
    
    return (
      <div className="space-y-6">
        {/* Cards de Resumo - PIS */}
        <div className="mb-2">
          <h3 className="text-sm font-medium text-[#C8A951] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            PIS (1,65%)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResumoCard
              titulo="Créditos PIS"
              valor={dadosRegime.creditos.pis}
              icon={TrendingUp}
              corIcone="bg-green-600"
              corValor="text-green-400"
            />
            <ResumoCard
              titulo="Débitos PIS"
              valor={dadosRegime.debitos_total.pis}
              icon={TrendingDown}
              corIcone="bg-red-600"
              corValor="text-red-400"
            />
            <ResumoCard
              titulo={isPISCredor ? "PIS a Recuperar" : "PIS a Pagar"}
              valor={Math.abs(saldoPIS)}
              subtitulo={isPISCredor ? 'Crédito acumulado' : 'Imposto devido'}
              icon={isPISCredor ? TrendingUp : DollarSign}
              corIcone={isPISCredor ? "bg-blue-600" : "bg-amber-600"}
              corValor={isPISCredor ? "text-blue-400" : "text-amber-400"}
            />
          </div>
        </div>

        {/* Cards de Resumo - COFINS */}
        <div className="mb-2">
          <h3 className="text-sm font-medium text-[#C8A951] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            COFINS (7,6%)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResumoCard
              titulo="Créditos COFINS"
              valor={dadosRegime.creditos.cofins}
              icon={TrendingUp}
              corIcone="bg-green-600"
              corValor="text-green-400"
            />
            <ResumoCard
              titulo="Débitos COFINS"
              valor={dadosRegime.debitos_total.cofins}
              icon={TrendingDown}
              corIcone="bg-red-600"
              corValor="text-red-400"
            />
            <ResumoCard
              titulo={isCOFINSCredor ? "COFINS a Recuperar" : "COFINS a Pagar"}
              valor={Math.abs(saldoCOFINS)}
              subtitulo={isCOFINSCredor ? 'Crédito acumulado' : 'Imposto devido'}
              icon={isCOFINSCredor ? TrendingUp : DollarSign}
              corIcone={isCOFINSCredor ? "bg-blue-600" : "bg-amber-600"}
              corValor={isCOFINSCredor ? "text-blue-400" : "text-amber-400"}
            />
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 border border-[#C8A951]/30 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[#A1A1AA] text-sm">Total Créditos</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(dadosRegime.creditos.total)}</p>
            </div>
            <div className="text-center">
              <p className="text-[#A1A1AA] text-sm">Total Débitos</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(dadosRegime.debitos_total.total)}</p>
            </div>
            <div className="text-center">
              <p className="text-[#A1A1AA] text-sm">{isTotalCredor ? 'Total a Recuperar' : 'Total a Pagar'}</p>
              <p className={`text-2xl font-bold ${isTotalCredor ? 'text-blue-400' : 'text-[#C8A951]'}`}>
                {formatCurrency(Math.abs(saldoTotal))}
              </p>
            </div>
          </div>
        </div>

        {/* Detalhamento de Créditos */}
        <SecaoColapsavel
          titulo="Detalhamento de Créditos (Entradas)"
          subtitulo={formatCurrency(dadosRegime.creditos.total)}
          sectionKey="creditos"
        >
          <div className="space-y-4">
            {/* Resumo por CST - Créditos */}
            {apuracao.por_cfop_cst && apuracao.por_cfop_cst.filter(i => i.tipo === 'ENTRADA').length > 0 && (
              <div className="bg-[#0C0C0C] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-green-400" />
                  Resumo por CST (Créditos)
                </h4>
                {(() => {
                  const entradas = apuracao.por_cfop_cst.filter(i => i.tipo === 'ENTRADA');
                  const porCST = entradas.reduce((acc, item) => {
                    const cst = item.cst || 'N/A';
                    if (!acc[cst]) {
                      acc[cst] = { qtd: 0, valor_base: 0, valor_pis: 0, valor_cofins: 0 };
                    }
                    acc[cst].qtd += item.qtd || 0;
                    acc[cst].valor_base += item.valor_base || 0;
                    acc[cst].valor_pis += item.valor_pis || 0;
                    acc[cst].valor_cofins += item.valor_cofins || 0;
                    return acc;
                  }, {});
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-2 px-3 text-[#A1A1AA]">CST</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">Qtd Docs</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">Base de Cálculo</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">PIS</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">COFINS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(porCST).sort((a, b) => b[1].valor_base - a[1].valor_base).map(([cst, dados]) => (
                            <tr key={cst} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                              <td className="py-2 px-3">
                                <span className="font-mono text-[#C8A951]">{cst}</span>
                              </td>
                              <td className="py-2 px-3 text-right text-[#A1A1AA]">{dados.qtd}</td>
                              <td className="py-2 px-3 text-right text-white">{formatCurrency(dados.valor_base)}</td>
                              <td className="py-2 px-3 text-right text-green-400">{formatCurrency(dados.valor_pis)}</td>
                              <td className="py-2 px-3 text-right text-green-400">{formatCurrency(dados.valor_cofins)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Totais PIS e COFINS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0C0C0C] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#C8A951]" />
                  PIS (Crédito)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Base de Cálculo</span>
                    <span className="text-white">{formatCurrency(dadosRegime.creditos.pis / 0.0165)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Alíquota</span>
                    <span className="text-white">1,65%</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-2">
                    <span className="text-[#A1A1AA]">Crédito PIS</span>
                    <span className="text-green-400">{formatCurrency(dadosRegime.creditos.pis)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#C8A951]" />
                  COFINS (Crédito)
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Base de Cálculo</span>
                    <span className="text-white">{formatCurrency(dadosRegime.creditos.cofins / 0.076)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Alíquota</span>
                    <span className="text-white">7,60%</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-2">
                    <span className="text-[#A1A1AA]">Crédito COFINS</span>
                    <span className="text-green-400">{formatCurrency(dadosRegime.creditos.cofins)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SecaoColapsavel>

        {/* Detalhamento de Débitos */}
        <SecaoColapsavel
          titulo="Detalhamento de Débitos (Saídas)"
          subtitulo={formatCurrency(dadosRegime.debitos_total.total)}
          sectionKey="debitos"
        >
          <div className="space-y-4">
            {/* Resumo por CST - Débitos */}
            {apuracao.por_cfop_cst && apuracao.por_cfop_cst.filter(i => i.tipo === 'SAIDA' || i.tipo === 'SAÍDA').length > 0 && (
              <div className="bg-[#0C0C0C] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-400" />
                  Resumo por CST (Débitos)
                </h4>
                {(() => {
                  const saidas = apuracao.por_cfop_cst.filter(i => i.tipo === 'SAIDA' || i.tipo === 'SAÍDA');
                  const porCST = saidas.reduce((acc, item) => {
                    const cst = item.cst || 'N/A';
                    if (!acc[cst]) {
                      acc[cst] = { qtd: 0, valor_base: 0, valor_pis: 0, valor_cofins: 0 };
                    }
                    acc[cst].qtd += item.qtd || 0;
                    acc[cst].valor_base += item.valor_base || 0;
                    acc[cst].valor_pis += item.valor_pis || 0;
                    acc[cst].valor_cofins += item.valor_cofins || 0;
                    return acc;
                  }, {});
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-2 px-3 text-[#A1A1AA]">CST</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">Qtd Docs</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">Base de Cálculo</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">PIS</th>
                            <th className="text-right py-2 px-3 text-[#A1A1AA]">COFINS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(porCST).sort((a, b) => b[1].valor_base - a[1].valor_base).map(([cst, dados]) => (
                            <tr key={cst} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                              <td className="py-2 px-3">
                                <span className="font-mono text-[#C8A951]">{cst}</span>
                              </td>
                              <td className="py-2 px-3 text-right text-[#A1A1AA]">{dados.qtd}</td>
                              <td className="py-2 px-3 text-right text-white">{formatCurrency(dados.valor_base)}</td>
                              <td className="py-2 px-3 text-right text-red-400">{formatCurrency(dados.valor_pis)}</td>
                              <td className="py-2 px-3 text-right text-red-400">{formatCurrency(dados.valor_cofins)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Débitos de Comércio */}
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                Débitos de Comércio (NF-e)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Base de Cálculo</span>
                    <span className="text-white">{formatCurrency(dadosRegime.debitos_comercio.pis / 0.0165)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">PIS (1,65%)</span>
                    <span className="text-red-400">{formatCurrency(dadosRegime.debitos_comercio.pis)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Base de Cálculo</span>
                    <span className="text-white">{formatCurrency(dadosRegime.debitos_comercio.cofins / 0.076)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">COFINS (7,60%)</span>
                    <span className="text-red-400">{formatCurrency(dadosRegime.debitos_comercio.cofins)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-3">
                <span className="text-white">Total Comércio</span>
                <span className="text-red-400">{formatCurrency(dadosRegime.debitos_comercio.total)}</span>
              </div>
            </div>
            
            {/* Débitos de Serviços - Apenas para empresas de serviços ou mistas */}
            {temServicos && (
              <div className="bg-[#0C0C0C] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Débitos de Serviços (NFS-e)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">Base de Cálculo</span>
                      <span className="text-white">{formatCurrency((dadosRegime.debitos_servicos?.pis || 0) / 0.0165)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">PIS (1,65%)</span>
                      <span className="text-red-400">{formatCurrency(dadosRegime.debitos_servicos?.pis || 0)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">Base de Cálculo</span>
                      <span className="text-white">{formatCurrency((dadosRegime.debitos_servicos?.cofins || 0) / 0.076)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">COFINS (7,60%)</span>
                      <span className="text-red-400">{formatCurrency(dadosRegime.debitos_servicos?.cofins || 0)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-3">
                  <span className="text-white">Total Serviços</span>
                  <span className="text-red-400">{formatCurrency(dadosRegime.debitos_servicos?.total || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </SecaoColapsavel>

        {/* Agrupamento por CFOP + CST */}
        {apuracao.por_cfop_cst && apuracao.por_cfop_cst.length > 0 && (
          <SecaoColapsavel
            titulo="Detalhamento por CFOP + CST"
            subtitulo={`${apuracao.por_cfop_cst.length} combinação(ões)`}
            sectionKey="cfop_cst"
          >
            {(() => {
              // Separar entradas e saídas
              const entradas = apuracao.por_cfop_cst.filter(item => item.tipo === 'ENTRADA');
              const saidas = apuracao.por_cfop_cst.filter(item => item.tipo === 'SAIDA' || item.tipo === 'SAÍDA');
              
              // Calcular subtotais de entradas
              const subtotalEntradas = entradas.reduce((acc, item) => ({
                qtd: acc.qtd + (item.qtd || 0),
                valor_base: acc.valor_base + (item.valor_base || 0),
                valor_pis: acc.valor_pis + (item.valor_pis || 0),
                valor_cofins: acc.valor_cofins + (item.valor_cofins || 0)
              }), { qtd: 0, valor_base: 0, valor_pis: 0, valor_cofins: 0 });
              
              // Calcular subtotais de saídas
              const subtotalSaidas = saidas.reduce((acc, item) => ({
                qtd: acc.qtd + (item.qtd || 0),
                valor_base: acc.valor_base + (item.valor_base || 0),
                valor_pis: acc.valor_pis + (item.valor_pis || 0),
                valor_cofins: acc.valor_cofins + (item.valor_cofins || 0)
              }), { qtd: 0, valor_base: 0, valor_pis: 0, valor_cofins: 0 });

              const TabelaCFOP = ({ dados, tipo, subtotal }) => (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-2 px-3 text-[#A1A1AA]">CFOP</th>
                        <th className="text-left py-2 px-3 text-[#A1A1AA]">CST</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA]">Qtd</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA]">Valor Base</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA]">PIS</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA]">COFINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                          <td className="py-2 px-3">
                            <span className="font-mono text-white">{item.cfop}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[#C8A951]">{item.cst}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-[#A1A1AA]">{item.qtd}</td>
                          <td className="py-2 px-3 text-right text-white">{formatCurrency(item.valor_base)}</td>
                          <td className={`py-2 px-3 text-right ${tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(item.valor_pis)}
                          </td>
                          <td className={`py-2 px-3 text-right ${tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(item.valor_cofins)}
                          </td>
                        </tr>
                      ))}
                      {/* Linha de Subtotal */}
                      <tr className={`${tipo === 'ENTRADA' ? 'bg-green-600/10' : 'bg-red-600/10'} font-semibold`}>
                        <td colSpan="2" className="py-3 px-3 text-white">
                          SUBTOTAL {tipo}
                        </td>
                        <td className="py-3 px-3 text-right text-white">{subtotal.qtd}</td>
                        <td className="py-3 px-3 text-right text-white">{formatCurrency(subtotal.valor_base)}</td>
                        <td className={`py-3 px-3 text-right font-bold ${tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(subtotal.valor_pis)}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(subtotal.valor_cofins)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );

              return (
                <div className="space-y-6">
                  {/* ENTRADAS (Créditos) */}
                  {entradas.length > 0 && (
                    <div>
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-green-400" />
                        ENTRADAS (Créditos)
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">
                          {entradas.length} CFOP(s)
                        </span>
                      </h4>
                      <TabelaCFOP dados={entradas} tipo="ENTRADA" subtotal={subtotalEntradas} />
                    </div>
                  )}
                  
                  {/* SAÍDAS (Débitos) */}
                  {saidas.length > 0 && (
                    <div>
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <ArrowUp className="w-4 h-4 text-red-400" />
                        SAÍDAS (Débitos)
                        <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">
                          {saidas.length} CFOP(s)
                        </span>
                      </h4>
                      <TabelaCFOP dados={saidas} tipo="SAIDA" subtotal={subtotalSaidas} />
                    </div>
                  )}
                </div>
              );
            })()}
          </SecaoColapsavel>
        )}

        {/* Top 10 Rankings */}
        {apuracao.top_10 && (
          <>
            <h3 className="text-white font-bold mt-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C8A951]" />
              Rankings - Maiores Geradores de PIS/COFINS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top 10 Produtos Crédito */}
              <SecaoColapsavel
                titulo="Top 10 Produtos - Crédito"
                subtitulo={`${apuracao.top_10.produtos_credito?.length || 0} produto(s)`}
                sectionKey="top_prod_cred"
                badgeValue={apuracao.top_10.produtos_credito?.length}
              >
                {apuracao.top_10.produtos_credito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.produtos_credito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm truncate">{item.descricao}</span>
                          </div>
                          <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-green-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 Produtos Débito */}
              <SecaoColapsavel
                titulo="Top 10 Produtos - Débito"
                subtitulo={`${apuracao.top_10.produtos_debito?.length || 0} produto(s)`}
                sectionKey="top_prod_deb"
                badgeValue={apuracao.top_10.produtos_debito?.length}
              >
                {apuracao.top_10.produtos_debito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.produtos_debito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm truncate">{item.descricao}</span>
                          </div>
                          <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-red-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 NCMs Crédito */}
              <SecaoColapsavel
                titulo="Top 10 NCMs - Crédito"
                subtitulo={`${apuracao.top_10.ncms_credito?.length || 0} NCM(s)`}
                sectionKey="top_ncm_cred"
                badgeValue={apuracao.top_10.ncms_credito?.length}
              >
                {apuracao.top_10.ncms_credito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.ncms_credito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm font-mono">{item.ncm}</span>
                          </div>
                          {item.produtos && (
                            <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-green-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 NCMs Débito */}
              <SecaoColapsavel
                titulo="Top 10 NCMs - Débito"
                subtitulo={`${apuracao.top_10.ncms_debito?.length || 0} NCM(s)`}
                sectionKey="top_ncm_deb"
                badgeValue={apuracao.top_10.ncms_debito?.length}
              >
                {apuracao.top_10.ncms_debito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.ncms_debito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm font-mono">{item.ncm}</span>
                          </div>
                          {item.produtos && (
                            <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-red-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>
            </div>
          </>
        )}
      </div>
    );
  };

  // Tab Comparativo
  const TabComparativo = () => {
    if (!apuracao) return null;
    
    const { lucro_real, lucro_presumido, comparativo } = apuracao;
    const maisEconomico = comparativo?.regime_mais_economico || 'IGUAL';
    
    // Verificar tipo de atividade para mostrar/esconder serviços
    const tipoAtividade = selectedCompany?.tipo_atividade || 'comercio';
    const temServicos = tipoAtividade === 'servicos' || tipoAtividade === 'mista';
    
    return (
      <div className="space-y-6">
        {/* Banner de Indicação */}
        <div className={`rounded-xl p-6 border-2 ${
          maisEconomico === 'LUCRO_REAL' 
            ? 'bg-green-500/10 border-green-500/50' 
            : maisEconomico === 'LUCRO_PRESUMIDO'
            ? 'bg-blue-500/10 border-blue-500/50'
            : 'bg-[#141414] border-[#2A2A2A]'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              maisEconomico === 'LUCRO_REAL' 
                ? 'bg-green-500' 
                : maisEconomico === 'LUCRO_PRESUMIDO'
                ? 'bg-blue-500'
                : 'bg-[#C8A951]'
            }`}>
              {maisEconomico !== 'IGUAL' ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Scale className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">
                {maisEconomico === 'LUCRO_REAL' && 'Lucro Real é mais econômico'}
                {maisEconomico === 'LUCRO_PRESUMIDO' && 'Lucro Presumido é mais econômico'}
                {maisEconomico === 'IGUAL' && 'Ambos os regimes são equivalentes'}
              </h3>
              {comparativo?.economia > 0 && (
                <p className="text-[#A1A1AA]">
                  Economia de <span className="text-[#C8A951] font-bold">{formatCurrency(comparativo.economia)}</span> neste período
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Comparativo lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lucro Real */}
          <div className={`bg-[#141414] border-2 rounded-xl overflow-hidden ${
            maisEconomico === 'LUCRO_REAL' ? 'border-green-500' : 'border-[#2A2A2A]'
          }`}>
            <div className="bg-green-600/20 p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Lucro Real
                </h3>
                {maisEconomico === 'LUCRO_REAL' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">RECOMENDADO</span>
                )}
              </div>
              <p className="text-[#A1A1AA] text-sm mt-1">PIS 1,65% + COFINS 7,60% (não cumulativo)</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Créditos separados */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(-) Crédito PIS</span>
                <span className="text-green-400 font-semibold">{formatCurrency(lucro_real?.creditos?.pis || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(-) Crédito COFINS</span>
                <span className="text-green-400 font-semibold">{formatCurrency(lucro_real?.creditos?.cofins || 0)}</span>
              </div>
              <div className="flex justify-between items-center bg-[#1A1A1A]/50 rounded px-2 py-1 text-sm">
                <span className="text-[#666]">Total Créditos</span>
                <span className="text-green-400">{formatCurrency(lucro_real?.creditos?.total)}</span>
              </div>
              {/* Débitos PIS - Comércio */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito PIS Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_real?.debitos_comercio?.pis || 0)}</span>
              </div>
              {/* Débitos COFINS - Comércio */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito COFINS Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_real?.debitos_comercio?.cofins || 0)}</span>
              </div>
              {/* Subtotal Comércio */}
              <div className="flex justify-between items-center bg-[#1A1A1A]/50 rounded px-2 py-1 text-sm">
                <span className="text-[#666]">Subtotal Comércio</span>
                <span className="text-[#A1A1AA]">{formatCurrency(lucro_real?.debitos_comercio?.total || (lucro_real?.debitos_comercio?.pis + lucro_real?.debitos_comercio?.cofins) || 0)}</span>
              </div>
              {/* Débitos de Serviços - Apenas para empresas de serviços ou mistas */}
              {temServicos && (
                <>
                  {/* Débitos PIS - Serviços */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#A1A1AA]">(+) Débito PIS Serviços</span>
                    <span className="text-red-400 font-semibold">{formatCurrency(lucro_real?.debitos_servicos?.pis || 0)}</span>
                  </div>
                  {/* Débitos COFINS - Serviços */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#A1A1AA]">(+) Débito COFINS Serviços</span>
                    <span className="text-red-400 font-semibold">{formatCurrency(lucro_real?.debitos_servicos?.cofins || 0)}</span>
                  </div>
                  {/* Subtotal Serviços */}
                  <div className="flex justify-between items-center bg-[#1A1A1A]/50 rounded px-2 py-1 text-sm">
                    <span className="text-[#666]">Subtotal Serviços</span>
                    <span className="text-[#A1A1AA]">{formatCurrency(lucro_real?.debitos_servicos?.total || 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center bg-[#1A1A1A] rounded p-2">
                <span className="text-[#666]">(=) Débitos Total</span>
                <span className="text-white font-medium">{formatCurrency(lucro_real?.debitos_total?.total)}</span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">(=) Imposto a Pagar</span>
                  <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(lucro_real?.imposto_a_pagar?.total)}</span>
                </div>
                {lucro_real?.imposto_a_pagar?.total === 0 && lucro_real?.creditos?.total > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    * Crédito acumulado: empresa possui mais créditos que débitos
                  </p>
                )}
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#666]">PIS a Pagar</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_real?.imposto_a_pagar?.pis)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">COFINS a Pagar</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_real?.imposto_a_pagar?.cofins)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lucro Presumido */}
          <div className={`bg-[#141414] border-2 rounded-xl overflow-hidden ${
            maisEconomico === 'LUCRO_PRESUMIDO' ? 'border-blue-500' : 'border-[#2A2A2A]'
          }`}>
            <div className="bg-blue-600/20 p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Lucro Presumido
                </h3>
                {maisEconomico === 'LUCRO_PRESUMIDO' && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">RECOMENDADO</span>
                )}
              </div>
              <p className="text-[#A1A1AA] text-sm mt-1">PIS 0,65% + COFINS 3,00% (cumulativo)</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(-) Créditos</span>
                <span className="text-green-400 font-semibold">{formatCurrency(lucro_presumido.creditos.total)}</span>
              </div>
              {/* Débitos PIS - Comércio */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito PIS Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_comercio?.pis || 0)}</span>
              </div>
              {/* Débitos COFINS - Comércio */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito COFINS Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_comercio?.cofins || 0)}</span>
              </div>
              {/* Subtotal Comércio */}
              <div className="flex justify-between items-center bg-[#1A1A1A]/50 rounded px-2 py-1 text-sm">
                <span className="text-[#666]">Subtotal Comércio</span>
                <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.debitos_comercio.total)}</span>
              </div>
              {/* Débitos PIS - Serviços */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito PIS Serviços</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_servicos?.pis || 0)}</span>
              </div>
              {/* Débitos COFINS - Serviços */}
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débito COFINS Serviços</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_servicos?.cofins || 0)}</span>
              </div>
              {/* Subtotal Serviços */}
              <div className="flex justify-between items-center bg-[#1A1A1A]/50 rounded px-2 py-1 text-sm">
                <span className="text-[#666]">Subtotal Serviços</span>
                <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.debitos_servicos.total)}</span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">(=) Imposto a Pagar</span>
                  <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(lucro_presumido.imposto_a_pagar.total)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#666]">PIS a Pagar</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.imposto_a_pagar.pis)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">COFINS a Pagar</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.imposto_a_pagar.cofins)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Simples */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C8A951]" />
            Comparativo Visual
          </h3>
          <div className="space-y-4">
            {/* Barra Lucro Real */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#A1A1AA]">Lucro Real</span>
                <span className="text-white font-semibold">{formatCurrency(lucro_real.imposto_a_pagar.total)}</span>
              </div>
              <div className="bg-[#2A2A2A] rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (lucro_real.imposto_a_pagar.total / Math.max(lucro_real.imposto_a_pagar.total, lucro_presumido.imposto_a_pagar.total, 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
            {/* Barra Lucro Presumido */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#A1A1AA]">Lucro Presumido</span>
                <span className="text-white font-semibold">{formatCurrency(lucro_presumido.imposto_a_pagar.total)}</span>
              </div>
              <div className="bg-[#2A2A2A] rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (lucro_presumido.imposto_a_pagar.total / Math.max(lucro_real.imposto_a_pagar.total, lucro_presumido.imposto_a_pagar.total, 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente de Cabeçalho de Coluna Ordenável
  const SortableHeader = ({ field, label, className = "" }) => (
    <th 
      className={`px-3 py-2 text-left text-xs font-medium text-[#A1A1AA] uppercase cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  // Tab Detalhamento por NCM+CFOP+CST
  const TabDetalhamento = () => {
    if (!detalhamento) return null;
    
    const { entradas, saidas, saldo } = detalhamento;
    
    // Função para ordenar itens
    const sortItems = (items) => {
      return [...items].sort((a, b) => {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    };
    
    const entradasOrdenadas = sortItems(entradas?.itens || []);
    const saidasOrdenadas = sortItems(saidas?.itens || []);
    
    return (
      <div className="space-y-6">
        {/* Resumo do Saldo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ResumoCard titulo="Créditos PIS" valor={saldo?.credito_pis || 0} subtitulo="Entradas" icon={TrendingUp} corIcone="bg-green-600" corValor="text-green-400" />
          <ResumoCard titulo="Créditos COFINS" valor={saldo?.credito_cofins || 0} subtitulo="Entradas" icon={TrendingUp} corIcone="bg-green-600" corValor="text-green-400" />
          <ResumoCard titulo="Débitos PIS" valor={saldo?.debito_pis || 0} subtitulo="Saídas" icon={TrendingDown} corIcone="bg-red-600" corValor="text-red-400" />
          <ResumoCard titulo="Débitos COFINS" valor={saldo?.debito_cofins || 0} subtitulo="Saídas" icon={TrendingDown} corIcone="bg-red-600" corValor="text-red-400" />
        </div>

        {/* SEÇÃO ENTRADAS */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] bg-green-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">ENTRADAS - Créditos</h2>
                  <p className="text-sm text-[#A1A1AA]">{entradas?.subtotais?.quantidade || 0} itens | Base: {formatCurrency(entradas?.subtotais?.valor_base)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[#666] text-xs">Crédito Total</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency((entradas?.subtotais?.valor_pis || 0) + (entradas?.subtotais?.valor_cofins || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141414] sticky top-0 z-10">
                <tr>
                  <SortableHeader field="ncm" label="NCM" />
                  <th className="px-3 py-2 text-left text-[#666] text-xs font-medium">Descrição</th>
                  <SortableHeader field="cfop" label="CFOP" />
                  <SortableHeader field="cst" label="CST" />
                  <SortableHeader field="classificacao" label="Classificação" />
                  <SortableHeader field="quantidade" label="Qtd" className="text-right" />
                  <SortableHeader field="valor_base" label="Valor Base" className="text-right" />
                  <SortableHeader field="aliquota_pis" label="% PIS" className="text-right" />
                  <SortableHeader field="valor_pis" label="PIS" className="text-right" />
                  <SortableHeader field="aliquota_cofins" label="% COF" className="text-right" />
                  <SortableHeader field="valor_cofins" label="COFINS" className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {entradasOrdenadas.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-3 py-2 font-mono text-[#A1A1AA]">{item.ncm || '-'}</td>
                    <td className="px-3 py-2 text-[#C8A951] text-xs">{getNcmDescricao(item.ncm)}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">{item.cfop}</span></td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-[#2A2A2A] text-white rounded text-xs font-mono">{item.cst}</span></td>
                    <td className="px-3 py-2 text-[#A1A1AA] text-xs">{item.classificacao}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.quantidade}</td>
                    <td className="px-3 py-2 text-right text-white">{formatCurrency(item.valor_base)}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.aliquota_pis?.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right text-green-400">{formatCurrency(item.valor_pis)}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.aliquota_cofins?.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right text-green-400">{formatCurrency(item.valor_cofins)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#1A1A1A] border-t border-green-500/30">
                <tr className="font-semibold">
                  <td colSpan="5" className="px-3 py-3 text-green-400">SUBTOTAL ENTRADAS</td>
                  <td className="px-3 py-3 text-right text-white">{entradas?.subtotais?.quantidade}</td>
                  <td className="px-3 py-3 text-right text-white">{formatCurrency(entradas?.subtotais?.valor_base)}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-green-400">{formatCurrency(entradas?.subtotais?.valor_pis)}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-green-400">{formatCurrency(entradas?.subtotais?.valor_cofins)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* SEÇÃO SAÍDAS */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-red-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">SAÍDAS - Débitos</h2>
                  <p className="text-sm text-[#A1A1AA]">{saidas?.subtotais?.quantidade || 0} itens | Base: {formatCurrency(saidas?.subtotais?.valor_base)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[#666] text-xs">Débito Total</p>
                  <p className="text-xl font-bold text-red-400">
                    {formatCurrency((saidas?.subtotais?.valor_pis || 0) + (saidas?.subtotais?.valor_cofins || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#141414] sticky top-0 z-10">
                <tr>
                  <SortableHeader field="ncm" label="NCM" />
                  <th className="px-3 py-2 text-left text-[#666] text-xs font-medium">Descrição</th>
                  <SortableHeader field="cfop" label="CFOP" />
                  <SortableHeader field="cst" label="CST" />
                  <SortableHeader field="classificacao" label="Classificação" />
                  <SortableHeader field="quantidade" label="Qtd" className="text-right" />
                  <SortableHeader field="valor_base" label="Valor Base" className="text-right" />
                  <SortableHeader field="aliquota_pis" label="% PIS" className="text-right" />
                  <SortableHeader field="valor_pis" label="PIS" className="text-right" />
                  <SortableHeader field="aliquota_cofins" label="% COF" className="text-right" />
                  <SortableHeader field="valor_cofins" label="COFINS" className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {saidasOrdenadas.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-3 py-2 font-mono text-[#A1A1AA]">{item.ncm || '-'}</td>
                    <td className="px-3 py-2 text-[#C8A951] text-xs">{getNcmDescricao(item.ncm)}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{item.cfop}</span></td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-[#2A2A2A] text-white rounded text-xs font-mono">{item.cst}</span></td>
                    <td className="px-3 py-2 text-[#A1A1AA] text-xs">{item.classificacao}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.quantidade}</td>
                    <td className="px-3 py-2 text-right text-white">{formatCurrency(item.valor_base)}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.aliquota_pis?.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right text-red-400">{formatCurrency(item.valor_pis)}</td>
                    <td className="px-3 py-2 text-right text-[#A1A1AA]">{item.aliquota_cofins?.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right text-red-400">{formatCurrency(item.valor_cofins)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#1A1A1A] border-t border-red-500/30">
                <tr className="font-semibold">
                  <td colSpan="5" className="px-3 py-3 text-red-400">SUBTOTAL SAÍDAS</td>
                  <td className="px-3 py-3 text-right text-white">{saidas?.subtotais?.quantidade}</td>
                  <td className="px-3 py-3 text-right text-white">{formatCurrency(saidas?.subtotais?.valor_base)}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-red-400">{formatCurrency(saidas?.subtotais?.valor_pis)}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-red-400">{formatCurrency(saidas?.subtotais?.valor_cofins)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Card de Saldo Final */}
        <div className={`p-4 rounded-xl border ${saldo?.saldo_total > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className={`w-6 h-6 ${saldo?.saldo_total > 0 ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <h3 className="text-white font-semibold">Saldo a {saldo?.saldo_total > 0 ? 'Recolher' : 'Compensar'}</h3>
                <p className="text-[#A1A1AA] text-sm">Débitos - Créditos</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${saldo?.saldo_total > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(Math.abs(saldo?.saldo_total || 0))}
              </p>
              <p className="text-[#666] text-sm">
                PIS: {formatCurrency(saldo?.saldo_pis || 0)} | COFINS: {formatCurrency(saldo?.saldo_cofins || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab Divergências
  const TabDivergencias = () => {
    if (!divergencias) return null;
    
    const { totais, itens, agrupamento } = divergencias;
    
    // Filtrar itens pela busca
    const itensFiltrados = searchTerm
      ? itens.filter(item => {
          const termo = searchTerm.toLowerCase();
          if (agrupamento === 'notas') {
            return item.numero_nfe?.toLowerCase().includes(termo) ||
                   item.emitente?.toLowerCase().includes(termo) ||
                   item.destinatario?.toLowerCase().includes(termo);
          } else if (agrupamento === 'ncms') {
            return item.ncm?.includes(termo) ||
                   item.classificacao?.toLowerCase().includes(termo);
          } else {
            return item.produto?.toLowerCase().includes(termo) ||
                   item.ncm?.includes(termo);
          }
        })
      : itens || [];
    
    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <ResumoCard
            titulo="Documentos"
            valor={null}
            subtitulo={`${totais?.documentos_com_divergencia || 0} de ${totais?.total_documentos || 0}`}
            icon={FileText}
            corIcone="bg-blue-600"
          />
          <ResumoCard
            titulo="Produtos Divergentes"
            valor={null}
            subtitulo={`${totais?.produtos_divergentes || 0} produto(s)`}
            icon={Package}
            corIcone="bg-orange-600"
          />
          <ResumoCard
            titulo="Recolhido a Maior"
            valor={totais?.recolhido_a_maior || 0}
            subtitulo="Crédito a recuperar"
            icon={TrendingUp}
            corIcone="bg-green-600"
            corValor="text-green-400"
          />
          <ResumoCard
            titulo="Recolhido a Menor"
            valor={totais?.recolhido_a_menor || 0}
            subtitulo="Passivo tributário"
            icon={TrendingDown}
            corIcone="bg-red-600"
            corValor="text-red-400"
          />
          <ResumoCard
            titulo="Diferença Total"
            valor={Math.abs((totais?.diferenca_pis_total || 0) + (totais?.diferenca_cofins_total || 0))}
            subtitulo="PIS + COFINS"
            icon={Scale}
            corIcone="bg-[#C8A951]"
            corValor="text-[#C8A951]"
          />
        </div>

        {/* Seletor de Agrupamento */}
        <div className="flex flex-wrap items-center gap-4 bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <span className="text-[#A1A1AA] text-sm">Agrupar por:</span>
          <div className="flex gap-2">
            {[
              { key: 'notas', label: 'Notas Fiscais', icon: FileText },
              { key: 'ncms', label: 'NCMs', icon: BarChart3 },
              { key: 'produtos', label: 'Produtos', icon: Package }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => fetchDivergencias(key)}
                disabled={loadingDivergencias}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  agrupamentoDivergencias === key
                    ? 'bg-[#C8A951] text-black'
                    : 'bg-[#2A2A2A] text-white hover:bg-[#333]'
                } disabled:opacity-50`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {/* Barra de Busca */}
          <div className="flex-1 relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder={`Buscar ${agrupamento === 'notas' ? 'NF, emitente...' : agrupamento === 'ncms' ? 'NCM...' : 'produto, NCM...'}` }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-[#666] focus:border-[#C8A951] focus:outline-none"
            />
          </div>
        </div>

        {/* Loading */}
        {loadingDivergencias && (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Lista de Divergências */}
        {!loadingDivergencias && itensFiltrados.length === 0 ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg">Nenhuma divergência encontrada</h3>
            <p className="text-[#A1A1AA]">
              {searchTerm ? 'Nenhum item corresponde à busca.' : 'Todos os itens estão com a classificação correta de PIS/COFINS.'}
            </p>
          </div>
        ) : !loadingDivergencias && (
          <div className="space-y-3">
            {/* Agrupamento por NOTAS - Versão Compacta em Lista */}
            {agrupamento === 'notas' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0C0C0C] sticky top-0">
                      <tr className="text-[#666] text-left">
                        <th className="px-3 py-2 font-medium">NF</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Emitente/Dest.</th>
                        <th className="px-3 py-2 font-medium">Produto</th>
                        <th className="px-3 py-2 font-medium">NCM</th>
                        <th className="px-3 py-2 font-medium">CFOP</th>
                        <th className="px-3 py-2 font-medium">CST XML</th>
                        <th className="px-3 py-2 font-medium">CST Calc.</th>
                        <th className="px-3 py-2 font-medium">Alíq. PIS</th>
                        <th className="px-3 py-2 font-medium">Alíq. COFINS</th>
                        <th className="px-3 py-2 font-medium text-right">Impacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {itensFiltrados.flatMap((item, idx) => 
                        (item.produtos || []).map((prod, pIdx) => (
                          <tr key={`${idx}-${pIdx}`} className="hover:bg-[#1A1A1A]">
                            <td className="px-3 py-2 text-white font-medium">{item.numero_nfe}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${item.tipo_operacao === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {item.tipo_operacao?.substring(0,3).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#A1A1AA] max-w-[120px] truncate" title={item.emitente || item.destinatario}>
                              {(item.emitente || item.destinatario)?.substring(0,20)}
                            </td>
                            <td className="px-3 py-2 text-white max-w-[150px] truncate" title={prod.produto}>
                              {prod.produto?.substring(0,25)}
                            </td>
                            <td className="px-3 py-2 font-mono text-[#A1A1AA] text-xs">{prod.ncm}</td>
                            <td className="px-3 py-2 font-mono text-white">{prod.cfop}</td>
                            <td className="px-3 py-2">
                              {prod.divergencias?.find(d => d.campo === 'CST PIS') ? (
                                <span className="text-red-400 font-mono">{prod.divergencias.find(d => d.campo === 'CST PIS')?.xml || '-'}</span>
                              ) : (
                                <span className="text-[#666] font-mono">{prod.cst_xml || '-'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {prod.divergencias?.find(d => d.campo === 'CST PIS') ? (
                                <span className="text-green-400 font-mono">{prod.divergencias.find(d => d.campo === 'CST PIS')?.calculado || '-'}</span>
                              ) : (
                                <span className="text-[#666] font-mono">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.divergencias?.find(d => d.campo?.includes('Alíq') && d.campo?.includes('PIS')) ? (
                                <span>
                                  <span className="text-red-400">{prod.divergencias.find(d => d.campo?.includes('Alíq') && d.campo?.includes('PIS'))?.xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.divergencias.find(d => d.campo?.includes('Alíq') && d.campo?.includes('PIS'))?.calculado}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.divergencias?.find(d => d.campo?.includes('COFINS')) ? (
                                <span>
                                  <span className="text-red-400">{prod.divergencias.find(d => d.campo?.includes('COFINS'))?.xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.divergencias.find(d => d.campo?.includes('COFINS'))?.calculado}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${prod.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {prod.diferenca_total > 0 ? '+' : ''}{formatCurrency(prod.diferenca_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agrupamento por NCMs - Mesmo formato de Notas */}
            {agrupamento === 'ncms' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0C0C0C] sticky top-0">
                      <tr className="text-[#666] text-left">
                        <th className="px-3 py-2 font-medium">NF</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Emitente/Dest.</th>
                        <th className="px-3 py-2 font-medium">Produto</th>
                        <th className="px-3 py-2 font-medium">NCM</th>
                        <th className="px-3 py-2 font-medium">CFOP</th>
                        <th className="px-3 py-2 font-medium">CST XML</th>
                        <th className="px-3 py-2 font-medium">CST Calc.</th>
                        <th className="px-3 py-2 font-medium">Alíq. PIS</th>
                        <th className="px-3 py-2 font-medium">Alíq. COFINS</th>
                        <th className="px-3 py-2 font-medium text-right">Impacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {itensFiltrados.flatMap((item, idx) => 
                        (item.produtos || []).map((prod, pIdx) => (
                          <tr key={`${idx}-${pIdx}`} className="hover:bg-[#1A1A1A]">
                            <td className="px-3 py-2 text-white font-medium">{prod.numero_nfe}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${prod.tipo_operacao === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {prod.tipo_operacao?.substring(0,3).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#A1A1AA] max-w-[120px] truncate" title={prod.emitente || prod.destinatario}>
                              {(prod.emitente || prod.destinatario)?.substring(0,20)}
                            </td>
                            <td className="px-3 py-2 text-white max-w-[150px] truncate" title={prod.produto}>
                              {prod.produto?.substring(0,25)}
                            </td>
                            <td className="px-3 py-2 font-mono text-[#A1A1AA] text-xs">{prod.ncm}</td>
                            <td className="px-3 py-2 font-mono text-white">{prod.cfop}</td>
                            <td className="px-3 py-2">
                              {prod.cst_xml ? (
                                <span className="text-red-400 font-mono">{prod.cst_xml}</span>
                              ) : (
                                <span className="text-[#666] font-mono">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {prod.cst_calc ? (
                                <span className="text-green-400 font-mono">{prod.cst_calc}</span>
                              ) : (
                                <span className="text-[#666] font-mono">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.aliq_pis_xml !== null && prod.aliq_pis_xml !== undefined ? (
                                <span>
                                  <span className="text-red-400">{prod.aliq_pis_xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.aliq_pis_calc}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.aliq_cofins_xml !== null && prod.aliq_cofins_xml !== undefined ? (
                                <span>
                                  <span className="text-red-400">{prod.aliq_cofins_xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.aliq_cofins_calc}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${prod.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {prod.diferenca_total > 0 ? '+' : ''}{formatCurrency(prod.diferenca_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agrupamento por PRODUTOS - Mesmo formato de Notas */}
            {agrupamento === 'produtos' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0C0C0C] sticky top-0">
                      <tr className="text-[#666] text-left">
                        <th className="px-3 py-2 font-medium">NF</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Emitente/Dest.</th>
                        <th className="px-3 py-2 font-medium">Produto</th>
                        <th className="px-3 py-2 font-medium">NCM</th>
                        <th className="px-3 py-2 font-medium">CFOP</th>
                        <th className="px-3 py-2 font-medium">CST XML</th>
                        <th className="px-3 py-2 font-medium">CST Calc.</th>
                        <th className="px-3 py-2 font-medium">Alíq. PIS</th>
                        <th className="px-3 py-2 font-medium">Alíq. COFINS</th>
                        <th className="px-3 py-2 font-medium text-right">Impacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {itensFiltrados.flatMap((item, idx) => 
                        (item.produtos || []).map((prod, pIdx) => (
                          <tr key={`${idx}-${pIdx}`} className="hover:bg-[#1A1A1A]">
                            <td className="px-3 py-2 text-white font-medium">{prod.numero_nfe}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${prod.tipo_operacao === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {prod.tipo_operacao?.substring(0,3).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#A1A1AA] max-w-[120px] truncate" title={prod.emitente || prod.destinatario}>
                              {(prod.emitente || prod.destinatario)?.substring(0,20)}
                            </td>
                            <td className="px-3 py-2 text-white max-w-[150px] truncate" title={prod.produto}>
                              {prod.produto?.substring(0,25)}
                            </td>
                            <td className="px-3 py-2 font-mono text-[#A1A1AA] text-xs">{prod.ncm}</td>
                            <td className="px-3 py-2 font-mono text-white">{prod.cfop}</td>
                            <td className="px-3 py-2">
                              {prod.cst_xml ? (
                                <span className="text-red-400 font-mono">{prod.cst_xml}</span>
                              ) : (
                                <span className="text-[#666] font-mono">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {prod.cst_calc ? (
                                <span className="text-green-400 font-mono">{prod.cst_calc}</span>
                              ) : (
                                <span className="text-[#666] font-mono">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.aliq_pis_xml !== null && prod.aliq_pis_xml !== undefined ? (
                                <span>
                                  <span className="text-red-400">{prod.aliq_pis_xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.aliq_pis_calc}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {prod.aliq_cofins_xml !== null && prod.aliq_cofins_xml !== undefined ? (
                                <span>
                                  <span className="text-red-400">{prod.aliq_cofins_xml}%</span>
                                  <span className="text-[#666] mx-1">→</span>
                                  <span className="text-green-400">{prod.aliq_cofins_calc}%</span>
                                </span>
                              ) : (
                                <span className="text-[#666]">OK</span>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${prod.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {prod.diferenca_total > 0 ? '+' : ''}{formatCurrency(prod.diferenca_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render principal
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-[#C8A951]" />
              PIS e COFINS
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Apuração, comparativo de regimes e análise de divergências
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {selectedCompany && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  Regime: <span className="text-[#C8A951]">{selectedCompany.regime_tributario?.replace('_', ' ')?.toUpperCase() || 'NÃO DEFINIDO'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-3">
          <button
            onClick={() => setActiveTab('apuracao')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'apuracao'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-apuracao"
          >
            <Calculator className="w-4 h-4" />
            Apuração
          </button>
          <button
            onClick={() => setActiveTab('detalhamento')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'detalhamento'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-detalhamento"
          >
            <Layers className="w-4 h-4" />
            Detalhamento
          </button>
          <button
            onClick={() => setActiveTab('comparativo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'comparativo'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-comparativo"
          >
            <Scale className="w-4 h-4" />
            Comparativo
          </button>
          <button
            onClick={() => setActiveTab('divergencias')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'divergencias'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-divergencias"
          >
            <AlertTriangle className="w-4 h-4" />
            Divergências
            {divergencias?.totais?.produtos_divergentes > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {divergencias.totais.produtos_divergentes}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração de PIS/COFINS</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'apuracao' && <TabApuracao />}
            {activeTab === 'detalhamento' && <TabDetalhamento />}
            {activeTab === 'comparativo' && <TabComparativo />}
            {activeTab === 'divergencias' && <TabDivergencias />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PisCofins;
