import React, { useState } from 'react';
import { Building2, Calendar, ChevronRight, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const CompanySelector = () => {
  const { 
    companies, 
    selectedCompany, 
    selectedCompetencia, 
    showSelector,
    selectCompany, 
    selectCompetencia, 
    closeSelector 
  } = useAppContext();

  const [tempCompany, setTempCompany] = useState(selectedCompany);
  const [tempCompetencia, setTempCompetencia] = useState(selectedCompetencia);

  // Formatar competência automaticamente (só números → MM/AAAA)
  const handleCompetenciaChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    
    // Limitar a 6 dígitos (MMAAAA)
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    
    // Formatar como MM/AAAA
    if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    
    setTempCompetencia(value);
  };

  const handleConfirm = () => {
    if (tempCompany) {
      selectCompany(tempCompany);
      selectCompetencia(tempCompetencia);
    }
  };

  if (!showSelector) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-business.png" 
                alt="Business Contabilidade" 
                className="h-12 w-auto bg-black rounded-lg p-1"
              />
              <div>
                <h2 className="text-xl font-bold">Selecione a Empresa</h2>
                <p className="text-red-100 text-sm">Escolha a empresa e competência para trabalhar</p>
              </div>
            </div>
            {selectedCompany && (
              <button 
                onClick={closeSelector}
                className="p-2 hover:bg-red-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Empresa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" />
              Empresa
            </label>
            {companies.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Nenhuma empresa cadastrada</p>
                <a href="/companies" className="text-red-600 font-semibold hover:underline">
                  Cadastrar primeira empresa →
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setTempCompany(company)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      tempCompany?.id === company.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{company.razao_social}</p>
                      <p className="text-sm text-gray-500">{company.cnpj}</p>
                      {company.cidade && (
                        <p className="text-xs text-gray-400">{company.cidade}/{company.uf}</p>
                      )}
                    </div>
                    {tempCompany?.id === company.id && (
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Competência */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Competência (Mês/Ano)
            </label>
            <input
              type="text"
              value={tempCompetencia}
              onChange={handleCompetenciaChange}
              placeholder="122025"
              maxLength="7"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-0 text-lg font-mono text-center"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">Digite apenas números (ex: 122025 → 12/2025)</p>
          </div>

          {/* Botão Confirmar */}
          <button
            onClick={handleConfirm}
            disabled={!tempCompany}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            Confirmar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelector;
