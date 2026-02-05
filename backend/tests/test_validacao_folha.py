"""
Test suite for Validação de Folha de Pagamento feature
Tests the new unified validation interface with:
- POST /api/validacoes/validar-completa (new endpoint)
- GET /api/validacoes/{id} (new endpoint)
- GET /api/validacoes (list validations)
"""
import pytest
import requests
import os
import io

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
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}"
    }


class TestAuthAndBasics:
    """Test authentication and basic endpoints"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_get_clientes(self, auth_headers):
        """Test getting list of clientes"""
        response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get clientes: {response.text}"
        clientes = response.json()
        assert isinstance(clientes, list)
        # Check if Empresa Nova exists
        empresa_nova = next((c for c in clientes if c.get("id") == CLIENTE_ID), None)
        if empresa_nova:
            print(f"✓ Found Empresa Nova: {empresa_nova.get('razao_social') or empresa_nova.get('nome_fantasia')}")
        else:
            print(f"✓ Got {len(clientes)} clientes")


class TestValidacaoEndpoints:
    """Test validation endpoints"""
    
    def test_list_validacoes(self, auth_headers):
        """Test GET /api/validacoes - list all validations"""
        response = requests.get(f"{BASE_URL}/api/validacoes", headers=auth_headers)
        assert response.status_code == 200, f"Failed to list validacoes: {response.text}"
        validacoes = response.json()
        assert isinstance(validacoes, list)
        print(f"✓ Listed {len(validacoes)} validações")
        
        # Check structure of validacoes if any exist
        if validacoes:
            v = validacoes[0]
            assert "id" in v
            assert "mes_referencia" in v
            assert "ano_referencia" in v
            assert "status" in v
            print(f"✓ Validação structure is correct")
    
    def test_list_validacoes_by_cliente(self, auth_headers):
        """Test GET /api/validacoes?cliente_id=... - filter by cliente"""
        response = requests.get(
            f"{BASE_URL}/api/validacoes?cliente_id={CLIENTE_ID}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to filter validacoes: {response.text}"
        validacoes = response.json()
        assert isinstance(validacoes, list)
        print(f"✓ Listed {len(validacoes)} validações for cliente {CLIENTE_ID}")
    
    def test_validar_completa_requires_cliente_id(self, auth_headers):
        """Test POST /api/validacoes/validar-completa requires cliente_id"""
        # Create a simple test file
        test_file = io.BytesIO(b"Test content")
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("test.pdf", test_file, "application/pdf")},
            data={"mes_referencia": "01", "ano_referencia": 2025}
        )
        # Should fail with 400 because cliente_id is required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "cliente_id" in response.text.lower()
        print("✓ validar-completa correctly requires cliente_id")
    
    def test_validar_completa_requires_holerite_atual(self, auth_headers):
        """Test POST /api/validacoes/validar-completa requires holerite_atual file"""
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            data={
                "cliente_id": CLIENTE_ID,
                "mes_referencia": "01",
                "ano_referencia": 2025
            }
        )
        # Should fail with 422 because holerite_atual is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ validar-completa correctly requires holerite_atual file")
    
    def test_validar_completa_invalid_cliente(self, auth_headers):
        """Test POST /api/validacoes/validar-completa with invalid cliente_id"""
        test_file = io.BytesIO(b"Test content")
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("test.pdf", test_file, "application/pdf")},
            data={
                "cliente_id": "invalid-cliente-id",
                "mes_referencia": "01",
                "ano_referencia": 2025
            }
        )
        # Should fail with 400 or 404 because cliente doesn't exist or is invalid
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        print("✓ validar-completa correctly validates cliente_id")
    
    def test_get_validacao_not_found(self, auth_headers):
        """Test GET /api/validacoes/{id} with invalid id"""
        response = requests.get(
            f"{BASE_URL}/api/validacoes/invalid-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ GET validacao correctly returns 404 for invalid id")


class TestValidacaoWithExistingData:
    """Test validation endpoints with existing data"""
    
    def test_get_existing_validacao_details(self, auth_headers):
        """Test GET /api/validacoes/{id} with existing validacao"""
        # First get list of validacoes
        response = requests.get(f"{BASE_URL}/api/validacoes", headers=auth_headers)
        assert response.status_code == 200
        validacoes = response.json()
        
        if not validacoes:
            pytest.skip("No existing validacoes to test")
        
        # Get details of first validacao
        validacao_id = validacoes[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/validacoes/{validacao_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get validacao details: {response.text}"
        
        validacao = response.json()
        assert validacao["id"] == validacao_id
        assert "mes_referencia" in validacao
        assert "ano_referencia" in validacao
        assert "status" in validacao
        
        # Check for new fields from unified interface
        if validacao.get("tipo_validacao"):
            print(f"✓ Validação tipo: {validacao['tipo_validacao']}")
        if validacao.get("arquivos"):
            print(f"✓ Arquivos: {validacao['arquivos']}")
        if validacao.get("divergencias"):
            print(f"✓ Divergências: {len(validacao['divergencias'])}")
        if validacao.get("campos_conferidos"):
            print(f"✓ Campos conferidos: {len(validacao['campos_conferidos'])}")
        
        print(f"✓ Got validacao details for {validacao_id}")


class TestValidacaoResponseStructure:
    """Test the response structure of validacao endpoints"""
    
    def test_validacao_list_response_structure(self, auth_headers):
        """Test that list response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/validacoes", headers=auth_headers)
        assert response.status_code == 200
        validacoes = response.json()
        
        if not validacoes:
            pytest.skip("No validacoes to check structure")
        
        v = validacoes[0]
        
        # Required fields
        required_fields = ["id", "mes_referencia", "ano_referencia", "status", "created_at"]
        for field in required_fields:
            assert field in v, f"Missing required field: {field}"
        
        # Optional fields that should be present in new unified interface
        optional_fields = [
            "cliente_id", "cliente_nome", "tipo_validacao", "arquivos",
            "funcionarios_analisados", "divergencias", "campos_conferidos",
            "alertas", "total_divergencias", "total_conferidos", "total_alertas",
            "impacto_financeiro_total", "resumo_executivo"
        ]
        
        present_optional = [f for f in optional_fields if f in v]
        print(f"✓ Validação has {len(present_optional)} optional fields: {present_optional}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
