"""
Test Iteration 44 Features:
1. GET /api/analise-horizontal/{company_id}?ano=2026 - Análise Horizontal (Evolução Fiscal)
2. POST /api/simples-nacional/difal/apuracao - DIFAL para Simples Nacional
3. POST /api/nfse/import-cancellation-report - Importação de relatório de cancelamento
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Company IDs for testing
SIMPLES_NACIONAL_COMPANY_ID = "e33af37a-38c3-41cb-a786-f8a685c860f6"  # Simples Nacional company for DIFAL


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0


class TestAnaliseHorizontal:
    """Tests for Análise Horizontal (Evolução Fiscal) endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        """Get a valid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0, "No companies found"
        return companies[0]["id"]
    
    def test_analise_horizontal_endpoint_exists(self, auth_token, company_id):
        """Test that the endpoint exists and returns 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analise-horizontal/{company_id}?ano=2026",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analise_horizontal_returns_correct_structure(self, auth_token, company_id):
        """Test that the response has the correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analise-horizontal/{company_id}?ano=2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "company_id" in data, "Missing company_id"
        assert "ano_atual" in data, "Missing ano_atual"
        assert "ano_anterior" in data, "Missing ano_anterior"
        assert "regime_tributario" in data, "Missing regime_tributario"
        assert "mensal" in data, "Missing mensal data"
        assert "mensal_ano_anterior" in data, "Missing mensal_ano_anterior data"
    
    def test_analise_horizontal_mensal_data_structure(self, auth_token, company_id):
        """Test that monthly data has correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analise-horizontal/{company_id}?ano=2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        mensal = data.get("mensal", {})
        # Should have 12 months
        assert len(mensal) == 12, f"Expected 12 months, got {len(mensal)}"
        
        # Check structure of first month
        first_month_key = "01/2026"
        if first_month_key in mensal:
            month_data = mensal[first_month_key]
            expected_fields = ["compras", "vendas", "impostos_pagar", "credito_acumulado", 
                             "icms", "icms_st", "pis", "cofins", "ipi", "iss", "das", "difal"]
            for field in expected_fields:
                assert field in month_data, f"Missing field {field} in monthly data"
    
    def test_analise_horizontal_ano_parameter(self, auth_token, company_id):
        """Test that ano parameter works correctly"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with 2025
        response = requests.get(
            f"{BASE_URL}/api/analise-horizontal/{company_id}?ano=2025",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ano_atual"] == 2025
        assert data["ano_anterior"] == 2024
    
    def test_analise_horizontal_invalid_company(self, auth_token):
        """Test with invalid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analise-horizontal/invalid-company-id?ano=2026",
            headers=headers
        )
        assert response.status_code == 404


