"""
AURION Fiscal System - Backend API Tests
Tests for Dashboard, Apuração ICMS, and document filtering by activity type
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxhelper-20.preview.emergentagent.com')
COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS LTDA
COMPETENCIA = "01/2026"

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@test.com",
        "password": "123456"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")


class TestCompanies:
    """Company endpoint tests"""
    
    def test_get_companies(self, auth_token):
        """Test getting list of companies"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Find COMERCIAL RS LTDA
        comercial_rs = next((c for c in data if "COMERCIAL RS" in c.get("razao_social", "")), None)
        assert comercial_rs is not None
        assert comercial_rs["tipo_atividade"] == "comercio"


class TestDashboard:
    """Dashboard API tests - Document filtering by activity type"""
    
    def test_dashboard_stats_returns_data(self, auth_token):
        """Test dashboard stats endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "empresa" in data
        assert "quantidades" in data
        assert "valores" in data
        assert "creditos" in data
        assert "debitos" in data
    
    def test_dashboard_empresa_tipo_atividade(self, auth_token):
        """Test dashboard shows company activity type (Comércio)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["empresa"]["tipo_atividade"] == "comercio"
        assert data["empresa"]["razao_social"] == "COMERCIAL RS LTDA"
    
    def test_dashboard_entradas_saidas_separadas(self, auth_token):
        """Test dashboard shows ENTRADAS and SAÍDAS separately"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify ENTRADAS
        assert "nfe_entrada" in data["quantidades"]
        assert data["quantidades"]["nfe_entrada"] == 427
        
        # Verify SAÍDAS
        assert "nfe_saida" in data["quantidades"]
        assert data["quantidades"]["nfe_saida"] == 4040
        
        # Verify totals
        assert "total_entradas" in data["quantidades"]
        assert "total_saidas" in data["quantidades"]
    
    def test_dashboard_valores_entradas_saidas(self, auth_token):
        """Test dashboard shows Total Entradas and Total Saídas values"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify valores structure
        assert "entradas" in data["valores"]
        assert "saidas" in data["valores"]
        
        # Verify expected values (approximately)
        total_entradas = data["valores"]["entradas"]["total"]
        total_saidas = data["valores"]["saidas"]["total"]
        
        assert abs(total_entradas - 11980397.41) < 1  # R$ 11.980.397,41
        assert abs(total_saidas - 11871817.60) < 1   # R$ 11.871.817,60
    
    def test_dashboard_nfse_not_shown_for_comercio(self, auth_token):
        """Test NFS-e Prestados not shown for Comércio company"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # For comercio, NFS-e prestados should be 0 or not applicable
        nfse_prestados = data["quantidades"].get("nfse_prestados", 0)
        assert nfse_prestados == 0, "NFS-e Prestados should be 0 for Comércio company"


class TestApuracaoICMS:
    """Apuração ICMS API tests - ICMS flags and CFOP highlighting"""
    
    def test_apuracao_icms_returns_data(self, auth_token):
        """Test apuração ICMS endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "empresa" in data
        assert "valores_por_documento" in data
        assert "entradas" in data
        assert "saidas" in data
        assert "apuracao" in data
        assert "flags" in data
        assert "desconsiderados" in data
    
    def test_apuracao_icms_valores_match_dashboard(self, auth_token):
        """Test apuração ICMS values match Dashboard values"""
        # Get Dashboard data
        dashboard_response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        dashboard = dashboard_response.json()
        
        # Get Apuração ICMS data
        apuracao_response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        apuracao = apuracao_response.json()
        
        # Compare values
        dashboard_entradas = dashboard["valores"]["entradas"]["total"]
        apuracao_entradas = apuracao["valores_por_documento"]["total_entradas"]
        assert abs(dashboard_entradas - apuracao_entradas) < 0.01, "Entradas values should match"
        
        dashboard_saidas = dashboard["valores"]["saidas"]["total"]
        apuracao_saidas = apuracao["valores_por_documento"]["total_saidas"]
        assert abs(dashboard_saidas - apuracao_saidas) < 0.01, "Saídas values should match"
    
    def test_apuracao_icms_flags_present(self, auth_token):
        """Test ICMS flags are present in response"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify flags structure
        assert "desconsiderar_icms_despesas" in data["flags"]
        assert "desconsiderar_icms_st" in data["flags"]
        assert "cfops_despesa" in data["flags"]
        assert "cfops_st" in data["flags"]
    
    def test_apuracao_icms_cfops_have_status_flags(self, auth_token):
        """Test CFOPs have is_despesa, is_st, and desconsiderado flags"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check entradas CFOPs
        for cfop in data["entradas"]["por_cfop"]:
            assert "is_despesa" in cfop, f"CFOP {cfop['cfop']} missing is_despesa flag"
            assert "is_st" in cfop, f"CFOP {cfop['cfop']} missing is_st flag"
            assert "desconsiderado" in cfop, f"CFOP {cfop['cfop']} missing desconsiderado flag"
    
    def test_apuracao_icms_cfop_1403_is_st(self, auth_token):
        """Test CFOP 1403 is marked as ST"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        cfop_1403 = next((c for c in data["entradas"]["por_cfop"] if c["cfop"] == "1403"), None)
        assert cfop_1403 is not None, "CFOP 1403 should exist"
        assert cfop_1403["is_st"] == True, "CFOP 1403 should be marked as ST"
    
    def test_apuracao_icms_cfop_1556_is_despesa(self, auth_token):
        """Test CFOP 1556 is marked as DESPESA"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        cfop_1556 = next((c for c in data["entradas"]["por_cfop"] if c["cfop"] == "1556"), None)
        assert cfop_1556 is not None, "CFOP 1556 should exist"
        assert cfop_1556["is_despesa"] == True, "CFOP 1556 should be marked as DESPESA"
    
    def test_apuracao_icms_desconsiderados_card(self, auth_token):
        """Test desconsiderados card shows correct values"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify desconsiderados structure
        assert "despesas" in data["desconsiderados"]
        assert "st" in data["desconsiderados"]
        assert "total_icms_desconsiderado" in data["desconsiderados"]
        
        # Verify values are present
        despesas = data["desconsiderados"]["despesas"]
        st = data["desconsiderados"]["st"]
        
        assert "valor_icms" in despesas
        assert "qtd_itens" in despesas
        assert "valor_icms" in st
        assert "qtd_itens" in st
    
    def test_apuracao_icms_totals(self, auth_token):
        """Test ICMS totals are calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        apuracao = data["apuracao"]
        assert "credito_icms" in apuracao
        assert "debito_icms" in apuracao
        assert "saldo" in apuracao
        assert "situacao" in apuracao
        
        # Verify saldo calculation
        expected_saldo = apuracao["debito_icms"] - apuracao["credito_icms"]
        assert abs(apuracao["saldo"] - expected_saldo) < 0.01


class TestDocumentCounts:
    """Test document counts match expected values"""
    
    def test_document_counts(self, auth_token):
        """Test document counts: 427 entradas, 4040 saídas"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["quantidades"]["nfe_entrada"] == 427, "Should have 427 NF-e Entrada"
        assert data["quantidades"]["nfe_saida"] == 4040, "Should have 4040 NF-e Saída"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
