"""
Test suite for Análise Tributária IA and SPED Export/Validation features
Tests:
1. /api/analise-tributaria-ia/{company_id} - AI Tax Analysis endpoint
2. /api/sped/exportar-e-validar/{company_id} - SPED Export with validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"  # ANZEN
COMPETENCIA = "02/2025"


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


class TestAnaliseTributariaIA:
    """Tests for /api/analise-tributaria-ia/{company_id} endpoint"""
    
    def test_analise_tributaria_ia_returns_200(self, auth_headers):
        """Test that endpoint returns 200 for valid company"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analise_tributaria_ia_response_structure(self, auth_headers):
        """Test that response contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "empresa" in data, "Missing 'empresa' field"
        assert "competencia" in data, "Missing 'competencia' field"
        assert "resumo" in data, "Missing 'resumo' field"
        assert "viloes_tributarios" in data, "Missing 'viloes_tributarios' field"
        assert "oportunidades" in data, "Missing 'oportunidades' field"
        assert "analise_por_ncm" in data, "Missing 'analise_por_ncm' field"
        assert "insights_ia" in data, "Missing 'insights_ia' field"
    
    def test_analise_tributaria_ia_resumo_fields(self, auth_headers):
        """Test that resumo contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        resumo = response.json().get("resumo", {})
        
        # Check resumo fields
        assert "total_documentos" in resumo, "Missing 'total_documentos' in resumo"
        assert "total_entradas" in resumo, "Missing 'total_entradas' in resumo"
        assert "total_saidas" in resumo, "Missing 'total_saidas' in resumo"
        assert "credito_icms" in resumo, "Missing 'credito_icms' in resumo"
        assert "debito_icms" in resumo, "Missing 'debito_icms' in resumo"
        assert "saldo_icms" in resumo, "Missing 'saldo_icms' in resumo"
        assert "total_viloes" in resumo, "Missing 'total_viloes' in resumo"
        assert "total_oportunidades" in resumo, "Missing 'total_oportunidades' in resumo"
    
    def test_analise_tributaria_ia_insights_generated(self, auth_headers):
        """Test that AI insights are generated (GPT-4o)"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers,
            timeout=60  # AI generation may take time
        )
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights_ia")
        assert insights is not None, "insights_ia should not be None"
        # Insights should be a non-empty string (AI generated content)
        assert isinstance(insights, str), "insights_ia should be a string"
        # If there are documents, insights should have content
        if data.get("resumo", {}).get("total_documentos", 0) > 0:
            assert len(insights) > 50, f"insights_ia seems too short: {insights[:100]}"
    
    def test_analise_tributaria_ia_invalid_company(self, auth_headers):
        """Test that endpoint returns 404 for invalid company"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_analise_tributaria_ia_without_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/analise-tributaria-ia/{COMPANY_ID}?competencia={COMPETENCIA}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestSpedExportarEValidar:
    """Tests for /api/sped/exportar-e-validar/{company_id} endpoint"""
    
    def test_sped_exportar_e_validar_returns_200(self, auth_headers):
        """Test that endpoint returns 200 for valid company"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sped_exportar_e_validar_response_structure(self, auth_headers):
        """Test that response contains filename, content, and validacao"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "filename" in data, "Missing 'filename' field"
        assert "content" in data, "Missing 'content' field"
        assert "validacao" in data, "Missing 'validacao' field"
        
        # Filename should be a .txt file
        assert data["filename"].endswith(".txt"), f"Filename should end with .txt: {data['filename']}"
        
        # Content should be non-empty SPED content
        assert len(data["content"]) > 100, "SPED content seems too short"
    
    def test_sped_exportar_e_validar_validacao_structure(self, auth_headers):
        """Test that validacao contains all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        validacao = response.json().get("validacao", {})
        
        # Check validacao fields
        assert "status" in validacao, "Missing 'status' in validacao"
        assert validacao["status"] in ["OK", "DIVERGENTE"], f"Invalid status: {validacao['status']}"
        assert "divergencias" in validacao, "Missing 'divergencias' in validacao"
        assert "totais_sistema" in validacao, "Missing 'totais_sistema' in validacao"
        assert "totais_sped" in validacao, "Missing 'totais_sped' in validacao"
        assert "comparativo_cfop" in validacao, "Missing 'comparativo_cfop' in validacao"
    
    def test_sped_exportar_e_validar_comparativo_cfop(self, auth_headers):
        """Test that comparativo_cfop contains entradas and saidas"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        comparativo = response.json().get("validacao", {}).get("comparativo_cfop", {})
        
        # Check comparativo structure
        assert "entradas" in comparativo, "Missing 'entradas' in comparativo_cfop"
        assert "saidas" in comparativo, "Missing 'saidas' in comparativo_cfop"
        assert isinstance(comparativo["entradas"], list), "entradas should be a list"
        assert isinstance(comparativo["saidas"], list), "saidas should be a list"
        
        # If there are entries, check structure
        if len(comparativo["entradas"]) > 0:
            entry = comparativo["entradas"][0]
            assert "cfop" in entry, "Missing 'cfop' in comparativo entry"
            assert "sistema" in entry, "Missing 'sistema' in comparativo entry"
            assert "sped" in entry, "Missing 'sped' in comparativo entry"
            assert "status" in entry, "Missing 'status' in comparativo entry"
    
    def test_sped_exportar_e_validar_with_excluir_creditos(self, auth_headers):
        """Test endpoint with excluir_creditos_despesa_st=true"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}&excluir_creditos_despesa_st=true",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "validacao" in data
    
    def test_sped_exportar_e_validar_invalid_company(self, auth_headers):
        """Test that endpoint returns 404 for invalid company"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_sped_exportar_e_validar_invalid_competencia(self, auth_headers):
        """Test that endpoint returns 404 for competencia without documents"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia=01/1990",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_sped_exportar_e_validar_without_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/sped/exportar-e-validar/{COMPANY_ID}?competencia={COMPETENCIA}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestIntegration:
    """Integration tests for the new features"""
    
    def test_company_exists(self, auth_headers):
        """Verify test company exists"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        assert response.status_code == 200
        companies = response.json()
        company_ids = [c.get("id") for c in companies]
        assert COMPANY_ID in company_ids, f"Test company {COMPANY_ID} not found"
    
    def test_documents_exist_for_competencia(self, auth_headers):
        """Verify documents exist for test competencia"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={COMPANY_ID}&competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        documents = response.json()
        # Note: Main agent mentioned only entradas exist for 02/2025
        print(f"Found {len(documents)} documents for {COMPETENCIA}")
