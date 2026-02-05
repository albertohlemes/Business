"""
Backend API Tests for Portal DP - Colaboradores Module
Tests: Authentication, Clientes, Colaboradores CRUD, Import functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@dp.com"
TEST_PASSWORD = "senha123"
TEST_USER_NAME = "Admin DP"


class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"Health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin@dp.com / senha123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        
        # If user doesn't exist, register first
        if response.status_code == 401:
            print("User not found, registering...")
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "nome": TEST_USER_NAME,
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            if reg_response.status_code == 200:
                response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": TEST_EMAIL,
                    "senha": TEST_PASSWORD
                })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "senha": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_get_current_user(self):
        """Test /api/auth/me endpoint"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed, skipping auth/me test")
        
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"Current user: {data['nome']}")


class TestClientes:
    """Cliente/Empresa CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        if response.status_code != 200:
            # Try to register
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "nome": TEST_USER_NAME,
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_list_clientes(self, auth_token):
        """Test listing all clientes"""
        response = requests.get(
            f"{BASE_URL}/api/clientes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clientes")
        return data
    
    def test_create_cliente(self, auth_token):
        """Test creating a new cliente"""
        unique_cnpj = f"TEST{uuid.uuid4().hex[:10].upper()}"
        
        payload = {
            "razao_social": "TEST_Empresa Teste LTDA",
            "cnpj": unique_cnpj,
            "nome_fantasia": "Empresa Teste",
            "endereco": "Rua Teste, 123",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234-567",
            "telefone": "(11) 99999-9999",
            "email": "teste@empresa.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clientes",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["razao_social"] == payload["razao_social"]
        assert "id" in data
        print(f"Created cliente: {data['razao_social']} (ID: {data['id']})")
        return data


class TestColaboradores:
    """Colaborador CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        if response.status_code != 200:
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "nome": TEST_USER_NAME,
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def cliente_id(self, auth_token):
        """Get or create a cliente for testing"""
        # First try to get existing clientes
        response = requests.get(
            f"{BASE_URL}/api/clientes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        # Create a new cliente
        unique_cnpj = f"TEST{uuid.uuid4().hex[:10].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/clientes",
            json={
                "razao_social": "TEST_Empresa Para Colaboradores",
                "cnpj": unique_cnpj,
                "nome_fantasia": "Empresa Teste Colab"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create cliente")
    
    def test_list_colaboradores(self, auth_token):
        """Test listing all colaboradores"""
        response = requests.get(
            f"{BASE_URL}/api/colaboradores",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} colaboradores")
    
    def test_list_colaboradores_by_cliente(self, auth_token, cliente_id):
        """Test listing colaboradores filtered by cliente"""
        response = requests.get(
            f"{BASE_URL}/api/colaboradores?cliente_id={cliente_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} colaboradores for cliente {cliente_id}")
    
    def test_create_colaborador_manual(self, auth_token, cliente_id):
        """Test creating a colaborador manually (without document import)"""
        unique_cpf = f"TEST{uuid.uuid4().hex[:7].upper()}"
        
        payload = {
            "cliente_id": cliente_id,
            "nome": "TEST_João da Silva",
            "cpf": unique_cpf,
            "endereco": "Rua das Flores",
            "numero": "100",
            "bairro": "Centro",
            "cep": "01234-567",
            "cidade": "São Paulo",
            "uf": "SP",
            "email": "joao@teste.com",
            "celular": "999999999",
            "ddd": "11",
            "data_nascimento": "15/05/1990",
            "estado_civil": "solteiro",
            "sexo": "masculino",
            "cargo": "Analista",
            "departamento": "TI",
            "salario_base": 5000.00,
            "data_admissao": "01/01/2024",
            "rg": "12345678",
            "rg_orgao_emissor": "SSP",
            "rg_uf": "SP",
            "pis": "12345678901",
            "ctps": "1234567",
            "ctps_serie": "001",
            "ctps_uf": "SP",
            "banco": "Itaú",
            "agencia": "1234",
            "conta": "12345-6",
            "vale_transporte": True,
            "prazo_experiencia": "90"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/colaboradores",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["nome"] == payload["nome"]
        assert data["cpf"] == payload["cpf"]
        assert data["cargo"] == payload["cargo"]
        assert data["salario_base"] == payload["salario_base"]
        assert "id" in data
        print(f"Created colaborador: {data['nome']} (ID: {data['id']})")
        return data
    
    def test_get_colaborador_by_id(self, auth_token, cliente_id):
        """Test getting a specific colaborador"""
        # First create a colaborador
        unique_cpf = f"TEST{uuid.uuid4().hex[:7].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/colaboradores",
            json={
                "cliente_id": cliente_id,
                "nome": "TEST_Maria Santos",
                "cpf": unique_cpf,
                "cargo": "Gerente",
                "salario_base": 8000.00
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create colaborador for test")
        
        colab_id = create_response.json()["id"]
        
        # Get the colaborador
        response = requests.get(
            f"{BASE_URL}/api/colaboradores/{colab_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == colab_id
        assert data["nome"] == "TEST_Maria Santos"
        print(f"Retrieved colaborador: {data['nome']}")
    
    def test_update_colaborador(self, auth_token, cliente_id):
        """Test updating a colaborador"""
        # First create a colaborador
        unique_cpf = f"TEST{uuid.uuid4().hex[:7].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/colaboradores",
            json={
                "cliente_id": cliente_id,
                "nome": "TEST_Pedro Oliveira",
                "cpf": unique_cpf,
                "cargo": "Assistente",
                "salario_base": 3000.00
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create colaborador for test")
        
        colab_id = create_response.json()["id"]
        
        # Update the colaborador
        update_payload = {
            "cliente_id": cliente_id,
            "nome": "TEST_Pedro Oliveira",
            "cpf": unique_cpf,
            "cargo": "Analista Sênior",
            "salario_base": 6000.00,
            "departamento": "Financeiro"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/colaboradores/{colab_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["cargo"] == "Analista Sênior"
        assert data["salario_base"] == 6000.00
        print(f"Updated colaborador: {data['nome']} - New cargo: {data['cargo']}")
    
    def test_delete_colaborador(self, auth_token, cliente_id):
        """Test deleting a colaborador"""
        # First create a colaborador
        unique_cpf = f"TEST{uuid.uuid4().hex[:7].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/colaboradores",
            json={
                "cliente_id": cliente_id,
                "nome": "TEST_Para Deletar",
                "cpf": unique_cpf,
                "cargo": "Temporário",
                "salario_base": 2000.00
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create colaborador for test")
        
        colab_id = create_response.json()["id"]
        
        # Delete the colaborador
        response = requests.delete(
            f"{BASE_URL}/api/colaboradores/{colab_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/colaboradores/{colab_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404
        print(f"Colaborador {colab_id} deleted successfully")


class TestColaboradorImport:
    """Tests for colaborador import endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        if response.status_code != 200:
            requests.post(f"{BASE_URL}/api/auth/register", json={
                "nome": TEST_USER_NAME,
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "senha": TEST_PASSWORD
            })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def cliente_id(self, auth_token):
        """Get or create a cliente for testing"""
        response = requests.get(
            f"{BASE_URL}/api/clientes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        unique_cnpj = f"TEST{uuid.uuid4().hex[:10].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/clientes",
            json={
                "razao_social": "TEST_Empresa Import",
                "cnpj": unique_cnpj
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create cliente")
    
    def test_import_endpoint_exists(self, auth_token, cliente_id):
        """Test that import endpoint exists and accepts requests"""
        # Create a simple test file
        test_content = b"Test file content for import"
        files = {"file": ("test.pdf", test_content, "application/pdf")}
        data = {"cliente_id": cliente_id, "tipo_documento": "auto"}
        
        response = requests.post(
            f"{BASE_URL}/api/colaboradores/importar",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # The endpoint should exist (not 404) - it may fail processing but should accept the request
        assert response.status_code != 404, "Import endpoint not found"
        print(f"Import endpoint response: {response.status_code}")


# Cleanup fixture to remove test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    # Login
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Delete test colaboradores
    colabs = requests.get(f"{BASE_URL}/api/colaboradores", headers=headers)
    if colabs.status_code == 200:
        for colab in colabs.json():
            if colab.get("nome", "").startswith("TEST_") or colab.get("cpf", "").startswith("TEST"):
                requests.delete(f"{BASE_URL}/api/colaboradores/{colab['id']}", headers=headers)
    
    # Delete test clientes
    clientes = requests.get(f"{BASE_URL}/api/clientes", headers=headers)
    if clientes.status_code == 200:
        for cliente in clientes.json():
            if cliente.get("razao_social", "").startswith("TEST_") or cliente.get("cnpj", "").startswith("TEST"):
                requests.delete(f"{BASE_URL}/api/clientes/{cliente['id']}", headers=headers)
    
    print("Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