class TestDIFALApuracao:
    """Tests for DIFAL calculation endpoint for Simples Nacional"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_difal_endpoint_exists(self, auth_token):
        """Test that the DIFAL endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/simples-nacional/difal/apuracao",
            headers=headers,
            json={
                "company_id": SIMPLES_NACIONAL_COMPANY_ID,
                "competencia": "01/2026"
            }
        )
        # Should return 200 or 400 (if company not Simples Nacional), not 404
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
    
    def test_difal_returns_correct_structure(self, auth_token):
        """Test DIFAL response structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/simples-nacional/difal/apuracao",
            headers=headers,
            json={
                "company_id": SIMPLES_NACIONAL_COMPANY_ID,
                "competencia": "01/2026"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            assert "competencia" in data, "Missing competencia"
            assert "empresa" in data, "Missing empresa"
            assert "resumo" in data, "Missing resumo"
            assert "embasamento_legal" in data, "Missing embasamento_legal"
            
            # Check empresa structure
            empresa = data["empresa"]
            assert "id" in empresa, "Missing empresa.id"
            assert "razao_social" in empresa, "Missing empresa.razao_social"
            assert "uf" in empresa, "Missing empresa.uf"
            assert "regime" in empresa, "Missing empresa.regime"
            
            # Check resumo structure
            resumo = data["resumo"]
            assert "total_notas_interestaduais" in resumo, "Missing total_notas_interestaduais"
            assert "total_base_calculo" in resumo, "Missing total_base_calculo"
            assert "total_difal_a_recolher" in resumo, "Missing total_difal_a_recolher"
        elif response.status_code == 400:
            # Company might not be Simples Nacional
            data = response.json()
            assert "detail" in data
            print(f"DIFAL test skipped: {data['detail']}")
    
    def test_difal_rejects_non_simples_nacional(self, auth_token):
        """Test that DIFAL rejects companies that are not Simples Nacional"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get a company list to find a non-Simples Nacional company
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        companies = response.json()
        
        # Find a Lucro Presumido company
        lucro_presumido_company = None
        for company in companies:
            if company.get("regime_tributario") == "lucro_presumido":
                lucro_presumido_company = company
                break
        
        if lucro_presumido_company:
            response = requests.post(
                f"{BASE_URL}/api/simples-nacional/difal/apuracao",
                headers=headers,
                json={
                    "company_id": lucro_presumido_company["id"],
                    "competencia": "01/2026"
                }
            )
            assert response.status_code == 400, "Should reject non-Simples Nacional company"
            data = response.json()
            assert "Simples Nacional" in data.get("detail", ""), "Error should mention Simples Nacional"
    
    def test_difal_invalid_company(self, auth_token):
        """Test DIFAL with invalid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/simples-nacional/difal/apuracao",
            headers=headers,
            json={
                "company_id": "invalid-company-id",
                "competencia": "01/2026"
            }
        )
        assert response.status_code == 404


class TestNfseCancellationReport:
    """Tests for NFS-e cancellation report import endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        """Get a valid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0
        return companies[0]["id"]
    
    def test_cancellation_report_endpoint_exists(self, auth_token, company_id):
        """Test that the endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple CSV file with note numbers
        csv_content = "numero\n123\n456\n789"
        files = {
            'report_file': ('test_canceladas.csv', csv_content, 'text/csv')
        }
        data = {
            'company_id': company_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/nfse/import-cancellation-report",
            headers=headers,
            files=files,
            data=data
        )
        # Should return 200, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_cancellation_report_csv_parsing(self, auth_token, company_id):
        """Test CSV file parsing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        csv_content = "numero;status\n12345;cancelada\n67890;cancelada\n11111;ativa"
        files = {
            'report_file': ('canceladas.csv', csv_content, 'text/csv')
        }
        data = {
            'company_id': company_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/nfse/import-cancellation-report",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        
        assert "numeros_cancelados" in result, "Missing numeros_cancelados in response"
        numeros = result["numeros_cancelados"]
        assert isinstance(numeros, list), "numeros_cancelados should be a list"
        # Should extract numbers from the CSV
        assert len(numeros) > 0, "Should extract at least one number"
    
    def test_cancellation_report_txt_parsing(self, auth_token, company_id):
        """Test TXT file parsing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        txt_content = "Notas Canceladas:\n100\n200\n300"
        files = {
            'report_file': ('canceladas.txt', txt_content, 'text/plain')
        }
        data = {
            'company_id': company_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/nfse/import-cancellation-report",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        
        assert "numeros_cancelados" in result
        numeros = result["numeros_cancelados"]
        assert "100" in numeros or "200" in numeros or "300" in numeros, "Should extract numbers from TXT"
    
    def test_cancellation_report_xml_parsing(self, auth_token, company_id):
        """Test XML file parsing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        xml_content = """<?xml version="1.0"?>
        <NotasCanceladas>
            <Nota><Numero>555</Numero></Nota>
            <Nota><Numero>666</Numero></Nota>
        </NotasCanceladas>
        """
        files = {
            'report_file': ('canceladas.xml', xml_content, 'application/xml')
        }
        data = {
            'company_id': company_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/nfse/import-cancellation-report",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        
        assert "numeros_cancelados" in result
        numeros = result["numeros_cancelados"]
        assert "555" in numeros or "666" in numeros, "Should extract numbers from XML"
    
    def test_cancellation_report_invalid_company(self, auth_token):
        """Test with invalid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        csv_content = "123\n456"
        files = {
            'report_file': ('test.csv', csv_content, 'text/csv')
        }
        data = {
            'company_id': 'invalid-company-id'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/nfse/import-cancellation-report",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 404


class TestAnaliseHorizontalInsights:
    """Tests for AI insights endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        """Get a valid company ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        companies = response.json()
        return companies[0]["id"]
    
    def test_insights_endpoint_exists(self, auth_token, company_id):
        """Test that the insights endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/analise-horizontal/insights/{company_id}",
            headers=headers,
            json={
                "dados_grafico": [],
                "totais": {"atual": {"compras": 0, "vendas": 0, "impostos": 0}, "anterior": {"compras": 0, "vendas": 0, "impostos": 0}},
                "ano_atual": 2026,
                "ano_anterior": 2025
            }
        )
        # Should return 200, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "analise" in data, "Missing analise in response"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
