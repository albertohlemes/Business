import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Building2, Users, FileText, UserPlus, ClipboardCheck, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Clientes', value: stats?.total_clientes || 0, icon: Building2, color: 'bg-blue-500' },
    { title: 'Colaboradores', value: stats?.total_colaboradores || 0, icon: Users, color: 'bg-emerald-500' },
    { title: 'Dissídios Pendentes', value: stats?.dissidios_pendentes || 0, icon: FileText, color: 'bg-amber-500' },
    { title: 'Admissões Pendentes', value: stats?.admissoes_pendentes || 0, icon: UserPlus, color: 'bg-purple-500' },
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
        return <FileText size={16} className="text-amber-600" />;
      case 'admissao':
        return <UserPlus size={16} className="text-purple-600" />;
      case 'validacao':
        return <ClipboardCheck size={16} className="text-blue-600" />;
      default:
        return <AlertCircle size={16} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-80 rounded-lg" />
          <div className="skeleton h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do departamento pessoal</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 font-mono mt-1" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks Chart */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Resumo de Pendências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.tarefas_recentes?.length > 0 ? (
            <div className="space-y-3">
              {stats.tarefas_recentes.map((tarefa, index) => (
                <div
                  key={tarefa.id || index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      {getTaskIcon(tarefa.tipo)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{tarefa.titulo}</p>
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
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-slate-400" size={32} />
              </div>
              <p className="text-slate-500">Nenhuma atividade recente</p>
              <p className="text-sm text-slate-400 mt-1">Comece adicionando clientes e colaboradores</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
