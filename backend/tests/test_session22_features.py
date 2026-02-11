"""
Testes para funcionalidades da Sessão 22:
- FASE 1: Sistema de Permissões
- FASE 4: Audit Log
- FASE 6: Fechamento Mensal
- FASE 7: Grupos Empresariais
"""

import pytest
import httpx
import os
from datetime import datetime

# Configuração
API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001") + "/api"
SUPER_ADMIN_EMAIL = "alberto.lemes@businessconta.com.br"
SUPER_ADMIN_PASSWORD = "Business@2026"
OPERACIONAL_EMAIL = "operacional@test.com"
OPERACIONAL_PASSWORD = "123456"


class TestAuth:
    """Testes de autenticação e tokens"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    def test_login_success(self, client):
        """Teste de login bem-sucedido"""
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        print(f"✅ Login bem-sucedido para {SUPER_ADMIN_EMAIL}")
    
    def test_login_invalid_password(self, client):
        """Teste de login com senha inválida"""
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": "senha_errada"}
        )
        assert response.status_code == 401
        print("✅ Login com senha inválida retorna 401")
    
    def test_login_invalid_email(self, client):
        """Teste de login com email inválido"""
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": "naoexiste@test.com", "password": "123456"}
        )
        assert response.status_code == 401
        print("✅ Login com email inválido retorna 401")


class TestPermissoes:
    """Testes do sistema de permissões (FASE 1)"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def operacional_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": OPERACIONAL_EMAIL, "password": OPERACIONAL_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_super_admin_sees_all_companies(self, client, super_admin_token):
        """Super admin deve ver todas as empresas"""
        response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) >= 1
        print(f"✅ Super admin vê {len(companies)} empresa(s)")
    
    def test_operacional_sees_limited_companies(self, client, operacional_token):
        """Operacional deve ver apenas empresas atribuídas"""
        if not operacional_token:
            pytest.skip("Usuário operacional não existe")
        
        response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {operacional_token}"}
        )
        assert response.status_code == 200
        companies = response.json()
        # Operacional deve ver no máximo as empresas em company_ids
        assert len(companies) <= 5  # Não deve ver todas
        print(f"✅ Operacional vê {len(companies)} empresa(s) (limitado)")
    
    def test_operacional_cannot_access_unauthorized_company(self, client, operacional_token, super_admin_token):
        """Operacional não deve acessar empresa não autorizada"""
        if not operacional_token:
            pytest.skip("Usuário operacional não existe")
        
        # Obter todas as empresas como admin
        admin_response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        all_companies = admin_response.json()
        
        # Obter empresas do operacional
        op_response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {operacional_token}"}
        )
        op_companies = [c["id"] for c in op_response.json()]
        
        # Encontrar uma empresa que o operacional NÃO tem acesso
        unauthorized = None
        for c in all_companies:
            if c["id"] not in op_companies:
                unauthorized = c["id"]
                break
        
        if not unauthorized:
            pytest.skip("Não há empresas não autorizadas para testar")
        
        # Tentar acessar dashboard da empresa não autorizada
        response = client.get(
            f"{API_URL}/dashboard/stats/{unauthorized}?competencia=01/2026",
            headers={"Authorization": f"Bearer {operacional_token}"}
        )
        assert response.status_code == 403
        print("✅ Acesso negado para empresa não autorizada")


