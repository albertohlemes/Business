"""
Test suite for Colaboradores Import and Batch Save functionality
Tests the multi-vínculos (multiple employees) import feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teste@emergent.com"
TEST_PASSWORD = "Teste123!"
CLIENTE_ID = "897c7b37-a18f-4e66-9562-961697a460b3"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestColaboradoresImport:
    """Tests for colaboradores import functionality"""
    
    def test_login_success(self):
        """Test login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_get_clientes(self, auth_headers):
        """Test getting list of clientes"""
        response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check if Empresa Nova exists
        empresa_nova = next((c for c in data if c.get("nome_fantasia") == "Empresa Nova"), None)
        assert empresa_nova is not None, "Empresa Nova not found"
        assert empresa_nova["id"] == CLIENTE_ID
    
    def test_get_colaboradores_by_cliente(self, auth_headers):
        """Test getting colaboradores for a specific cliente"""
        response = requests.get(
            f"{BASE_URL}/api/colaboradores?cliente_id={CLIENTE_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least João da Silva and Maria Santos
        names = [c["nome"] for c in data]
        assert "João da Silva" in names or any("João" in n for n in names)
    
    def test_importar_endpoint_requires_file(self, auth_headers):
        """Test that importar endpoint requires a file"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/importar",
            headers={"Authorization": auth_headers["Authorization"]}
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_salvar_lote_requires_cliente_id(self, auth_headers):
        """Test that salvar-lote requires cliente_id"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/salvar-lote",
            headers=auth_headers,
            json={
                "colaboradores": [{"nome": "Test", "cpf": "12345678901"}]
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "cliente_id" in data.get("detail", "").lower()
    
    def test_salvar_lote_requires_colaboradores(self, auth_headers):
        """Test that salvar-lote requires colaboradores array"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/salvar-lote",
            headers=auth_headers,
            json={
                "cliente_id": CLIENTE_ID,
                "colaboradores": []
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "nenhum colaborador" in data.get("detail", "").lower()
    
    def test_salvar_lote_single_colaborador(self, auth_headers):
        """Test saving a single colaborador via batch endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/salvar-lote",
            headers=auth_headers,
            json={
                "cliente_id": CLIENTE_ID,
                "colaboradores": [
                    {
                        "nome": "TEST_Single_Colab",
                        "cpf": "11111111111",
                        "cargo": "Tester",
                        "salario_base": 3000
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_salvos"] == 1
        assert data["total_erros"] == 0
        assert len(data["salvos"]) == 1
        assert data["salvos"][0]["nome"] == "TEST_Single_Colab"
    
    def test_salvar_lote_multiple_colaboradores(self, auth_headers):
        """Test saving multiple colaboradores via batch endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/salvar-lote",
            headers=auth_headers,
            json={
                "cliente_id": CLIENTE_ID,
                "colaboradores": [
                    {
                        "nome": "TEST_Multi_1",
                        "cpf": "22222222222",
                        "cargo": "Developer",
                        "salario_base": 5000,
                        "data_admissao": "01/01/2024"
                    },
                    {
                        "nome": "TEST_Multi_2",
                        "cpf": "33333333333",
                        "cargo": "Designer",
                        "salario_base": 4500,
                        "data_admissao": "15/01/2024"
                    },
                    {
                        "nome": "TEST_Multi_3",
                        "cpf": "44444444444",
                        "cargo": "Manager",
                        "salario_base": 8000,
                        "data_admissao": "01/02/2024"
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_salvos"] == 3
        assert data["total_erros"] == 0
        assert len(data["salvos"]) == 3
        # Verify all names are in saved list
        saved_names = [s["nome"] for s in data["salvos"]]
        assert "TEST_Multi_1" in saved_names
        assert "TEST_Multi_2" in saved_names
        assert "TEST_Multi_3" in saved_names
    
    def test_verify_colaboradores_persisted(self, auth_headers):
        """Test that saved colaboradores are persisted in database"""
        response = requests.get(
            f"{BASE_URL}/api/colaboradores?cliente_id={CLIENTE_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        names = [c["nome"] for c in data]
        # Check that our test colaboradores exist
        assert any("TEST_" in n for n in names), "No TEST_ colaboradores found"
    
    def test_salvar_lote_with_all_fields(self, auth_headers):
        """Test saving colaborador with all eSocial fields"""
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/salvar-lote",
            headers=auth_headers,
            json={
                "cliente_id": CLIENTE_ID,
                "colaboradores": [
                    {
                        "nome": "TEST_Full_Fields",
                        "cpf": "55555555555",
                        "endereco": "Rua Teste",
                        "numero": "123",
                        "bairro": "Centro",
                        "cep": "01234567",
                        "cidade": "São Paulo",
                        "uf": "SP",
                        "email": "test@test.com",
                        "celular": "11999999999",
                        "data_nascimento": "01/01/1990",
                        "estado_civil": "solteiro",
                        "data_admissao": "01/03/2024",
                        "cargo": "Analista",
                        "salario_base": 6000,
                        "rg": "123456789",
                        "pis": "12345678901",
                        "ctps": "1234567",
                        "ctps_serie": "001",
                        "nome_mae": "Maria Teste",
                        "nome_pai": "José Teste",
                        "banco": "Itaú",
                        "agencia": "1234",
                        "conta": "12345-6",
                        "vale_transporte": True,
                        "dependentes": [
                            {
                                "nome": "Filho Teste",
                                "data_nascimento": "01/01/2020",
                                "cpf": "66666666666",
                                "parentesco": "filho",
                                "ir": True,
                                "salario_familia": True
                            }
                        ]
                    }
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_salvos"] == 1


class TestColaboradoresCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_colaboradores(self, auth_headers):
        """Delete TEST_ prefixed colaboradores"""
        # Get all colaboradores
        response = requests.get(
            f"{BASE_URL}/api/colaboradores?cliente_id={CLIENTE_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        colaboradores = response.json()
        
        # Delete TEST_ prefixed ones
        deleted_count = 0
        for colab in colaboradores:
            if colab["nome"].startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/colaboradores/{colab['id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test colaboradores")
        assert deleted_count >= 0  # Just ensure no errors
