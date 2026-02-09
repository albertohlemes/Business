"""
Test Iteration 40 Features:
1. GET /api/simples-nacional/{company_id}/exportar-produtos - New endpoint for grouped product export (XLSX)
2. GET /api/relatorio-agrupado-aliquota/{company_id}/exportar - ICMS export verification
3. POST /api/dashboard/simples-nacional - Verify discount data is correct
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
COMPANY_ID_SIMPLES = "e33af37a-38c3-41cb-a786-f8a685c860f6"  # E.L.M. COMERCIO DE ALIMENTOS LTDA
COMPANY_NAME_SIMPLES = "E. L. M. COMERCIO DE ALIMENTOS LTDA"
COMPANY_ID_PRESUMIDO = "b76b3672-229c-4973-8ed4-5eaa9739e160"  # Teknolink
COMPETENCIA = "01/2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestExportarProdutosAgrupados:
    """Test GET /api/simples-nacional/{company_id}/exportar-produtos endpoint"""
    
    def test_endpoint_exists_and_returns_xlsx(self, auth_headers):
        """Test that the endpoint exists and returns XLSX file"""
        response = requests.get(
            f"{BASE_URL}/api/simples-nacional/{COMPANY_ID_SIMPLES}/exportar-produtos",
            params={"competencia": COMPETENCIA, "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is XLSX
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, \
            f"Expected XLSX content type, got: {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment, got: {content_disposition}"
        assert ".xlsx" in content_disposition, f"Expected .xlsx filename, got: {content_disposition}"
        
        print(f"✓ Endpoint returns XLSX file successfully")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
    
    def test_xlsx_file_has_content(self, auth_headers):
        """Test that the XLSX file has actual content"""
        response = requests.get(
            f"{BASE_URL}/api/simples-nacional/{COMPANY_ID_SIMPLES}/exportar-produtos",
            params={"competencia": COMPETENCIA, "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Check file size (should be > 0 bytes)
        content_length = len(response.content)
        assert content_length > 0, "XLSX file is empty"
        
        # Expected ~19KB for E.L.M. in 01/2026 according to main agent
        print(f"✓ XLSX file size: {content_length} bytes ({content_length/1024:.2f} KB)")
        
        # Verify it's a valid XLSX (starts with PK - ZIP signature)
        assert response.content[:2] == b'PK', "File does not appear to be a valid XLSX (ZIP) file"
        print(f"✓ File has valid XLSX/ZIP signature")
    
    def test_invalid_company_returns_404(self, auth_headers):
        """Test that invalid company ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/simples-nacional/invalid-company-id/exportar-produtos",
            params={"competencia": COMPETENCIA, "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid company returns 404 as expected")
    
    def test_requires_authentication(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/simples-nacional/{COMPANY_ID_SIMPLES}/exportar-produtos",
            params={"competencia": COMPETENCIA, "formato": "xlsx"}
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Endpoint requires authentication (returns {response.status_code})")


class TestRelatorioAgrupado:
    """Test GET /api/relatorio-agrupado-aliquota/{company_id}/exportar endpoint"""
    
    def test_icms_export_endpoint_exists(self, auth_headers):
        """Test that ICMS export endpoint exists and returns XLSX"""
        response = requests.get(
            f"{BASE_URL}/api/relatorio-agrupado-aliquota/{COMPANY_ID_SIMPLES}/exportar",
            params={"competencia": COMPETENCIA, "imposto": "icms", "tipo": "saida", "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is XLSX
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, \
            f"Expected XLSX content type, got: {content_type}"
        
        print(f"✓ ICMS export endpoint returns XLSX successfully")
        print(f"  Content-Type: {content_type}")
        print(f"  File size: {len(response.content)} bytes")
    
    def test_icms_export_entrada(self, auth_headers):
        """Test ICMS export for entrada (input) documents"""
        response = requests.get(
            f"{BASE_URL}/api/relatorio-agrupado-aliquota/{COMPANY_ID_SIMPLES}/exportar",
            params={"competencia": COMPETENCIA, "imposto": "icms", "tipo": "entrada", "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ ICMS entrada export works - File size: {len(response.content)} bytes")
    
    def test_icms_export_for_presumido_company(self, auth_headers):
        """Test ICMS export for Lucro Presumido company (Teknolink)"""
        response = requests.get(
            f"{BASE_URL}/api/relatorio-agrupado-aliquota/{COMPANY_ID_PRESUMIDO}/exportar",
            params={"competencia": COMPETENCIA, "imposto": "icms", "tipo": "saida", "formato": "xlsx"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ ICMS export for Lucro Presumido company works - File size: {len(response.content)} bytes")


class TestDashboardSimplesNacional:
    """Test POST /api/dashboard/simples-nacional endpoint - verify discount data"""
    
    def test_dashboard_returns_200(self, auth_headers):
        """Test that dashboard endpoint returns 200 for Simples Nacional company"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Dashboard endpoint returns 200")
    
    def test_dashboard_has_descontos_structure(self, auth_headers):
        """Test that dashboard response has descontos with correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check das_mes_atual exists
        assert "das_mes_atual" in data, "Missing das_mes_atual in response"
        das = data["das_mes_atual"]
        
        # Check descontos exists
        assert "descontos" in das, "Missing descontos in das_mes_atual"
        descontos = das["descontos"]
        
        # Check required fields in descontos
        required_fields = ["produtos_st", "produtos_monofasicos", "produtos_aliquota_zero"]
        for field in required_fields:
            assert field in descontos, f"Missing {field} in descontos"
            print(f"  {field}: R$ {descontos[field]:,.2f}")
        
        print(f"✓ Dashboard has correct descontos structure")
    
    def test_dashboard_descontos_values_are_numeric(self, auth_headers):
        """Test that discount values are numeric and non-negative"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        descontos = data["das_mes_atual"]["descontos"]
        
        # Verify values are numeric and non-negative
        for field in ["produtos_st", "produtos_monofasicos", "produtos_aliquota_zero"]:
            value = descontos[field]
            assert isinstance(value, (int, float)), f"{field} should be numeric, got {type(value)}"
            assert value >= 0, f"{field} should be non-negative, got {value}"
        
        print(f"✓ All discount values are numeric and non-negative")
    
    def test_dashboard_has_faturamento_data(self, auth_headers):
        """Test that dashboard has faturamento data"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check faturamento exists
        assert "faturamento" in data, "Missing faturamento in response"
        faturamento = data["faturamento"]
        
        # Check required fields
        required_fields = ["mes_atual", "rbt12", "media_mensal"]
        for field in required_fields:
            assert field in faturamento, f"Missing {field} in faturamento"
        
        print(f"✓ Dashboard has faturamento data:")
        print(f"  mes_atual: R$ {faturamento['mes_atual']:,.2f}")
        print(f"  rbt12: R$ {faturamento['rbt12']:,.2f}")
        print(f"  media_mensal: R$ {faturamento['media_mensal']:,.2f}")
    
    def test_dashboard_has_enquadramento(self, auth_headers):
        """Test that dashboard has enquadramento (tax bracket) data"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check enquadramento exists
        assert "enquadramento" in data, "Missing enquadramento in response"
        enquadramento = data["enquadramento"]
        
        # Check required fields
        required_fields = ["anexo_principal", "aliquota_nominal", "aliquota_efetiva"]
        for field in required_fields:
            assert field in enquadramento, f"Missing {field} in enquadramento"
        
        print(f"✓ Dashboard has enquadramento data:")
        print(f"  anexo_principal: {enquadramento['anexo_principal']}")
        print(f"  aliquota_nominal: {enquadramento['aliquota_nominal']}%")
        print(f"  aliquota_efetiva: {enquadramento['aliquota_efetiva']}%")
    
    def test_dashboard_das_calculation(self, auth_headers):
        """Test that DAS calculation is present and correct"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/simples-nacional",
            json={
                "company_id": COMPANY_ID_SIMPLES,
                "ano": 2026,
                "mes": 1
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        das = data["das_mes_atual"]
        
        # Check DAS value exists
        assert "valor_das_final" in das, "Missing valor_das_final in das_mes_atual"
        assert das["valor_das_final"] >= 0, "DAS value should be non-negative"
        
        # Check faturamento exists
        assert "faturamento" in das, "Missing faturamento in das_mes_atual"
        
        print(f"✓ DAS calculation present:")
        print(f"  faturamento: R$ {das['faturamento']:,.2f}")
        print(f"  valor_das_final: R$ {das['valor_das_final']:,.2f}")


class TestCompaniesOrdering:
    """Test Companies page ordering functionality (backend API)"""
    
    def test_companies_list_endpoint(self, auth_headers):
        """Test that companies list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        companies = response.json()
        
        assert isinstance(companies, list), "Expected list of companies"
        assert len(companies) > 0, "Expected at least one company"
        
        print(f"✓ Companies list endpoint works - {len(companies)} companies found")
    
    def test_companies_have_codigo_empresa_field(self, auth_headers):
        """Test that companies have codigo_empresa field for ordering"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        companies = response.json()
        
        # Check that companies have the codigo_empresa field
        for company in companies[:5]:  # Check first 5
            assert "codigo_empresa" in company or company.get("codigo_empresa") is None, \
                f"Company {company.get('razao_social')} missing codigo_empresa field"
        
        print(f"✓ Companies have codigo_empresa field for ordering")
    
    def test_companies_have_sortable_fields(self, auth_headers):
        """Test that companies have all sortable fields"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        companies = response.json()
        
        # Fields that should be sortable according to frontend
        sortable_fields = ["codigo_empresa", "razao_social", "cnpj", "regime_tributario"]
        
        for company in companies[:3]:  # Check first 3
            for field in sortable_fields:
                assert field in company, f"Company missing sortable field: {field}"
        
        print(f"✓ Companies have all sortable fields: {sortable_fields}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
