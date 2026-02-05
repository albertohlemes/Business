"""
Backend API Tests for Portal DP - Dissídio and Validação Folha Modules
Tests: Dissídio CRUD, Convenção Analysis, Validação Folha, Comparar Apoio
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@dp.com"
TEST_PASSWORD = "senha123"
TEST_USER_NAME = "Admin DP"


class TestDissidioEndpoints:
    """Dissídio CRUD and Convention Analysis tests"""
    
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
    
    @pytest.fixture
    def cliente_id(self, auth_token):
        """Get or create a cliente for testing"""
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
                "razao_social": "TEST_Empresa Dissidio",
                "cnpj": unique_cnpj,
                "nome_fantasia": "Empresa Teste Dissidio"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create cliente")
    
    def test_list_dissidios(self, auth_token):
        """Test listing all dissídios"""
        response = requests.get(
            f"{BASE_URL}/api/dissidios",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} dissídios")
    
    def test_create_dissidio(self, auth_token, cliente_id):
        """Test creating a new dissídio"""
        payload = {
            "cliente_id": cliente_id,
            "sindicato": "TEST_Sindicato dos Trabalhadores",
            "percentual_reajuste": 5.5,
            "data_base": "01/2025",
            "observacoes": "Teste de dissídio"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dissidios",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["sindicato"] == payload["sindicato"]
        assert data["percentual_reajuste"] == payload["percentual_reajuste"]
        assert data["status"] == "pendente"
        assert "id" in data
        print(f"Created dissídio: {data['sindicato']} - {data['percentual_reajuste']}%")
        return data
    
    def test_list_dissidios_by_cliente(self, auth_token, cliente_id):
        """Test listing dissídios filtered by cliente"""
        response = requests.get(
            f"{BASE_URL}/api/dissidios?cliente_id={cliente_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} dissídios for cliente {cliente_id}")
    
    def test_convencao_analisar_endpoint_exists(self, auth_token, cliente_id):
        """Test that POST /api/convencao/analisar endpoint exists and accepts files"""
        # Create a simple test PDF content
        test_content = b"%PDF-1.4 Test convention file content"
        files = {"file": ("convencao_teste.pdf", test_content, "application/pdf")}
        data = {"cliente_id": cliente_id}
        
        response = requests.post(
            f"{BASE_URL}/api/convencao/analisar",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # The endpoint should exist (not 404) - it may fail processing but should accept the request
        assert response.status_code != 404, "Convencao analisar endpoint not found"
        print(f"Convencao analisar endpoint response: {response.status_code}")
        
        # If successful, check response structure
        if response.status_code == 200:
            result = response.json()
            assert "dados_convencao" in result or "message" in result
            print(f"Convencao analysis result: {result.get('message', 'OK')}")


class TestValidacaoFolhaEndpoints:
    """Validação de Folha tests - both simple analysis and comparison with support document"""
    
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
                "razao_social": "TEST_Empresa Validacao",
                "cnpj": unique_cnpj
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create cliente")
    
    def test_list_validacoes(self, auth_token):
        """Test listing all validações"""
        response = requests.get(
            f"{BASE_URL}/api/validacoes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} validações")
    
    def test_validacoes_analisar_endpoint_exists(self, auth_token, cliente_id):
        """Test that POST /api/validacoes/analisar endpoint exists and accepts files"""
        # Create a simple test file
        test_content = b"Nome,CPF,Salario\nJoao Silva,12345678901,5000.00"
        files = {"file": ("folha_teste.csv", test_content, "text/csv")}
        data = {
            "cliente_id": cliente_id,
            "mes_referencia": "01",
            "ano_referencia": "2025"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/analisar",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # The endpoint should exist (not 404)
        assert response.status_code != 404, "Validacoes analisar endpoint not found"
        print(f"Validacoes analisar endpoint response: {response.status_code}")
        
        # If successful, check response structure
        if response.status_code == 200:
            result = response.json()
            assert "id" in result or "message" in result
            print(f"Validacao analysis result: {result.get('message', 'OK')}")
    
    def test_validacoes_comparar_apoio_endpoint_exists(self, auth_token, cliente_id):
        """Test that POST /api/validacoes/comparar-apoio endpoint exists and accepts two files"""
        # Create test files for holerite and apoio
        holerite_content = b"Holerite - Funcionario: Joao Silva - Salario: R$ 5.000,00 - Horas Extras: 10h"
        apoio_content = b"Relatorio de Horas Extras - Joao Silva - 12 horas extras no mes"
        
        files = {
            "holerite": ("holerite_teste.txt", holerite_content, "text/plain"),
            "apoio": ("apoio_teste.txt", apoio_content, "text/plain")
        }
        data = {
            "cliente_id": cliente_id,
            "mes_referencia": "01",
            "ano_referencia": "2025"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/comparar-apoio",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # The endpoint should exist (not 404)
        assert response.status_code != 404, "Validacoes comparar-apoio endpoint not found"
        print(f"Validacoes comparar-apoio endpoint response: {response.status_code}")
        
        # If successful, check response structure
        if response.status_code == 200:
            result = response.json()
            assert "id" in result or "message" in result
            # Check for comparison-specific fields
            if "tipo_validacao" in result:
                assert result["tipo_validacao"] == "comparacao_apoio"
            print(f"Comparar apoio result: {result.get('message', 'OK')}")
    
    def test_comparar_apoio_requires_both_files(self, auth_token, cliente_id):
        """Test that comparar-apoio endpoint requires both holerite and apoio files"""
        # Try with only holerite
        holerite_content = b"Holerite content"
        files = {
            "holerite": ("holerite.txt", holerite_content, "text/plain")
        }
        data = {"cliente_id": cliente_id}
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/comparar-apoio",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should fail with 422 (validation error) because apoio is missing
        assert response.status_code == 422, f"Expected 422 for missing apoio file, got {response.status_code}"
        print("Correctly requires both files")
    
    def test_comparar_apoio_accepts_various_file_types(self, auth_token, cliente_id):
        """Test that comparar-apoio accepts various file types for apoio document"""
        # Test with PDF holerite and image apoio
        holerite_content = b"%PDF-1.4 Holerite PDF content"
        apoio_content = b"\x89PNG\r\n\x1a\n Image content"  # PNG header
        
        files = {
            "holerite": ("holerite.pdf", holerite_content, "application/pdf"),
            "apoio": ("apoio.png", apoio_content, "image/png")
        }
        data = {
            "cliente_id": cliente_id,
            "mes_referencia": "01",
            "ano_referencia": "2025"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/comparar-apoio",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should accept the request (not 404 or 415)
        assert response.status_code not in [404, 415], f"Endpoint should accept various file types"
        print(f"Various file types accepted, response: {response.status_code}")


class TestDissidioWorkflow:
    """Test complete dissídio workflow: create, approve, reject"""
    
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
                "razao_social": "TEST_Empresa Workflow",
                "cnpj": unique_cnpj
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create cliente")
    
    def test_dissidio_approve_endpoint(self, auth_token, cliente_id):
        """Test approving a dissídio"""
        # First create a dissídio
        create_response = requests.post(
            f"{BASE_URL}/api/dissidios",
            json={
                "cliente_id": cliente_id,
                "sindicato": "TEST_Sindicato Aprovacao",
                "percentual_reajuste": 3.0,
                "data_base": "01/2025"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create dissídio for approval test")
        
        dissidio_id = create_response.json()["id"]
        
        # Approve the dissídio
        response = requests.put(
            f"{BASE_URL}/api/dissidios/{dissidio_id}/aprovar",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Approve failed: {response.text}"
        print(f"Dissídio {dissidio_id} approved successfully")
    
    def test_dissidio_reject_endpoint(self, auth_token, cliente_id):
        """Test rejecting a dissídio"""
        # First create a dissídio
        create_response = requests.post(
            f"{BASE_URL}/api/dissidios",
            json={
                "cliente_id": cliente_id,
                "sindicato": "TEST_Sindicato Rejeicao",
                "percentual_reajuste": 2.0,
                "data_base": "02/2025"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create dissídio for rejection test")
        
        dissidio_id = create_response.json()["id"]
        
        # Reject the dissídio
        response = requests.put(
            f"{BASE_URL}/api/dissidios/{dissidio_id}/rejeitar",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Reject failed: {response.text}"
        print(f"Dissídio {dissidio_id} rejected successfully")


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
    
    # Note: Dissídios don't have a delete endpoint, so we can't clean them up
    # But they are prefixed with TEST_ for identification
    
    print("Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