class TestAuditLog:
    """Testes do Audit Log (FASE 4)"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_audit_logs_endpoint(self, client, super_admin_token):
        """Endpoint de audit logs deve retornar dados"""
        response = client.get(
            f"{API_URL}/audit-logs?limit=10",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✅ Audit logs retorna {data['total']} registros")
    
    def test_audit_log_records_login(self, client, super_admin_token):
        """Login deve ser registrado no audit log"""
        response = client.get(
            f"{API_URL}/audit-logs?action=auth.login&limit=5",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Deve ter pelo menos um login registrado
        login_logs = [l for l in data["logs"] if l["action"] == "auth.login"]
        assert len(login_logs) > 0
        print(f"✅ Encontrados {len(login_logs)} registros de login")
    
    def test_audit_summary_endpoint(self, client, super_admin_token):
        """Endpoint de resumo deve retornar estatísticas"""
        response = client.get(
            f"{API_URL}/audit-logs/summary?days=30",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_logs" in data
        assert "by_action" in data
        assert "by_user" in data
        print(f"✅ Resumo: {data['total_logs']} logs nos últimos 30 dias")
    
    def test_audit_actions_endpoint(self, client, super_admin_token):
        """Endpoint de ações disponíveis"""
        response = client.get(
            f"{API_URL}/audit-logs/actions",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        # Deve ter categorias de ações
        assert "Autenticação" in data["actions"]
        print("✅ Ações disponíveis retornadas corretamente")


class TestFechamentoMensal:
    """Testes do Fechamento Mensal (FASE 6)"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def company_id(self, client, super_admin_token):
        response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_fechamento_mensal_get(self, client, super_admin_token, company_id):
        """Obter apuração consolidada"""
        if not company_id:
            pytest.skip("Nenhuma empresa disponível")
        
        response = client.get(
            f"{API_URL}/fechamento-mensal/{company_id}?competencia=01/2026",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verificar estrutura da resposta
        assert "competencia" in data
        assert "status" in data
        assert "resumo" in data
        assert "icms" in data
        assert "pis" in data
        assert "cofins" in data
        assert "total_impostos" in data
        
        print(f"✅ Fechamento mensal: Status={data['status']}, Total impostos=R$ {data['total_impostos']['a_pagar']:,.2f}")
    
    def test_fechamento_mensal_historico(self, client, super_admin_token, company_id):
        """Obter histórico de fechamentos"""
        if not company_id:
            pytest.skip("Nenhuma empresa disponível")
        
        response = client.get(
            f"{API_URL}/fechamento-mensal/{company_id}/historico",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "fechamentos" in data
        print(f"✅ Histórico: {len(data['fechamentos'])} fechamento(s)")


class TestGruposEmpresariais:
    """Testes de Grupos Empresariais (FASE 7)"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_list_grupos(self, client, super_admin_token):
        """Listar grupos empresariais"""
        response = client.get(
            f"{API_URL}/grupos-empresariais",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "grupos" in data
        assert "total" in data
        print(f"✅ Grupos empresariais: {data['total']} grupo(s)")
    
    def test_grupo_consolidado(self, client, super_admin_token):
        """Obter dashboard consolidado do grupo"""
        # Primeiro obter um grupo existente
        response = client.get(
            f"{API_URL}/grupos-empresariais",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        grupos = response.json().get("grupos", [])
        
        if not grupos:
            pytest.skip("Nenhum grupo empresarial cadastrado")
        
        grupo_id = grupos[0]["id"]
        
        # Obter consolidado
        response = client.get(
            f"{API_URL}/grupos-empresariais/{grupo_id}/consolidado?competencia=01/2026",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "grupo_nome" in data
        assert "total_empresas" in data
        assert "resumo" in data
        assert "empresas" in data
        
        print(f"✅ Consolidado do grupo '{data['grupo_nome']}': {data['total_empresas']} empresa(s)")


class TestDashboard:
    """Testes do Dashboard principal"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def company_id(self, client, super_admin_token):
        response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_dashboard_stats(self, client, super_admin_token, company_id):
        """Obter estatísticas do dashboard"""
        if not company_id:
            pytest.skip("Nenhuma empresa disponível")
        
        response = client.get(
            f"{API_URL}/dashboard/stats/{company_id}?competencia=01/2026",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verificar estrutura básica do dashboard
        assert "competencia" in data
        assert "debitos" in data or "creditos" in data
        print(f"✅ Dashboard carregado com sucesso")
    
    def test_inconsistencias(self, client, super_admin_token, company_id):
        """Obter inconsistências fiscais"""
        if not company_id:
            pytest.skip("Nenhuma empresa disponível")
        
        response = client.get(
            f"{API_URL}/inconsistencias/{company_id}?competencia=01/2026",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verificar estrutura do endpoint de inconsistências
        assert "categorias" in data
        assert "resumo" in data
        print(f"✅ Inconsistências carregadas: {data['resumo'].get('total', 0)} alerta(s)")


class TestSPED:
    """Testes de exportação SPED (FASE 5)"""
    
    @pytest.fixture
    def client(self):
        return httpx.Client(timeout=30.0)
    
    @pytest.fixture
    def super_admin_token(self, client):
        response = client.post(
            f"{API_URL}/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def company_id(self, client, super_admin_token):
        response = client.get(
            f"{API_URL}/companies",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_sped_export(self, client, super_admin_token, company_id):
        """Exportar arquivo SPED"""
        if not company_id:
            pytest.skip("Nenhuma empresa disponível")
        
        response = client.get(
            f"{API_URL}/sped/export/{company_id}?competencia=01/2026",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "content" in data
        assert "filename" in data
        
        # Verificar que o conteúdo começa com registro 0000
        assert data["content"].startswith("|0000|")
        print(f"✅ SPED exportado: {data['filename']}")


# Executar testes se chamado diretamente
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
