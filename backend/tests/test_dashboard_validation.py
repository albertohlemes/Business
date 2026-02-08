"""
Test suite for Dashboard Stats and Validation features
Tests the new dashboard endpoint and validation page filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tax-dashboard-11.preview.emergentagent.com')

# Test company ID (ANZEN)
ANZEN_COMPANY_ID = "e04975c4-b209-483f-b9bf-4e429a52fa74"
COMPETENCIA = "12/2025"

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
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardStats:
    """Tests for /api/dashboard/stats/{company_id} endpoint"""
    
    def test_dashboard_stats_endpoint_exists(self, auth_headers):
        """Test that dashboard stats endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
    
    def test_dashboard_stats_structure(self, auth_headers):
        """Test that dashboard stats returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check main sections exist
        assert "empresa" in data, "Missing 'empresa' section"
        assert "competencia" in data, "Missing 'competencia' field"
        assert "quantidades" in data, "Missing 'quantidades' section"
        assert "validacao" in data, "Missing 'validacao' section"
        assert "valores" in data, "Missing 'valores' section"
        assert "creditos" in data, "Missing 'creditos' section"
        assert "debitos" in data, "Missing 'debitos' section"
        assert "impostos_pagar" in data, "Missing 'impostos_pagar' section"
        assert "indicadores" in data, "Missing 'indicadores' section"
    
    def test_dashboard_quantidades_by_type(self, auth_headers):
        """Test that quantidades includes all document types"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        quantidades = data["quantidades"]
        
        # Check all document type counts exist
        assert "nfe_entrada" in quantidades, "Missing 'nfe_entrada' count"
        assert "nfe_saida" in quantidades, "Missing 'nfe_saida' count"
        assert "nfce" in quantidades, "Missing 'nfce' count"
        assert "nfse" in quantidades, "Missing 'nfse' count"
        assert "total_documentos" in quantidades, "Missing 'total_documentos' count"
        
        # Verify counts are integers
        assert isinstance(quantidades["nfe_entrada"], int)
        assert isinstance(quantidades["nfe_saida"], int)
        assert isinstance(quantidades["nfce"], int)
        assert isinstance(quantidades["nfse"], int)
        
        # Verify ANZEN has 109 entrada and 10 saida
        assert quantidades["nfe_entrada"] == 109, f"Expected 109 entrada, got {quantidades['nfe_entrada']}"
        assert quantidades["nfe_saida"] == 10, f"Expected 10 saida, got {quantidades['nfe_saida']}"
    
    def test_dashboard_valores(self, auth_headers):
        """Test that valores section has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        valores = data["valores"]
        
        # Check all value fields exist
        assert "total_entradas" in valores, "Missing 'total_entradas'"
        assert "total_vendas" in valores, "Missing 'total_vendas'"
        assert "total_cupons" in valores, "Missing 'total_cupons'"
        assert "total_servicos" in valores, "Missing 'total_servicos'"
        assert "faturamento_total" in valores, "Missing 'faturamento_total'"
        
        # Verify values are numbers
        assert isinstance(valores["total_entradas"], (int, float))
        assert isinstance(valores["faturamento_total"], (int, float))
    
    def test_dashboard_impostos(self, auth_headers):
        """Test that impostos sections have ICMS, PIS, COFINS, ISS"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check creditos
        creditos = data["creditos"]
        assert "icms" in creditos, "Missing 'icms' in creditos"
        assert "pis" in creditos, "Missing 'pis' in creditos"
        assert "cofins" in creditos, "Missing 'cofins' in creditos"
        
        # Check debitos
        debitos = data["debitos"]
        assert "icms" in debitos, "Missing 'icms' in debitos"
        assert "pis" in debitos, "Missing 'pis' in debitos"
        assert "cofins" in debitos, "Missing 'cofins' in debitos"
        assert "iss" in debitos, "Missing 'iss' in debitos"
        
        # Check impostos_pagar
        impostos_pagar = data["impostos_pagar"]
        assert "icms" in impostos_pagar, "Missing 'icms' in impostos_pagar"
        assert "pis" in impostos_pagar, "Missing 'pis' in impostos_pagar"
        assert "cofins" in impostos_pagar, "Missing 'cofins' in impostos_pagar"
        assert "iss" in impostos_pagar, "Missing 'iss' in impostos_pagar"
        assert "total" in impostos_pagar, "Missing 'total' in impostos_pagar"
    
    def test_dashboard_markup_indicator(self, auth_headers):
        """Test that markup indicator is calculated"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{ANZEN_COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        data = response.json()
        indicadores = data["indicadores"]
        
        assert "markup_percentual" in indicadores, "Missing 'markup_percentual'"
        assert isinstance(indicadores["markup_percentual"], (int, float))
    
    def test_dashboard_stats_invalid_company(self, auth_headers):
        """Test that invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/invalid-company-id?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestValidationFiltering:
    """Tests for validation page - only entrada documents"""
    
    def test_documents_endpoint_returns_entrada_and_saida(self, auth_headers):
        """Test that documents endpoint returns both entrada and saida"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        documents = response.json()
        
        # Count by tipo
        entrada_count = sum(1 for d in documents if d.get("tipo") == "entrada")
        saida_count = sum(1 for d in documents if d.get("tipo") == "saida")
        
        assert entrada_count == 109, f"Expected 109 entrada, got {entrada_count}"
        assert saida_count == 10, f"Expected 10 saida, got {saida_count}"
    
    def test_documents_have_produtos(self, auth_headers):
        """Test that documents have produtos array"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia={COMPETENCIA}",
            headers=auth_headers
        )
        documents = response.json()
        
        # Check first entrada document has produtos
        entrada_docs = [d for d in documents if d.get("tipo") == "entrada"]
        assert len(entrada_docs) > 0, "No entrada documents found"
        
        first_doc = entrada_docs[0]
        assert "produtos" in first_doc, "Document missing 'produtos' array"


class TestXMLTypeDetection:
    """Tests for XML type detection (NF-e, NFC-e, NFS-e)"""
    
    def test_documents_have_modelo_field(self, auth_headers):
        """Test that documents have modelo field for type detection"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia={COMPETENCIA}",
            headers=auth_headers
        )
        documents = response.json()
        
        # Check that documents have modelo field
        for doc in documents[:5]:  # Check first 5
            assert "modelo" in doc, f"Document {doc.get('id')} missing 'modelo' field"
            assert doc["modelo"] in ["nfe", "nfce", "nfse"], f"Invalid modelo: {doc['modelo']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
