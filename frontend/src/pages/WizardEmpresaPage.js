import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import WizardEmpresa from './WizardEmpresa';

const WizardEmpresaPage = ({ user, onLogout }) => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/companies');
  };

  const handleCancel = () => {
    navigate('/companies');
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        <WizardEmpresa 
          companyId={companyId} 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
};

export default WizardEmpresaPage;
