import React from 'react';
import Layout from '../components/Layout';
import DashboardInconsistencias from './DashboardInconsistencias';

const AlertasPage = ({ user, onLogout }) => {
  return (
    <Layout user={user} onLogout={onLogout}>
      <DashboardInconsistencias />
    </Layout>
  );
};

export default AlertasPage;
