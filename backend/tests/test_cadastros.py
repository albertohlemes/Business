"""
Test suite for Cadastros page - GClick and SCI Único integration
Tests the /api/gclick/cadastrar-direto endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCadastrosGClick:
    """Tests for GClick direct registration endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teste@teste.com",
            "password": "teste123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_gclick_endpoint_exists(self):
        """Test that the GClick cadastrar-direto endpoint exists"""
        # Send minimal data to check endpoint exists
        response = self.session.post(f"{BASE_URL}/api/gclick/cadastrar-direto", json={
            "nome": "TEST EMPRESA LTDA",
            "cpf_cnpj": "12.345.678/0001-90"
        })
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Endpoint /api/gclick/cadastrar-direto not found"
        print(f"Endpoint exists - Status: {response.status_code}")
    
    def test_gclick_cadastro_direto_with_valid_data(self):
        """Test GClick registration with valid company data"""
        payload = {
            "nome": "TEST EMPRESA CADASTRO DIRETO LTDA",
            "nome_fantasia": "TEST EMPRESA",
            "cpf_cnpj": "12.345.678/0001-90",
            "inscricao_estadual": "123.456.789.000",
            "inscricao_municipal": "12345678",
            "endereco": "Rua Teste, 123",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "telefone": "(11) 99999-9999",
            "email": "teste@empresa.com",
            "observacoes": "Empresa de teste para cadastro direto"
        }
        
        response = self.session.post(f"{BASE_URL}/api/gclick/cadastrar-direto", json=payload)
        
        # The endpoint should respond (even if GClick returns 401 due to invalid credentials)
        assert response.status_code in [200, 401, 500], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        print(f"Response: {data}")
        
        # If success=False due to GClick auth, that's expected
        if response.status_code == 200:
            assert "success" in data, "Response should contain 'success' field"
            # GClick may return 401 but our endpoint should handle it gracefully
            if not data.get("success"):
                assert "message" in data or "error" in data, "Error response should have message"
                print(f"GClick returned error (expected): {data.get('message', data.get('error'))}")
    
    def test_gclick_cadastro_without_auth(self):
        """Test that endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/gclick/cadastrar-direto", json={
            "nome": "TEST EMPRESA",
            "cpf_cnpj": "12.345.678/0001-90"
        })
        
        # Should return 401 or 403 without authentication
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly requires authentication - Status: {response.status_code}")
    
    def test_gclick_cadastro_with_minimal_data(self):
        """Test GClick registration with minimal required data"""
        payload = {
            "nome": "MINIMAL TEST EMPRESA",
            "cpf_cnpj": "98.765.432/0001-10"
        }
        
        response = self.session.post(f"{BASE_URL}/api/gclick/cadastrar-direto", json=payload)
        
        # Should not fail with 422 (validation error) for minimal data
        assert response.status_code != 422, "Minimal data should be accepted"
        print(f"Minimal data accepted - Status: {response.status_code}")
    
    def test_gclick_cadastro_with_cpf(self):
        """Test GClick registration with CPF (pessoa física)"""
        payload = {
            "nome": "PESSOA FISICA TESTE",
            "cpf_cnpj": "123.456.789-00"
        }
        
        response = self.session.post(f"{BASE_URL}/api/gclick/cadastrar-direto", json=payload)
        
        # Should handle CPF (pessoa física) correctly
        assert response.status_code != 422, "CPF should be accepted"
        print(f"CPF accepted - Status: {response.status_code}")


class TestAuthEndpoint:
    """Tests for authentication endpoint"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teste@teste.com",
            "password": "teste123"
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user info"
        print(f"Login successful - User: {data['user'].get('email')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code in [401, 400], f"Expected 401/400 for invalid credentials, got {response.status_code}"
        print(f"Invalid credentials correctly rejected - Status: {response.status_code}")


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", "Health status should be 'healthy'"
        print(f"Health check passed - Status: {data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
