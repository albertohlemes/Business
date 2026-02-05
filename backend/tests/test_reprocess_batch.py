"""
Test suite for Re-processar e Classificar feature (iteration 19)
Tests the /api/xml/reprocess-batch endpoint with classificar=true and classificar=false
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Test company and competencia
COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"  # ANZEN
COMPETENCIA = "02/2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestReprocessBatchEndpoint:
    """Tests for POST /api/xml/reprocess-batch endpoint"""
    
    def test_reprocess_batch_without_classification(self, api_client):
        """Test reprocess-batch with classificar=false (quick reprocess)"""
        response = api_client.post(
            f"{BASE_URL}/api/xml/reprocess-batch",
            params={
                "company_id": COMPANY_ID,
                "competencia": COMPETENCIA,
                "classificar": "false"
            }
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "total" in data, "Response should contain 'total' field"
        assert "success" in data, "Response should contain 'success' field"
        assert "errors" in data, "Response should contain 'errors' field"
        
        # Verify counts
        assert data["total"] > 0, "Should have documents to process"
        assert data["success"] >= 0, "Success count should be non-negative"
        assert data["errors"] >= 0, "Errors count should be non-negative"
        
        # Verify classificacoes_novas is 0 when classificar=false
        assert data.get("classificacoes_novas", 0) == 0, "Should not have new classifications when classificar=false"
        
        print(f"SUCCESS: Reprocess without classification - Total: {data['total']}, Success: {data['success']}, Errors: {data['errors']}")
    
    def test_reprocess_batch_with_classification(self, api_client):
        """Test reprocess-batch with classificar=true (AI classification)"""
        response = api_client.post(
            f"{BASE_URL}/api/xml/reprocess-batch",
            params={
                "company_id": COMPANY_ID,
                "competencia": COMPETENCIA,
                "classificar": "true"
            }
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "total" in data, "Response should contain 'total' field"
        assert "success" in data, "Response should contain 'success' field"
        assert "errors" in data, "Response should contain 'errors' field"
        assert "classificacoes_novas" in data, "Response should contain 'classificacoes_novas' field"
        assert "classificacoes_preservadas" in data, "Response should contain 'classificacoes_preservadas' field"
        
        # Verify counts
        assert data["total"] > 0, "Should have documents to process"
        assert data["success"] >= 0, "Success count should be non-negative"
        
        # Verify classification counts are present
        assert isinstance(data["classificacoes_novas"], int), "classificacoes_novas should be integer"
        assert isinstance(data["classificacoes_preservadas"], int), "classificacoes_preservadas should be integer"
        
        print(f"SUCCESS: Reprocess with AI classification - Total: {data['total']}, Success: {data['success']}")
        print(f"  - New classifications: {data['classificacoes_novas']}")
        print(f"  - Preserved classifications: {data['classificacoes_preservadas']}")
    
    def test_reprocess_batch_invalid_company(self, api_client):
        """Test reprocess-batch with invalid company_id"""
        response = api_client.post(
            f"{BASE_URL}/api/xml/reprocess-batch",
            params={
                "company_id": "invalid-company-id",
                "competencia": COMPETENCIA,
                "classificar": "false"
            }
        )
        
        # Should return 200 with error message or empty result
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Either no documents found or error
        if "error" in data:
            assert "Nenhum documento encontrado" in data["error"] or "não encontrada" in data["error"].lower()
            print(f"SUCCESS: Invalid company returns error: {data['error']}")
        else:
            assert data.get("total", 0) == 0, "Should have 0 documents for invalid company"
            print("SUCCESS: Invalid company returns 0 documents")
    
    def test_reprocess_batch_invalid_competencia(self, api_client):
        """Test reprocess-batch with invalid competencia"""
        response = api_client.post(
            f"{BASE_URL}/api/xml/reprocess-batch",
            params={
                "company_id": COMPANY_ID,
                "competencia": "99/9999",  # Invalid competencia
                "classificar": "false"
            }
        )
        
        # Should return 200 with error or empty result
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        if "error" in data:
            print(f"SUCCESS: Invalid competencia returns error: {data['error']}")
        else:
            assert data.get("total", 0) == 0, "Should have 0 documents for invalid competencia"
            print("SUCCESS: Invalid competencia returns 0 documents")


class TestDocumentsEndpoint:
    """Tests for GET /api/xml/documents endpoint"""
    
    def test_get_documents_for_company(self, api_client):
        """Test getting documents for a specific company"""
        response = api_client.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Filter by competencia
        docs_competencia = [d for d in data if d.get("competencia") == COMPETENCIA]
        print(f"SUCCESS: Found {len(data)} total documents, {len(docs_competencia)} for competencia {COMPETENCIA}")
        
        # Verify document structure
        if docs_competencia:
            doc = docs_competencia[0]
            assert "id" in doc, "Document should have 'id'"
            assert "numero_nfe" in doc, "Document should have 'numero_nfe'"
            assert "company_id" in doc, "Document should have 'company_id'"
            assert "competencia" in doc, "Document should have 'competencia'"
            assert "valor_total" in doc, "Document should have 'valor_total'"
            print(f"  - Sample document: NF-e {doc['numero_nfe']}, Valor: R$ {doc['valor_total']:.2f}")


class TestDocumentDetailEndpoint:
    """Tests for GET /api/xml/documents/{document_id} endpoint"""
    
    def test_get_document_detail(self, api_client):
        """Test getting document detail with products"""
        # First get list of documents
        response = api_client.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": COMPANY_ID}
        )
        assert response.status_code == 200
        
        docs = response.json()
        docs_competencia = [d for d in docs if d.get("competencia") == COMPETENCIA]
        
        if not docs_competencia:
            pytest.skip("No documents found for testing")
        
        doc_id = docs_competencia[0]["id"]
        
        # Get document detail
        response = api_client.get(f"{BASE_URL}/api/xml/documents/{doc_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Document should have 'id'"
        assert "produtos" in data, "Document should have 'produtos'"
        
        # Verify products have required fields
        if data["produtos"]:
            prod = data["produtos"][0]
            assert "codigo" in prod, "Product should have 'codigo'"
            assert "descricao" in prod, "Product should have 'descricao'"
            assert "ncm" in prod, "Product should have 'ncm'"
            assert "cfop" in prod, "Product should have 'cfop'"
            
            print(f"SUCCESS: Document {data['numero_nfe']} has {len(data['produtos'])} products")
            print(f"  - Sample product: {prod['descricao'][:50]}...")


class TestLoginEndpoint:
    """Tests for POST /api/auth/login endpoint"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == TEST_EMAIL, "User email should match"
        
        print(f"SUCCESS: Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid credentials return 401")


class TestCompaniesEndpoint:
    """Tests for GET /api/companies endpoint"""
    
    def test_get_companies(self, api_client):
        """Test getting list of companies"""
        response = api_client.get(f"{BASE_URL}/api/companies")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Find ANZEN company
        anzen = next((c for c in data if c.get("id") == COMPANY_ID), None)
        assert anzen is not None, f"ANZEN company (ID: {COMPANY_ID}) should exist"
        
        print(f"SUCCESS: Found {len(data)} companies")
        print(f"  - ANZEN: {anzen.get('razao_social', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
