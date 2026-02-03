"""
Backend API Tests for Business Contabilidade - Sistema de Fechamento Fiscal
Tests: Authentication, Companies CRUD, CNPJ lookup, XML upload
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "test123"
TEST_NAME = "Test User"

# Shared state
auth_token = None
created_company_id = None


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_register_user(self):
        """Test user registration"""
        global auth_token
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "role": "admin"
        })
        print(f"Register response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["email"] == TEST_EMAIL
        assert data["role"] == "admin"
    
    def test_login_success(self):
        """Test successful login"""
        global auth_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        print(f"Login response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        auth_token = data["access_token"]
        print(f"Login successful, token obtained")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid login correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"Current user: {data['email']}")


class TestCNPJLookup:
    """CNPJ lookup endpoint tests"""
    
    def test_cnpj_lookup_valid(self):
        """Test CNPJ lookup with valid CNPJ (Petrobras)"""
        cnpj = "33000167000101"  # Petrobras CNPJ
        response = requests.get(f"{BASE_URL}/api/cnpj/{cnpj}")
        print(f"CNPJ lookup response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "razao_social" in data
        assert "cnpj" in data
        assert data["razao_social"] != ""
        
        print(f"CNPJ lookup result: {data.get('razao_social', 'N/A')}")
        print(f"CNAE: {data.get('cnae_principal', 'N/A')}")
        print(f"Cidade: {data.get('municipio', 'N/A')}/{data.get('uf', 'N/A')}")
    
    def test_cnpj_lookup_invalid(self):
        """Test CNPJ lookup with invalid CNPJ"""
        cnpj = "00000000000000"
        response = requests.get(f"{BASE_URL}/api/cnpj/{cnpj}")
        # Should return 404 or 500 for invalid CNPJ
        assert response.status_code in [404, 500]
        print(f"Invalid CNPJ correctly rejected: {response.status_code}")


class TestCompanies:
    """Company CRUD endpoint tests"""
    
    def test_create_company(self):
        """Test creating a new company"""
        global auth_token, created_company_id
        if not auth_token:
            pytest.skip("No auth token available")
        
        company_data = {
            "cnpj": f"TEST_{uuid.uuid4().hex[:8]}",  # Unique CNPJ for testing
            "razao_social": "TEST Empresa de Teste LTDA",
            "nome_fantasia": "Empresa Teste",
            "inscricao_estadual": "123456789",
            "endereco": "Rua Teste, 123",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234567",
            "cnae_principal": "4711302",
            "cnae_principal_descricao": "Comércio varejista",
            "produtos_comercializados": ["Calçados", "Roupas"],
            "insumos_producao": ["Couro", "Tecido"],
            "produtos_despesa": ["Material de Limpeza", "Escritório"]
        }
        
        response = requests.post(f"{BASE_URL}/api/companies", 
            json=company_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Create company response: {response.status_code} - {response.text[:200]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["razao_social"] == company_data["razao_social"]
        assert data["produtos_despesa"] == company_data["produtos_despesa"]
        
        created_company_id = data["id"]
        print(f"Company created with ID: {created_company_id}")
    
    def test_list_companies(self):
        """Test listing companies"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} companies")
    
    def test_get_company_by_id(self):
        """Test getting a specific company"""
        global auth_token, created_company_id
        if not auth_token or not created_company_id:
            pytest.skip("No auth token or company ID available")
        
        response = requests.get(f"{BASE_URL}/api/companies/{created_company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_company_id
        print(f"Retrieved company: {data['razao_social']}")
    
    def test_duplicate_cnpj_rejected(self):
        """Test that duplicate CNPJ is rejected"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        # Try to create company with same CNPJ
        company_data = {
            "cnpj": f"TEST_{uuid.uuid4().hex[:8]}",
            "razao_social": "Duplicate Test Company"
        }
        
        # First creation should succeed
        response1 = requests.post(f"{BASE_URL}/api/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response1.status_code == 200
        
        # Second creation with same CNPJ should fail
        response2 = requests.post(f"{BASE_URL}/api/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response2.status_code == 400
        print("Duplicate CNPJ correctly rejected")


class TestXMLDocuments:
    """XML document endpoint tests"""
    
    def test_list_documents(self):
        """Test listing XML documents"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/xml/documents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} XML documents")


class TestCFOPRules:
    """CFOP rules endpoint tests"""
    
    def test_list_cfop_rules(self):
        """Test listing CFOP rules"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/cfop/rules",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} CFOP rules")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_company(self):
        """Delete test company"""
        global auth_token, created_company_id
        if not auth_token or not created_company_id:
            pytest.skip("No auth token or company ID available")
        
        response = requests.delete(f"{BASE_URL}/api/companies/{created_company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # May fail if company has documents, which is OK
        print(f"Delete company response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
