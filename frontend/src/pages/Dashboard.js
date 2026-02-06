import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Calendar,
  TrendingUp,
  BarChart3,
  Briefcase,
  ChevronRight,
  Zap,
  LineChart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada } = useEmpresa();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/completo`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      try {
        const fallbackResponse = await axios.get(`${API_URL}/api/dashboard`);
        setStats(fallbackResponse.data);
      } catch (e) {
        console.error('Erro no fallback:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cores para gráficos
  const SEGMENT_COLORS = ['#C62828', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'];

  // Gerar dados de evolução mensal (meses do ano atual)
  const mesesAbreviados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();
  
  const evolucaoData = stats?.evolucao_mensal || mesesAbreviados.slice(0, mesAtual + 1).map((mes, index) => ({
    mes,
    empresas: 0,
    colaboradores: 0
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800 h-32 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 h-80 rounded-xl animate-pulse" />
          <div className="bg-slate-800 h-80 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Dados processados
  const totalEmpresas = stats?.total_clientes || 0;
  const totalColaboradores = stats?.total_colaboradores || 0;
  const mediaColaboradores = totalEmpresas > 0 ? (totalColaboradores / totalEmpresas).toFixed(1) : 0;
  const admissoesPendentes = stats?.admissoes_pendentes || 0;
  const proximosDissidios = stats?.proximos_dissidios || [];
  const empresasPorSegmento = stats?.empresas_por_segmento || [];

  return (
    <div data-testid="dashboard-page" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do departamento pessoal</p>
        </div>
        <Button
          onClick={() => setSelectorOpen(true)}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social : 'Selecionar Empresa'}
        </Button>
      </div>

      {/* Main Stats - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Empresas */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-red-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <Building2 className="text-red-500" size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-4xl font-bold text-white font-mono" data-testid="stat-empresas">
            {totalEmpresas}
          </p>
          <p className="text-slate-500 text-sm mt-1">Empresas cadastradas</p>
        </div>

        {/* Total Colaboradores */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Users className="text-blue-500" size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-4xl font-bold text-white font-mono" data-testid="stat-colaboradores">
            {totalColaboradores}
          </p>
          <p className="text-slate-500 text-sm mt-1">Colaboradores ativos</p>
        </div>

        {/* Média por Empresa */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Média</span>
          </div>
          <p className="text-4xl font-bold text-white font-mono" data-testid="stat-media">
            {mediaColaboradores}
          </p>
          <p className="text-slate-500 text-sm mt-1">Colaboradores por empresa</p>
        </div>

        {/* Admissões Pendentes */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <UserPlus className="text-amber-500" size={24} />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Pendente</span>
          </div>
          <p className="text-4xl font-bold text-white font-mono" data-testid="stat-admissoes">
            {admissoesPendentes}
          </p>
          <p className="text-slate-500 text-sm mt-1">Admissões a processar</p>
        </div>
      </div>

      {/* Gráfico de Evolução Mensal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-blue-500/20 flex items-center justify-center">
              <LineChart className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Evolução {anoAtual}</h3>
              <p className="text-xs text-slate-500">Crescimento de empresas e colaboradores mês a mês</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucaoData}>
                <defs>
                  <linearGradient id="colorEmpresas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C62828" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C62828" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorColaboradores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1E88E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                  label={{ value: 'Empresas', angle: -90, position: 'insideLeft', fill: '#C62828', fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#64748B', fontSize: 12 }} 
                  axisLine={{ stroke: '#1E293B' }}
                  tickLine={false}
                  label={{ value: 'Colaboradores', angle: 90, position: 'insideRight', fill: '#1E88E5', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                  itemStyle={{ color: '#94A3B8' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="empresas" 
                  stroke="#C62828" 
                  strokeWidth={2}
                  fill="url(#colorEmpresas)"
                  name="Empresas"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="colaboradores" 
                  stroke="#1E88E5" 
                  strokeWidth={3}
                  dot={{ fill: '#1E88E5', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#1E88E5', strokeWidth: 2 }}
                  name="Colaboradores"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row - Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Dissídios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Calendar className="text-red-500" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Próximos Dissídios</h3>
                  <p className="text-xs text-slate-500">Empresas com data-base próxima</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Ver todos
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
          <div className="p-4">
            {proximosDissidios.length > 0 ? (
              <div className="space-y-3">
                {proximosDissidios.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-red-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                        {item.empresa?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.empresa}</p>
                        <p className="text-xs text-slate-500">{item.sindicato || 'Sindicato não informado'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-red-400">{item.data_base}</p>
                      <p className="text-xs text-slate-500">{item.dias_restantes} dias</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                  <Calendar className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-400">Nenhum dissídio próximo</p>
                <p className="text-sm text-slate-600 mt-1">Configure as datas-base nas empresas</p>
              </div>
            )}
          </div>
        </div>

        {/* Empresas por Segmento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Briefcase className="text-purple-500" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Empresas por Segmento</h3>
                <p className="text-xs text-slate-500">Distribuição por tipo de atividade</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            {empresasPorSegmento.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={empresasPorSegmento}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="quantidade"
                        stroke="none"
                      >
                        {empresasPorSegmento.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {empresasPorSegmento.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                        />
                        <span className="text-sm text-slate-300">{item.segmento || 'Não informado'}</span>
                      </div>
                      <span className="text-sm font-mono text-white">{item.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                  <BarChart3 className="text-slate-600" size={32} />
                </div>
                <p className="text-slate-400">Sem dados de segmento</p>
                <p className="text-sm text-slate-600 mt-1">Defina o tipo de atividade nas empresas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admissões Pendentes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <UserPlus className="text-amber-500" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Admissões Pendentes</h3>
                <p className="text-xs text-slate-500">Colaboradores aguardando processamento</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Processar todas
            </Button>
          </div>
        </div>
        <div className="p-4">
          {stats?.admissoes_lista?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Data Admissão</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stats.admissoes_lista.slice(0, 5).map((adm, index) => (
                    <tr key={index} className="hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                            {adm.nome?.charAt(0)}
                          </div>
                          <span className="font-medium text-white">{adm.nome}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-400">{adm.empresa}</td>
                      <td className="p-3 font-mono text-slate-300">{adm.data_admissao}</td>
                      <td className="p-3">
                        <span className="badge-pending">{adm.status}</span>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400">
                          Processar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <Zap className="text-emerald-500" size={32} />
              </div>
              <p className="text-slate-400">Nenhuma admissão pendente</p>
              <p className="text-sm text-slate-600 mt-1">Todas as admissões foram processadas</p>
            </div>
          )}
        </div>
      </div>

      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default Dashboard;
