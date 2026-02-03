import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Building2, FileText, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    companies: 0,
    documents: 0,
    validated: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [companiesRes, documentsRes] = await Promise.all([
        axios.get(`${API}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/xml/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const docs = documentsRes.data;
      setStats({
        companies: companiesRes.data.length,
        documents: docs.length,
        validated: docs.filter(d => d.status_validacao === 'validado').length,
        pending: docs.filter(d => d.status_validacao === 'pendente').length
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, link }) => (
    <Link to={link} className="card-hover">
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </Link>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="dashboard-page" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo, {user.name}!</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Building2}
                title="Empresas"
                value={stats.companies}
                color="bg-blue-600"
                link="/companies"
              />
              <StatCard
                icon={FileText}
                title="Documentos"
                value={stats.documents}
                color="bg-purple-600"
                link="/documents"
              />
              <StatCard
                icon={CheckCircle}
                title="Validados"
                value={stats.validated}
                color="bg-green-600"
                link="/documents"
              />
              <StatCard
                icon={AlertTriangle}
                title="Pendentes"
                value={stats.pending}
                color="bg-orange-600"
                link="/documents"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  data-testid="quick-action-upload"
                  to="/upload"
                  className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Enviar XMLs</h3>
                    <p className="text-sm text-gray-600">Upload em lote</p>
                  </div>
                </Link>

                <Link
                  data-testid="quick-action-validate"
                  to="/validation"
                  className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-all"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Validar CFOPs</h3>
                    <p className="text-sm text-gray-600">Revisar documentos</p>
                  </div>
                </Link>

                <Link
                  data-testid="quick-action-export"
                  to="/export"
                  className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-all"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Exportar SPED</h3>
                    <p className="text-sm text-gray-600">Gerar relatórios</p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;