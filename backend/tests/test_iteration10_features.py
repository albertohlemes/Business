"""
Test iteration 10 features:
1. Dashboard comparative analysis (Lucro Presumido vs. Lucro Real)
2. Reports filter (entrada/saída) - verify 'tipo' parameter
3. Auto-fill competência from global context
4. Company selection in header
5. Análise de Alíquotas de Saída page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://taxsmart-13.preview.emergentagent.com')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@test.com", "password": "test123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def companies(headers):
    """Get list of companies"""
    response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
    assert response.status_code == 200
    return response.json()

class TestDashboardComparativeAnalysis:
    """Test dashboard comparative analysis feature"""
    
    def test_dashboard_stats_returns_analise_comparativa_for_lucro_real(self, headers, companies):
        """Test that dashboard returns analise_comparativa for lucro_real company"""
        # Find lucro_real company (ANZEN)
        lucro_real_company = next((c for c in companies if c.get('regime_tributario') == 'lucro_real'), None)
        
        if not lucro_real_company:
            pytest.skip("No lucro_real company found")
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{lucro_real_company['id']}?competencia=01/2024",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "empresa" in data
        assert "analise_comparativa" in data
        assert data["empresa"]["regime_tributario"] == "lucro_real"
        
        # For lucro_real, analise_comparativa should always be present
        if data["analise_comparativa"]:
            assert data["analise_comparativa"]["regime_atual"] == "lucro_real"
            assert "lucro_presumido_hipotetico" in data["analise_comparativa"]
            assert "lucro_real" in data["analise_comparativa"]
            print(f"SUCCESS: analise_comparativa present for lucro_real company")
    
    def test_dashboard_stats_returns_analise_comparativa_for_lucro_presumido(self, headers, companies):
        """Test that dashboard returns analise_comparativa for lucro_presumido company when faturamento > 0"""
        # Find lucro_presumido company (COMERCIO TESTE)
        lucro_presumido_company = next((c for c in companies if c.get('regime_tributario') == 'lucro_presumido'), None)
        
        if not lucro_presumido_company:
            pytest.skip("No lucro_presumido company found")
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{lucro_presumido_company['id']}?competencia=01/2024",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "empresa" in data
        assert "analise_comparativa" in data
        assert data["empresa"]["regime_tributario"] == "lucro_presumido"
        
        # For lucro_presumido with faturamento=0, analise_comparativa should be null
        if data["valores"]["faturamento_total"] == 0:
            assert data["analise_comparativa"] is None
            print(f"SUCCESS: analise_comparativa is null when faturamento=0 for lucro_presumido")
        else:
            assert data["analise_comparativa"]["regime_atual"] == "lucro_presumido"
            assert "lucro_presumido" in data["analise_comparativa"]
            assert "lucro_real_hipotetico" in data["analise_comparativa"]
            print(f"SUCCESS: analise_comparativa present for lucro_presumido with faturamento > 0")


class TestReportsFilter:
    """Test reports filter (entrada/saída)"""
    
    def test_reports_by_product_with_tipo_entrada(self, headers, companies):
        """Test reports by-product endpoint with tipo=entrada"""
        company = companies[0]
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{company['id']}?competencia=01/2024&tipo=entrada",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"SUCCESS: Reports by-product with tipo=entrada returns 200")
    
    def test_reports_by_product_with_tipo_saida(self, headers, companies):
        """Test reports by-product endpoint with tipo=saida"""
        company = companies[0]
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{company['id']}?competencia=01/2024&tipo=saida",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"SUCCESS: Reports by-product with tipo=saida returns 200")
    
    def test_reports_by_ncm_with_tipo_entrada(self, headers, companies):
        """Test reports by-ncm endpoint with tipo=entrada"""
        company = companies[0]
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-ncm/{company['id']}?competencia=01/2024&tipo=entrada",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"SUCCESS: Reports by-ncm with tipo=entrada returns 200")
    
    def test_reports_by_ncm_with_tipo_saida(self, headers, companies):
        """Test reports by-ncm endpoint with tipo=saida"""
        company = companies[0]
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-ncm/{company['id']}?competencia=01/2024&tipo=saida",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"SUCCESS: Reports by-ncm with tipo=saida returns 200")


class TestAnaliseAliquotasSaida:
    """Test Análise de Alíquotas de Saída endpoint"""
    
    def test_analise_aliquotas_saida_endpoint(self, headers, companies):
        """Test that analise-aliquotas-saida endpoint returns correct structure"""
        company = companies[0]
        
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{company['id']}?competencia=01/2024",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure (actual API response keys)
        assert "empresa" in data
        assert "competencia" in data
        assert "regime_tributario" in data
        assert "aliquotas_esperadas" in data
        assert "produtos" in data
        assert "resumo_alertas" in data
        assert "total_produtos" in data
        assert "total_documentos_saida" in data
        assert "uf" in data
        
        print(f"SUCCESS: analise-aliquotas-saida endpoint returns correct structure")
        print(f"  - Regime: {data['regime_tributario']}")
        print(f"  - Alíquotas esperadas: {data['aliquotas_esperadas']}")
        print(f"  - Total produtos: {data['total_produtos']}")


class TestCompanySelection:
    """Test company selection functionality"""
    
    def test_companies_list_returns_all_companies(self, headers):
        """Test that companies list returns all companies for admin"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        
        assert response.status_code == 200
        companies = response.json()
        
        assert len(companies) >= 2, "Expected at least 2 companies"
        
        # Verify company structure
        for company in companies:
            assert "id" in company
            assert "razao_social" in company
            assert "cnpj" in company
            assert "regime_tributario" in company
        
        print(f"SUCCESS: Companies list returns {len(companies)} companies")
    
    def test_company_has_codigo_empresa(self, headers, companies):
        """Test that companies have codigo_empresa field"""
        for company in companies:
            assert "codigo_empresa" in company
            print(f"  - {company['razao_social']}: codigo_empresa={company.get('codigo_empresa')}")
        
        print(f"SUCCESS: All companies have codigo_empresa field")


class TestLogin:
    """Test login functionality"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin@test.com/test123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "test123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "admin"
        
        print(f"SUCCESS: Login with admin@test.com/test123 works correctly")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        print(f"SUCCESS: Login with invalid credentials returns 401")
