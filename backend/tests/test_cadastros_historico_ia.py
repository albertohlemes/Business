"""
Test suite for Cadastros - Histórico, Extração IA, and SINTEGRA endpoints
Tests the new features:
- GET /api/cadastros/historico - Lista histórico de cadastros
- GET /api/cadastros/historico/{id} - Detalhe de um cadastro
- DELETE /api/cadastros/historico/{id} - Remove cadastro do histórico
- POST /api/cadastros/extrair-dados - Extrai dados de documento com IA
- POST /api/cadastros/salvar-sci - Salva cadastro SCI no histórico
- GET /api/sintegra/{uf}/{cnpj} - Consulta IE no SINTEGRA
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCadastrosHistorico:
    """Tests for Cadastros Histórico endpoints"""
    
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
    
    def test_historico_list_endpoint_exists(self):
        """Test that GET /api/cadastros/historico endpoint exists and returns list"""
        response = self.session.get(f"{BASE_URL}/api/cadastros/historico")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "cadastros" in data, "Response should contain 'cadastros' field"
        assert isinstance(data["cadastros"], list), "cadastros should be a list"
        print(f"Histórico endpoint works - Found {len(data['cadastros'])} cadastros")
    
    def test_historico_requires_auth(self):
        """Test that histórico endpoint requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/cadastros/historico")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly requires authentication - Status: {response.status_code}")
    
    def test_salvar_sci_and_verify_in_historico(self):
        """Test POST /api/cadastros/salvar-sci creates entry in histórico"""
        # Create SCI cadastro
        payload = {
            "razao_social": "TEST_EMPRESA SCI LTDA",
            "cnpj": "11.222.333/0001-44",
            "nome_fantasia": "TEST SCI",
            "inscricao_estadual": "123456789",
            "inscricao_municipal": "987654321",
            "regime_tributario": "simples",
            "data_abertura": "2024-01-15",
            "capital_social": "R$ 100.000,00",
            "endereco": "Rua Teste, 100",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "responsavel": "João Teste",
            "cpf_responsavel": "123.456.789-00",
            "telefone": "(11) 99999-9999",
            "email": "teste@sci.com"
        }
        
        response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        assert "id" in data, "Response should contain 'id'"
        
        cadastro_id = data["id"]
        print(f"SCI cadastro created with ID: {cadastro_id}")
        
        # Verify it appears in histórico
        historico_response = self.session.get(f"{BASE_URL}/api/cadastros/historico")
        assert historico_response.status_code == 200
        historico_data = historico_response.json()
        
        # Find the created cadastro
        found = False
        for cadastro in historico_data["cadastros"]:
            if cadastro.get("id") == cadastro_id:
                found = True
                assert cadastro.get("tipo") == "sci_unico", "Tipo should be 'sci_unico'"
                assert cadastro.get("dados_enviados", {}).get("razao_social") == "TEST_EMPRESA SCI LTDA"
                break
        
        assert found, f"Created cadastro {cadastro_id} not found in histórico"
        print(f"Cadastro verified in histórico")
        
        # Cleanup - delete the test cadastro
        delete_response = self.session.delete(f"{BASE_URL}/api/cadastros/historico/{cadastro_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        print(f"Test cadastro cleaned up")
    
    def test_historico_detail_endpoint(self):
        """Test GET /api/cadastros/historico/{id} returns cadastro details"""
        # First create a cadastro
        payload = {
            "razao_social": "TEST_DETAIL EMPRESA LTDA",
            "cnpj": "22.333.444/0001-55"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json=payload)
        assert create_response.status_code == 200
        cadastro_id = create_response.json()["id"]
        
        # Get detail
        detail_response = self.session.get(f"{BASE_URL}/api/cadastros/historico/{cadastro_id}")
        
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        data = detail_response.json()
        assert data.get("id") == cadastro_id, "ID should match"
        assert data.get("dados_enviados", {}).get("razao_social") == "TEST_DETAIL EMPRESA LTDA"
        print(f"Detail endpoint works - Cadastro: {data.get('dados_enviados', {}).get('razao_social')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/cadastros/historico/{cadastro_id}")
    
    def test_historico_detail_not_found(self):
        """Test GET /api/cadastros/historico/{id} returns 404 for non-existent ID"""
        response = self.session.get(f"{BASE_URL}/api/cadastros/historico/non-existent-id-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Correctly returns 404 for non-existent cadastro")
    
    def test_delete_historico_endpoint(self):
        """Test DELETE /api/cadastros/historico/{id} removes cadastro"""
        # Create a cadastro to delete
        payload = {
            "razao_social": "TEST_DELETE EMPRESA LTDA",
            "cnpj": "33.444.555/0001-66"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json=payload)
        assert create_response.status_code == 200
        cadastro_id = create_response.json()["id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/cadastros/historico/{cadastro_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        data = delete_response.json()
        assert "message" in data, "Response should contain message"
        print(f"Delete successful: {data.get('message')}")
        
        # Verify it's gone
        verify_response = self.session.get(f"{BASE_URL}/api/cadastros/historico/{cadastro_id}")
        assert verify_response.status_code == 404, "Deleted cadastro should return 404"
        print(f"Verified cadastro was deleted")
    
    def test_delete_historico_not_found(self):
        """Test DELETE /api/cadastros/historico/{id} returns 404 for non-existent ID"""
        response = self.session.delete(f"{BASE_URL}/api/cadastros/historico/non-existent-id-67890")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Correctly returns 404 for non-existent cadastro on delete")


class TestExtracaoIA:
    """Tests for AI data extraction endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teste@teste.com",
            "password": "teste123"
        }, headers={"Content-Type": "application/json"})
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_extrair_dados_endpoint_exists(self):
        """Test that POST /api/cadastros/extrair-dados endpoint exists"""
        # Create a simple test file (PDF-like content)
        test_content = b"%PDF-1.4 Test content for extraction"
        files = {"file": ("test.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = self.session.post(f"{BASE_URL}/api/cadastros/extrair-dados", files=files)
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Endpoint /api/cadastros/extrair-dados not found"
        print(f"Extração IA endpoint exists - Status: {response.status_code}")
    
    def test_extrair_dados_requires_auth(self):
        """Test that extração endpoint requires authentication"""
        no_auth_session = requests.Session()
        test_content = b"%PDF-1.4 Test content"
        files = {"file": ("test.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = no_auth_session.post(f"{BASE_URL}/api/cadastros/extrair-dados", files=files)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly requires authentication - Status: {response.status_code}")
    
    def test_extrair_dados_returns_structure(self):
        """Test that extração returns expected response structure"""
        # Create a simple test file
        test_content = b"%PDF-1.4 CNPJ: 12.345.678/0001-90 Razao Social: EMPRESA TESTE LTDA"
        files = {"file": ("test.pdf", io.BytesIO(test_content), "application/pdf")}
        
        response = self.session.post(f"{BASE_URL}/api/cadastros/extrair-dados", files=files)
        
        # Should return 200 or handle gracefully
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        # Should have success field
        assert "success" in data, "Response should contain 'success' field"
        
        if data.get("success"):
            assert "dados" in data, "Successful response should contain 'dados'"
            print(f"Extração returned data: {list(data.get('dados', {}).keys())}")
        else:
            # Even on failure, should have message
            assert "message" in data or "dados" in data, "Response should have message or dados"
            print(f"Extração returned: {data.get('message', 'No message')}")


class TestSintegra:
    """Tests for SINTEGRA consultation endpoint"""
    
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
    
    def test_sintegra_endpoint_exists(self):
        """Test that GET /api/sintegra/{uf}/{cnpj} endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/sintegra/SP/12345678000190")
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Endpoint /api/sintegra/{uf}/{cnpj} not found"
        print(f"SINTEGRA endpoint exists - Status: {response.status_code}")
    
    def test_sintegra_requires_auth(self):
        """Test that SINTEGRA endpoint requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/sintegra/SP/12345678000190")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly requires authentication - Status: {response.status_code}")
    
    def test_sintegra_valid_cnpj(self):
        """Test SINTEGRA with valid CNPJ format"""
        # Using unformatted CNPJ (14 digits only - no special chars to avoid URL issues)
        response = self.session.get(f"{BASE_URL}/api/sintegra/SP/12345678000190")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return expected structure
        assert "success" in data, "Response should contain 'success'"
        assert "cnpj" in data, "Response should contain 'cnpj'"
        assert "uf" in data, "Response should contain 'uf'"
        assert "inscricao_estadual" in data, "Response should contain 'inscricao_estadual'"
        
        # IE is expected to be null (no public API)
        print(f"SINTEGRA response: success={data.get('success')}, IE={data.get('inscricao_estadual')}")
        print(f"Message: {data.get('message', 'No message')}")
    
    def test_sintegra_invalid_cnpj_length(self):
        """Test SINTEGRA with invalid CNPJ (wrong length)"""
        response = self.session.get(f"{BASE_URL}/api/sintegra/SP/123456")
        
        assert response.status_code == 400, f"Expected 400 for invalid CNPJ, got {response.status_code}"
        print(f"Correctly rejects invalid CNPJ length - Status: {response.status_code}")
    
    def test_sintegra_invalid_uf(self):
        """Test SINTEGRA with invalid UF"""
        response = self.session.get(f"{BASE_URL}/api/sintegra/XX/12345678000190")
        
        assert response.status_code == 400, f"Expected 400 for invalid UF, got {response.status_code}"
        print(f"Correctly rejects invalid UF - Status: {response.status_code}")
    
    def test_sintegra_all_valid_ufs(self):
        """Test SINTEGRA accepts all valid Brazilian UFs"""
        valid_ufs = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF']
        
        for uf in valid_ufs:
            response = self.session.get(f"{BASE_URL}/api/sintegra/{uf}/12345678000190")
            assert response.status_code == 200, f"UF {uf} should be accepted, got {response.status_code}"
        
        print(f"All tested UFs accepted: {valid_ufs}")


class TestSalvarSCI:
    """Tests for POST /api/cadastros/salvar-sci endpoint"""
    
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
    
    def test_salvar_sci_minimal_data(self):
        """Test salvar-sci with minimal required data (razao_social, cnpj)"""
        payload = {
            "razao_social": "TEST_MINIMAL EMPRESA",
            "cnpj": "44.555.666/0001-77"
        }
        
        response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert "id" in data
        print(f"Minimal data accepted - ID: {data['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/cadastros/historico/{data['id']}")
    
    def test_salvar_sci_requires_auth(self):
        """Test that salvar-sci requires authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json={
            "razao_social": "TEST",
            "cnpj": "12.345.678/0001-90"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Correctly requires authentication - Status: {response.status_code}")
    
    def test_salvar_sci_missing_required_fields(self):
        """Test salvar-sci fails without required fields"""
        # Missing cnpj
        response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json={
            "razao_social": "TEST EMPRESA"
        })
        
        assert response.status_code == 422, f"Expected 422 for missing cnpj, got {response.status_code}"
        
        # Missing razao_social
        response = self.session.post(f"{BASE_URL}/api/cadastros/salvar-sci", json={
            "cnpj": "12.345.678/0001-90"
        })
        
        assert response.status_code == 422, f"Expected 422 for missing razao_social, got {response.status_code}"
        print(f"Correctly validates required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
