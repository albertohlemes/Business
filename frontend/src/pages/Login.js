import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, AlertCircle, User, Eye, EyeOff } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'operacional'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      
      if (isRegister) {
        await axios.post(`${API}${endpoint}`, formData);
        setIsRegister(false);
        setFormData({ ...formData, password: '' });
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
      } else {
        const response = await axios.post(`${API}${endpoint}`, {
          email: formData.email,
          password: formData.password
        });
        onLogin(response.data.access_token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0C0C] px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#C8A951]/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#C8A951]/3 to-transparent blur-3xl" />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img 
            src="/aurion-logo.png" 
            alt="AURION" 
            className="h-20 w-auto mx-auto mb-4"
          />
          <h1 
            className="text-3xl font-light text-white mb-1 tracking-tight"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            AURION
          </h1>
          <p className="text-[#A1A1AA] text-sm uppercase tracking-wider">
            Seu Núcleo de Inteligência Operacional
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#141414] rounded border border-[#2A2A2A] p-8 shadow-xl">
          <h2 className="text-xl font-medium text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {isRegister ? 'Criar Conta' : 'Entrar'}
          </h2>

          {error && (
            <div data-testid="login-error-message" className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-[#A1A1AA]" />
                  <input
                    data-testid="register-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951] transition-colors"
                    required={isRegister}
                    placeholder="Seu nome"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-[#A1A1AA]" />
                <input
                  data-testid="login-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951] transition-colors"
                  required
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-[#A1A1AA]" />
                <input
                  data-testid="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-11 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951] transition-colors"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#A1A1AA] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                  Tipo de Conta
                </label>
                <select
                  data-testid="register-role-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951] transition-colors"
                >
                  <option value="operacional">Operacional</option>
                  <option value="master">Master</option>
                </select>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Master: acesso a todas as empresas | Operacional: apenas empresas designadas
                </p>
              </div>
            )}

            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8A951] text-black py-3 rounded font-semibold hover:bg-[#B09240] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="toggle-register-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-[#C8A951] hover:text-[#E0C678] text-sm font-medium transition-colors"
            >
              {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#A1A1AA]">
            AURION © {new Date().getFullYear()} • Sistema de Fechamento Fiscal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
