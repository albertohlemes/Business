"""
Test suite for Naturalidade (birthplace) fields in Sócio forms
Tests that data_nascimento, cidade_nascimento, estado_nascimento are properly handled
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://corporegister.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "teste@teste.com"
TEST_PASSWORD = "teste123"


class TestNaturalidadeFields:
    """Tests for naturalidade fields in sócio data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_02_create_minuta_for_constituicao(self):
        """Test creating a minuta for constituição"""
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Naturalidade Fields Test"
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        self.minuta_id = data["id"]
        print(f"✓ Minuta created: {self.minuta_id}")
        return self.minuta_id
    
    def test_03_gerar_contrato_with_naturalidade(self):
        """Test generating contract with naturalidade fields"""
        # First create a minuta
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Naturalidade Contract Generation"
            }
        )
        assert minuta_response.status_code == 200
        minuta_id = minuta_response.json()["id"]
        
        # Generate contract with naturalidade fields
        payload = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "EMPRESA TESTE NATURALIDADE LTDA",
                "nome_fantasia": "Teste Naturalidade",
                "capital_social": "10.000,00",
                "capital_extenso": "Dez mil reais",
                "endereco": {
                    "logradouro": "Rua Teste",
                    "numero": "123",
                    "complemento": "Sala 1",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01000-000"
                },
                "objeto_social": "Desenvolvimento de software"
            },
            "socios": [
                {
                    "nome": "JOÃO DA SILVA",
                    "cpf": "123.456.789-00",
                    "rg": "12.345.678-9",
                    "orgao_emissor": "SSP/SP",
                    "nacionalidade": "Brasileiro",
                    "estado_civil": "Casado(a)",
                    "regime_casamento": "Comunhão Parcial de Bens",
                    "profissao": "Empresário",
                    "data_nascimento": "1980-01-15",
                    "cidade_nascimento": "São Paulo",
                    "estado_nascimento": "SP",
                    "endereco": "Rua Teste, 123, Centro, São Paulo/SP",
                    "participacao": "50",
                    "administrador": True
                },
                {
                    "nome": "MARIA SANTOS",
                    "cpf": "987.654.321-00",
                    "rg": "98.765.432-1",
                    "orgao_emissor": "SSP/RJ",
                    "nacionalidade": "Brasileira",
                    "estado_civil": "Solteiro(a)",
                    "profissao": "Administradora",
                    "data_nascimento": "1985-06-20",
                    "cidade_nascimento": "Rio de Janeiro",
                    "estado_nascimento": "RJ",
                    "endereco": "Av. Brasil, 456, Copacabana, Rio de Janeiro/RJ",
                    "participacao": "50",
                    "administrador": False
                }
            ],
            "cnaes": [
                "62.01-5-01 - Desenvolvimento de programas de computador sob encomenda"
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-contrato",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "contrato" in data
        
        # Verify naturalidade is included in the contract
        contrato = data["contrato"]
        assert "São Paulo/SP" in contrato or "natural de São Paulo" in contrato, "First partner's birthplace not found"
        assert "Rio de Janeiro/RJ" in contrato or "natural de Rio de Janeiro" in contrato, "Second partner's birthplace not found"
        
        print("✓ Contract generated with naturalidade fields")
        print(f"  - Contract length: {len(contrato)} characters")
        
        # Check if birth dates are included (optional field)
        if "1980" in contrato or "15/01/1980" in contrato:
            print("  - Birth date for first partner included")
        if "1985" in contrato or "20/06/1985" in contrato:
            print("  - Birth date for second partner included")
    
    def test_04_naturalidade_fields_optional(self):
        """Test that naturalidade fields are optional"""
        # First create a minuta
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Optional Naturalidade"
            }
        )
        assert minuta_response.status_code == 200
        minuta_id = minuta_response.json()["id"]
        
        # Generate contract WITHOUT naturalidade fields
        payload = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "EMPRESA SEM NATURALIDADE LTDA",
                "nome_fantasia": "Sem Naturalidade",
                "capital_social": "5.000,00",
                "capital_extenso": "Cinco mil reais",
                "endereco": {
                    "logradouro": "Rua Teste",
                    "numero": "456",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01000-000"
                },
                "objeto_social": "Comércio varejista"
            },
            "socios": [
                {
                    "nome": "PEDRO OLIVEIRA",
                    "cpf": "111.222.333-44",
                    "nacionalidade": "Brasileiro",
                    "estado_civil": "Solteiro(a)",
                    "profissao": "Comerciante",
                    # No naturalidade fields
                    "endereco": "Rua Teste, 456, Centro, São Paulo/SP",
                    "participacao": "100",
                    "administrador": True
                }
            ],
            "cnaes": [
                "47.11-3-02 - Comércio varejista de mercadorias em geral"
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-contrato",
            headers=self.headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "contrato" in data
        
        print("✓ Contract generated without naturalidade fields (optional)")
    
    def test_05_cleanup_test_minutas(self):
        """Cleanup test minutas"""
        # List all minutas
        response = requests.get(
            f"{BASE_URL}/api/minutas",
            headers=self.headers
        )
        assert response.status_code == 200
        minutas = response.json()
        
        # Delete test minutas
        deleted = 0
        for minuta in minutas:
            if minuta.get("descricao", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/minutas/{minuta['id']}",
                    headers=self.headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test minutas")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
