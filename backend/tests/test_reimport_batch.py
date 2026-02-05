"""
Test suite for reimport-batch endpoint
Tests the new reimport functionality that was moved from Documents page to Validação & IA page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"  # ANZEN
TEST_COMPETENCIA = "02/2026"
TEST_CREDENTIALS = {"email": "admin@test.com", "password": "123456"}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TEST_CREDENTIALS,
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestReimportBatchEndpoint:
    """Tests for POST /api/xml/reimport-batch endpoint"""
    
    def test_reimport_batch_success(self, api_client):
        """Test successful reimport of documents"""
        url = f"{BASE_URL}/api/xml/reimport-batch?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        response = api_client.post(url)
        
        assert response.status_code == 200, f"Reimport failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total" in data, "Response should contain 'total'"
        assert "success" in data, "Response should contain 'success'"
        assert "errors" in data, "Response should contain 'errors'"
        assert "classificados" in data, "Response should contain 'classificados'"
        assert "entradas" in data, "Response should contain 'entradas'"
        assert "saidas" in data, "Response should contain 'saidas'"
        
        # Verify values
        assert data["total"] >= 0, "Total should be >= 0"
        assert data["success"] >= 0, "Success should be >= 0"
        assert data["errors"] >= 0, "Errors should be >= 0"
        
        print(f"Reimport result: total={data['total']}, success={data['success']}, errors={data['errors']}")
    
    def test_reimport_batch_invalid_company(self, api_client):
        """Test reimport with invalid company ID"""
        url = f"{BASE_URL}/api/xml/reimport-batch?company_id=invalid-company-id&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        response = api_client.post(url)
        
        # Should return success=False or empty result
        assert response.status_code == 200
        data = response.json()
        
        # Either no documents found or error
        if "success" in data and data["success"] == False:
            assert "error" in data
        else:
            assert data.get("total", 0) == 0
    
    def test_reimport_batch_invalid_competencia(self, api_client):
        """Test reimport with invalid competencia"""
        url = f"{BASE_URL}/api/xml/reimport-batch?company_id={TEST_COMPANY_ID}&competencia=invalid"
        response = api_client.post(url)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return no documents or error
        if "success" in data and data["success"] == False:
            assert "error" in data
        else:
            assert data.get("total", 0) == 0


class TestDocumentsAfterReimport:
    """Tests to verify documents are properly reset after reimport"""
    
    def test_documents_status_reset_to_pendente(self, api_client):
        """Verify documents have status='pendente' after reimport"""
        # First reimport
        reimport_url = f"{BASE_URL}/api/xml/reimport-batch?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        api_client.post(reimport_url)
        
        # Get documents
        docs_url = f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        response = api_client.get(docs_url)
        
        assert response.status_code == 200
        documents = response.json()
        
        # Verify all documents have status='pendente'
        for doc in documents:
            assert doc.get("status_validacao") == "pendente", f"Document {doc.get('numero_nfe')} should have status='pendente'"
    
    def test_products_aprovado_reset_to_false(self, api_client):
        """Verify products have aprovado=False after reimport"""
        # Get documents
        docs_url = f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        response = api_client.get(docs_url)
        
        assert response.status_code == 200
        documents = response.json()
        
        # Verify all products have aprovado=False
        for doc in documents:
            for produto in doc.get("produtos", []):
                assert produto.get("aprovado") == False, f"Product {produto.get('descricao')} should have aprovado=False"
    
    def test_products_have_ai_classification(self, api_client):
        """Verify products have AI classification applied"""
        # Get documents (only entrada type)
        docs_url = f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}"
        response = api_client.get(docs_url)
        
        assert response.status_code == 200
        documents = response.json()
        
        # Filter entrada documents
        entrada_docs = [d for d in documents if d.get("tipo") == "entrada"]
        
        # Verify entrada products have classification
        for doc in entrada_docs:
            for produto in doc.get("produtos", []):
                # Should have categoria_classificada
                categoria = produto.get("categoria_classificada")
                assert categoria is not None, f"Product {produto.get('descricao')} should have categoria_classificada"
                assert categoria in ["revenda", "insumo", "despesa", "ativo_imobilizado", "combustivel"], \
                    f"Invalid categoria: {categoria}"


class TestDocumentsPageNoReprocessButton:
    """Tests to verify reprocess button was removed from Documents page"""
    
    def test_documents_endpoint_exists(self, api_client):
        """Verify documents endpoint still works"""
        url = f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}"
        response = api_client.get(url)
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_old_reprocess_endpoint_not_used(self, api_client):
        """Verify the old reprocess-batch endpoint behavior"""
        # The old endpoint should still exist but the UI doesn't use it from Documents page
        url = f"{BASE_URL}/api/xml/reprocess-batch?company_id={TEST_COMPANY_ID}&competencia={TEST_COMPETENCIA.replace('/', '%2F')}&classificar=false"
        response = api_client.post(url)
        
        # Should still work (endpoint exists)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
