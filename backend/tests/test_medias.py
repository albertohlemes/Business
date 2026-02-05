"""
Test suite for Medias (Salary Averages Import) endpoints
Tests the new functionality for importing salary averages from old accounting reports
and generating files for SCI Único import
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMediasEndpoints:
    """Test Medias API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@dp.com",
            "senha": "senha123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_login_success(self):
        """Test login with admin@dp.com/senha123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@dp.com",
            "senha": "senha123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@dp.com"
        print("✓ Login with admin@dp.com/senha123 works")
    
    def test_get_medias_importacoes_endpoint_exists(self):
        """Test GET /api/medias/importacoes endpoint exists and returns list"""
        response = self.session.get(f"{BASE_URL}/api/medias/importacoes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/medias/importacoes returns list with {len(data)} items")
    
    def test_post_medias_extrair_endpoint_exists(self):
        """Test POST /api/medias/extrair endpoint exists (requires file upload)"""
        # Test without file - should return 422 (validation error)
        response = self.session.post(f"{BASE_URL}/api/medias/extrair")
        # 422 means endpoint exists but requires file
        assert response.status_code == 422
        print("✓ POST /api/medias/extrair endpoint exists (requires file upload)")
    
    def test_post_medias_salvar_endpoint_exists(self):
        """Test POST /api/medias/salvar endpoint exists"""
        # Test with empty data - should return 400 (no funcionarios)
        response = self.session.post(f"{BASE_URL}/api/medias/salvar", json={
            "cliente_id": "test-id",
            "funcionarios": []
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("✓ POST /api/medias/salvar endpoint exists (validates empty funcionarios)")
    
    def test_post_medias_gerar_importacao_xlsx(self):
        """Test POST /api/medias/gerar-importacao with xlsx format"""
        # Test with sample data
        test_data = {
            "cliente_id": "test-cliente-id",
            "funcionarios": [
                {
                    "nome": "TEST_Funcionario Teste",
                    "cpf": "123.456.789-00",
                    "matricula": "12345",
                    "medias": [
                        {
                            "competencia": "01/2024",
                            "salario_bruto": 2500.00,
                            "horas_extras": 350.00,
                            "comissoes": 500.00,
                            "dsr": 150.00,
                            "adicional_noturno": 100.00,
                            "outros": 50.00
                        }
                    ]
                }
            ],
            "formato": "xlsx"
        }
        
        response = self.session.post(f"{BASE_URL}/api/medias/gerar-importacao", json=test_data)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print("✓ POST /api/medias/gerar-importacao returns XLSX file")
    
    def test_post_medias_gerar_importacao_txt(self):
        """Test POST /api/medias/gerar-importacao with txt format"""
        test_data = {
            "cliente_id": "test-cliente-id",
            "funcionarios": [
                {
                    "nome": "TEST_Funcionario Teste",
                    "cpf": "123.456.789-00",
                    "matricula": "12345",
                    "medias": [
                        {
                            "competencia": "01/2024",
                            "salario_bruto": 2500.00,
                            "horas_extras": 350.00,
                            "comissoes": 500.00,
                            "dsr": 150.00,
                            "adicional_noturno": 100.00,
                            "outros": 50.00
                        }
                    ]
                }
            ],
            "formato": "txt"
        }
        
        response = self.session.post(f"{BASE_URL}/api/medias/gerar-importacao", json=test_data)
        assert response.status_code == 200
        assert "text/plain" in response.headers.get("content-type", "")
        
        # Verify TXT content structure
        content = response.content.decode('utf-8')
        lines = content.strip().split('\n')
        assert len(lines) >= 2  # Header + at least 1 data row
        
        # Check header
        header = lines[0]
        assert "MATRICULA" in header
        assert "CPF" in header
        assert "NOME" in header
        assert "COMPETENCIA" in header
        assert "SALARIO" in header
        assert "HE" in header
        assert "COMISSOES" in header
        assert "DSR" in header
        assert "ADNOTURNO" in header
        assert "OUTROS" in header
        assert "TOTAL" in header
        
        print("✓ POST /api/medias/gerar-importacao returns TXT file with correct format")
    
    def test_post_medias_gerar_importacao_empty_funcionarios(self):
        """Test POST /api/medias/gerar-importacao with empty funcionarios"""
        test_data = {
            "cliente_id": "test-cliente-id",
            "funcionarios": [],
            "formato": "xlsx"
        }
        
        response = self.session.post(f"{BASE_URL}/api/medias/gerar-importacao", json=test_data)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("✓ POST /api/medias/gerar-importacao validates empty funcionarios")
    
    def test_get_clientes_for_medias(self):
        """Test GET /api/clientes returns list for empresa selection"""
        response = self.session.get(f"{BASE_URL}/api/clientes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/clientes returns list with {len(data)} empresas")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
