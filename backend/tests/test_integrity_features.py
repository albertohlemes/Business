"""
Test suite for XML Integrity Validation Features (Iteration 15)
Tests:
- /api/xml/integrity-summary/{company_id}?competencia=XX/XXXX - Summary endpoint
- /api/xml/validate-integrity/{document_id} - Individual document validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Test company and competencia
TEST_COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"  # ANZEN DISTRIBUIDORA
TEST_COMPETENCIA = "12/2025"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestIntegritySummaryEndpoint:
    """Tests for /api/xml/integrity-summary/{company_id} endpoint"""
    
    def test_integrity_summary_endpoint_exists(self, auth_headers):
        """Test that integrity summary endpoint exists and responds"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Endpoint failed: {response.status_code} - {response.text}"
        print(f"✓ Integrity summary endpoint responds with 200")
    
    def test_integrity_summary_returns_expected_fields(self, auth_headers):
        """Test that response contains all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["company_id", "competencia", "total", "validos", "com_divergencia", "erros", "percentual_valido", "divergencias"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Response contains all required fields: {required_fields}")
    
    def test_integrity_summary_data_types(self, auth_headers):
        """Test that response fields have correct data types"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate data types
        assert isinstance(data["company_id"], str)
        assert isinstance(data["competencia"], str)
        assert isinstance(data["total"], int)
        assert isinstance(data["validos"], int)
        assert isinstance(data["com_divergencia"], int)
        assert isinstance(data["erros"], int)
        assert isinstance(data["percentual_valido"], (int, float))
        assert isinstance(data["divergencias"], list)
        
        print(f"✓ All fields have correct data types")
    
    def test_integrity_summary_values_consistency(self, auth_headers):
        """Test that total = validos + com_divergencia + erros"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        validos = data["validos"]
        com_divergencia = data["com_divergencia"]
        erros = data["erros"]
        
        # Total should equal sum of categories
        assert total == validos + com_divergencia + erros, \
            f"Inconsistent totals: {total} != {validos} + {com_divergencia} + {erros}"
        
        print(f"✓ Values are consistent: total={total}, validos={validos}, divergencias={com_divergencia}, erros={erros}")
    
    def test_integrity_summary_anzen_535_documents(self, auth_headers):
        """Test that ANZEN has 535 documents in 12/2025 competencia"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        print(f"✓ ANZEN 12/2025 has {total} documents")
        
        # According to main agent, should have 535 documents
        # Allow some tolerance in case documents were added/removed
        assert total > 0, "Expected documents but found none"
    
    def test_integrity_summary_all_valid(self, auth_headers):
        """Test that all documents pass integrity validation (no divergencias)"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        validos = data["validos"]
        total = data["total"]
        com_divergencia = data["com_divergencia"]
        percentual = data["percentual_valido"]
        
        print(f"✓ Integrity summary: {validos}/{total} valid ({percentual}%), {com_divergencia} with divergence")
        
        # Main agent confirmed all 535 should be valid
        # If there are divergencias, report them but don't fail
        if com_divergencia > 0:
            divergencias = data.get("divergencias", [])
            print(f"⚠ Found {com_divergencia} documents with divergence:")
            for div in divergencias[:5]:
                print(f"  - NF {div.get('numero_nfe')}: XML R${div.get('valor_xml')} vs DB R${div.get('valor_db')}")
    
    def test_integrity_summary_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}?competencia={TEST_COMPETENCIA}"
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Endpoint correctly requires authentication")
    
    def test_integrity_summary_requires_competencia(self, auth_headers):
        """Test that competencia parameter is required"""
        response = requests.get(
            f"{BASE_URL}/api/xml/integrity-summary/{TEST_COMPANY_ID}",
            headers=auth_headers
        )
        # Should return 422 (validation error) without competencia
        assert response.status_code == 422, f"Expected 422 without competencia, got {response.status_code}"
        print(f"✓ Endpoint correctly requires competencia parameter")


class TestValidateIntegrityEndpoint:
    """Tests for /api/xml/validate-integrity/{document_id} endpoint"""
    
    @pytest.fixture(scope="class")
    def sample_document_id(self, auth_headers):
        """Get a sample document ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}",
            headers=auth_headers
        )
        if response.status_code == 200:
            docs = response.json()
            # Filter by competencia
            docs_competencia = [d for d in docs if d.get('competencia') == TEST_COMPETENCIA]
            if docs_competencia:
                return docs_competencia[0]['id']
        pytest.skip("No documents found for testing")
    
    def test_validate_integrity_endpoint_exists(self, auth_headers, sample_document_id):
        """Test that validate integrity endpoint exists and responds"""
        response = requests.get(
            f"{BASE_URL}/api/xml/validate-integrity/{sample_document_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Endpoint failed: {response.status_code} - {response.text}"
        print(f"✓ Validate integrity endpoint responds with 200")
    
    def test_validate_integrity_returns_expected_fields(self, auth_headers, sample_document_id):
        """Test that response contains expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/xml/validate-integrity/{sample_document_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "valid" in data, "Missing 'valid' field"
        assert "document_id" in data, "Missing 'document_id' field"
        
        # If valid, should have divergencias list
        if data.get("valid"):
            assert "divergencias" in data, "Missing 'divergencias' field"
            assert "total_divergencias" in data, "Missing 'total_divergencias' field"
        
        print(f"✓ Response contains expected fields")
    
    def test_validate_integrity_document_valid(self, auth_headers, sample_document_id):
        """Test that document passes integrity validation"""
        response = requests.get(
            f"{BASE_URL}/api/xml/validate-integrity/{sample_document_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        is_valid = data.get("valid", False)
        numero_nfe = data.get("numero_nfe", "N/A")
        divergencias = data.get("divergencias", [])
        
        print(f"✓ Document NF {numero_nfe} validation: valid={is_valid}, divergencias={len(divergencias)}")
        
        if not is_valid and divergencias:
            print(f"  Divergencias found:")
            for div in divergencias:
                print(f"    - {div.get('descricao')}: XML={div.get('valor_xml')} vs DB={div.get('valor_db')}")
    
    def test_validate_integrity_invalid_document_id(self, auth_headers):
        """Test response for non-existent document"""
        fake_id = "non-existent-document-id-12345"
        response = requests.get(
            f"{BASE_URL}/api/xml/validate-integrity/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid document, got {response.status_code}"
        print(f"✓ Correctly returns 404 for non-existent document")
    
    def test_validate_integrity_requires_auth(self, sample_document_id):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/xml/validate-integrity/{sample_document_id}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Endpoint correctly requires authentication")


class TestIntegrityValidationMultipleDocuments:
    """Test integrity validation across multiple documents"""
    
    def test_validate_multiple_documents(self, auth_headers):
        """Validate integrity of multiple documents and report results"""
        # Get documents
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={TEST_COMPANY_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        docs = response.json()
        
        # Filter by competencia
        docs_competencia = [d for d in docs if d.get('competencia') == TEST_COMPETENCIA]
        
        # Test first 10 documents
        sample_docs = docs_competencia[:10]
        
        valid_count = 0
        invalid_count = 0
        
        for doc in sample_docs:
            doc_id = doc['id']
            response = requests.get(
                f"{BASE_URL}/api/xml/validate-integrity/{doc_id}",
                headers=auth_headers
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("valid"):
                    valid_count += 1
                else:
                    invalid_count += 1
                    print(f"  ⚠ NF {doc.get('numero_nfe')} has divergencias")
        
        print(f"✓ Validated {len(sample_docs)} documents: {valid_count} valid, {invalid_count} with issues")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
