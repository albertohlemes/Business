import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { Building2, Users, FileText, UserPlus, ClipboardCheck, TrendingUp, AlertCircle, CheckCircle2, Calendar, ArrowUpRight, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada, competencia } = useEmpresa();

  useEffect(() => {
    fetchDashboard();
  }, [empresaSelecionada, competencia]);

  const fetchDashboard = async () => {
    try {
      const params = new URLSearchParams();
      if (empresaSelecionada?.id) {
        params.append('cliente_id', empresaSelecionada.id);
      }
      if (competencia) {
        params.append('competencia', competencia);
      }
      const queryString = params.toString();
      const response = await axios.get(`${API_URL}/api/dashboard${queryString ? '?' + queryString : ''}`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Empresas', value: stats?.total_clientes || 0, icon: Building2, color: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20' },
    { title: 'Colaboradores', value: stats?.total_colaboradores || 0, icon: Users, color: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20' },
    { title: 'Dissídios', value: stats?.dissidios_pendentes || 0, icon: FileText, color: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/20' },
    { title: 'Admissões', value: stats?.admissoes_pendentes || 0, icon: UserPlus, color: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20' },
  ];

  const pieData = [
    { name: 'Dissídios', value: stats?.dissidios_pendentes || 0, color: '#F59E0B' },
    { name: 'Admissões', value: stats?.admissoes_pendentes || 0, color: '#8B5CF6' },
    { name: 'Validações', value: stats?.validacoes_pendentes || 0, color: '#3B82F6' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <span className="badge-pending">Pendente</span>;
      case 'aprovado':
      case 'confirmado':
      case 'concluido':
        return <span className="badge-success">Concluído</span>;
      case 'rejeitado':
        return <span className="badge-error">Rejeitado</span>;
      default:
        return <span className="badge-processing">Processando</span>;
    }
  };

  const getTaskIcon = (tipo) => {
    switch (tipo) {
      case 'dissidio':
        return <FileText size={16} className="text-amber-500" />;
      case 'admissao':
        return <UserPlus size={16} className="text-purple-500" />;
      case 'validacao':
        return <ClipboardCheck size={16} className="text-blue-500" />;
      default:
        return <AlertCircle size={16} className="text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800 h-32 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 h-80 rounded-xl animate-pulse" />
          <div className="bg-slate-800 h-80 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Show empresa selection prompt if none selected
  if (!empresaSelecionada) {
    return (
      <div data-testid="dashboard-page" className="animate-fade-in">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-8 mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Bem-vindo ao Portal DP</h1>
                <p className="text-slate-400">Business Contabilidade</p>
              </div>
            </div>
            <p className="text-slate-400 max-w-xl">
              Selecione uma empresa para visualizar as estatísticas e começar a trabalhar com as ferramentas de departamento pessoal.
            </p>
          </div>
        </div>

        {/* Selection Card */}
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mx-auto mb-6 border border-red-500/30">
              <Building2 className="text-red-500" size={40} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-slate-500 mb-6">
              Escolha a empresa e a competência para visualizar os dados e ferramentas disponíveis.
            </p>
            <Button
              onClick={() => setSelectorOpen(true)}
              data-testid="select-empresa-btn"
              className="bg-red-600 hover:bg-red-700 h-12 px-8 text-base font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all"
            >
              <Building2 size={20} className="mr-2" />
              Selecionar Empresa
            </Button>
          </div>
        </div>

        <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-6 animate-fade-in">
      {/* Header with selected empresa */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Building2 className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
              </h1>
              <p className="text-slate-500 font-mono text-sm">{empresaSelecionada.cnpj}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Competência</p>
              <p className="text-lg font-mono font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-red-500" />
                {competencia}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all duration-300 group`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.glow}`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <ArrowUpRight size={20} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-slate-500 text-sm">{stat.title}</p>
            <p className="text-3xl font-bold text-white font-mono mt-1" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Resumo de Pendências</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#1E293B' }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#1E293B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                  }}
                  labelStyle={{ color: '#F8FAFC' }}
                />
                <Bar dataKey="value" fill="#C62828" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Distribuição</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Atividades Recentes</h3>
        {stats?.tarefas_recentes?.length > 0 ? (
          <div className="space-y-3">
            {stats.tarefas_recentes.map((tarefa, index) => (
              <div
                key={tarefa.id || index}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                    {getTaskIcon(tarefa.tipo)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{tarefa.titulo}</p>
                    <p className="text-sm text-slate-500 font-mono">
                      {new Date(tarefa.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(tarefa.status)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <CheckCircle2 className="text-slate-600" size={32} />
            </div>
            <p className="text-slate-400">Nenhuma atividade recente</p>
            <p className="text-sm text-slate-600 mt-1">Comece adicionando clientes e colaboradores</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
