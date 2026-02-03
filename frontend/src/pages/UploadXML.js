import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const UploadXML = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults(null);
  };

  const handleUpload = async () => {
    if (!selectedCompany || files.length === 0) {
      alert('Selecione uma empresa e pelo menos um arquivo XML');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('company_id', selectedCompany);
    formData.append('tipo', tipo);
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(API + '/xml/upload', formData, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setResults(response.data);
      setFiles([]);
      document.getElementById('file-input').value = '';
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  const FileItem = ({ file, index }) => (
    <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded">
      <FileText className="w-4 h-4 text-red-600" />
      <span className="text-gray-700 flex-1">{file.name}</span>
      <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="upload-xml-page" className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload de XMLs</h1>
          <p className="text-gray-600">Envie seus arquivos XML de notas fiscais em lote</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
              <select
                data-testid="select-company-dropdown"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.razao_social} ({company.cnpj})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Operação *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-entrada-radio"
                    type="radio"
                    value="entrada"
                    checked={tipo === 'entrada'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-gray-700">Entrada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-saida-radio"
                    type="radio"
                    value="saida"
                    checked={tipo === 'saida'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-gray-700">Saída</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arquivos XML *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  id="file-input"
                  data-testid="xml-file-input"
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <span className="text-red-600 hover:text-red-700 font-semibold">Clique para selecionar</span>
                  <span className="text-gray-600"> ou arraste os arquivos aqui</span>
                </label>
                <p className="text-sm text-gray-500 mt-2">Aceita múltiplos arquivos .xml</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Arquivos Selecionados ({files.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <FileItem key={index} file={file} index={index} />
                  ))}
                </div>
              </div>
            )}

            <button
              data-testid="upload-files-button"
              onClick={handleUpload}
              disabled={uploading || !selectedCompany || files.length === 0}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {uploading ? 'Enviando...' : 'Enviar ' + files.length + ' arquivo(s)'}
            </button>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resultado do Upload</h2>
            
            {results.success.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Arquivos Processados ({results.success.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.success.map((item, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">{item.filename}</p>
                      <p className="text-xs text-green-700">Chave: {item.chave}</p>
                      {item.conversoes > 0 && (
                        <p className="text-xs text-green-700 font-semibold">{item.conversoes} CFOP(s) convertido(s) automaticamente</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.relatorio_conversoes && results.relatorio_conversoes.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
                  <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Relatório de Conversões Automáticas ({results.total_conversoes} produtos)
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.relatorio_conversoes.map((arquivo, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                        <p className="font-semibold text-purple-900 mb-2">NF-e {arquivo.nfe} - {arquivo.arquivo}</p>
                        <div className="space-y-2">
                          {arquivo.conversoes.map((conv, i) => (
                            <div key={i} className="bg-purple-50 p-2 rounded text-xs">
                              <p className="font-semibold text-gray-900">{conv.produto}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-mono">
                                  {conv.cfop_original}
                                </span>
                                <span>→</span>
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono">
                                  {conv.cfop_convertido}
                                </span>
                                <span className={'px-2 py-1 rounded font-semibold ' + 
                                  (conv.categoria === 'revenda' ? 'bg-purple-100 text-purple-800' :
                                   conv.categoria === 'insumo' ? 'bg-blue-100 text-blue-800' :
                                   conv.categoria === 'despesa' ? 'bg-orange-100 text-orange-800' :
                                   'bg-yellow-100 text-yellow-800')}>
                                  {conv.categoria.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1">{conv.motivo}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Erros ({results.errors.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.errors.map((item, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">{item.filename}</p>
                      <p className="text-xs text-red-700">{item.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UploadXML;
