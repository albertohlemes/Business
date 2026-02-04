"""
Test suite for WizardAlteracao backend APIs
Tests: /api/cnpj/{cnpj}, /api/minutas/{id}/extrair-dados, and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAlteracaoAPIs:
    """Test Alteração wizard backend APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and get auth token"""
        self.email = "teste@teste.com"
        self.password = "teste123"
        
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_cnpj_endpoint_valid_format(self):
        """Test /api/cnpj/{cnpj} endpoint with valid CNPJ format"""
        # Using a test CNPJ (Petrobras)
        cnpj = "33000167000101"
        response = requests.get(f"{BASE_URL}/api/cnpj/{cnpj}")
        
        # May return 200 (success), 429 (rate limit), or 404 (not found)
        assert response.status_code in [200, 429, 404, 504]
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "empresa" in data
            assert "cnaes" in data
            print(f"✓ CNPJ endpoint returned data for {cnpj}")
        elif response.status_code == 429:
            print("✓ CNPJ endpoint rate limited (expected behavior)")
        elif response.status_code == 504:
            print("✓ CNPJ endpoint timeout (external API slow)")
        else:
            print(f"✓ CNPJ endpoint returned {response.status_code}")
    
    def test_cnpj_endpoint_invalid_format(self):
        """Test /api/cnpj/{cnpj} with invalid CNPJ"""
        cnpj = "123"  # Invalid - too short
        response = requests.get(f"{BASE_URL}/api/cnpj/{cnpj}")
        assert response.status_code == 400
        print("✓ CNPJ endpoint correctly rejects invalid format")
    
    def test_cep_endpoint_valid(self):
        """Test /api/cep/{cep} endpoint"""
        cep = "01310100"  # Av. Paulista
        response = requests.get(f"{BASE_URL}/api/cep/{cep}")
        
        assert response.status_code in [200, 504]
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "endereco" in data
            endereco = data["endereco"]
            assert "logradouro" in endereco
            assert "cidade" in endereco
            print(f"✓ CEP endpoint returned: {endereco.get('logradouro')}, {endereco.get('cidade')}")
        else:
            print("✓ CEP endpoint timeout (external API slow)")
    
    def test_cep_endpoint_invalid(self):
        """Test /api/cep/{cep} with invalid CEP"""
        cep = "123"  # Invalid - too short
        response = requests.get(f"{BASE_URL}/api/cep/{cep}")
        assert response.status_code == 400
        print("✓ CEP endpoint correctly rejects invalid format")
    
    def test_minutas_list(self):
        """Test listing minutas"""
        response = requests.get(f"{BASE_URL}/api/minutas", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Minutas list returned {len(data)} items")
    
    def test_minuta_upload_without_file(self):
        """Test creating minuta without file (should work)"""
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=self.headers,
            data={
                "tipo_alteracao": "alteracao",
                "descricao": "Test alteração"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        self.minuta_id = data["id"]
        print(f"✓ Minuta created without file: {self.minuta_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{self.minuta_id}", headers=self.headers)
    
    def test_minuta_extrair_dados_no_file(self):
        """Test extrair-dados endpoint when no file is attached"""
        # First create a minuta without file
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=self.headers,
            data={
                "tipo_alteracao": "alteracao",
                "descricao": "Test"
            }
        )
        minuta_id = response.json()["id"]
        
        # Try to extract data (should fail - no file)
        response = requests.post(
            f"{BASE_URL}/api/minutas/{minuta_id}/extrair-dados",
            headers=self.headers
        )
        assert response.status_code == 400
        print("✓ Extrair-dados correctly requires file attachment")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=self.headers)
    
    def test_minuta_chat(self):
        """Test chat endpoint for minuta"""
        # Create minuta
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=self.headers,
            data={
                "tipo_alteracao": "alteracao",
                "descricao": "Test chat"
            }
        )
        minuta_id = response.json()["id"]
        
        # Send chat message
        response = requests.post(
            f"{BASE_URL}/api/minutas/{minuta_id}/chat",
            headers=self.headers,
            json={
                "message": "Olá, preciso de ajuda com alteração de endereço",
                "minuta_id": minuta_id
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print(f"✓ Chat endpoint working, response length: {len(data['response'])} chars")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=self.headers)
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "minutas" in data
        assert "licencas" in data
        assert "certificados" in data
        print(f"✓ Dashboard stats: {data['minutas']['total']} minutas, {data['licencas']['total']} licenças")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
