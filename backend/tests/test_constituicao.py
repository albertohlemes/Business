"""
Test suite for Constituição (Company Formation) endpoints
Tests the wizard flow for creating new company contracts
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://process-manager-15.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "teste2@teste.com"
TEST_PASSWORD = "123456"


class TestConstituicaoEndpoints:
    """Tests for company formation (constituição) endpoints"""
    
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
    
    def test_02_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print("✓ Login successful")
    
    def test_03_gerar_objeto_social(self):
        """Test AI generation of objeto social from CNAEs"""
        cnaes = [
            "62.01-5-01 - Desenvolvimento de programas de computador sob encomenda",
            "62.02-3-00 - Desenvolvimento e licenciamento de programas de computador customizáveis"
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-objeto-social",
            headers=self.headers,
            json={"cnaes": cnaes}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "objeto_social" in data
        assert len(data["objeto_social"]) > 50  # Should be a substantial text
        assert "desenvolvimento" in data["objeto_social"].lower()
        print(f"✓ Objeto social generated: {data['objeto_social'][:100]}...")
    
    def test_04_gerar_objeto_social_empty_cnaes(self):
        """Test objeto social with empty CNAEs returns error"""
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-objeto-social",
            headers=self.headers,
            json={"cnaes": []}
        )
        
        assert response.status_code == 400
        print("✓ Empty CNAEs correctly returns 400")
    
    def test_05_create_minuta_for_constituicao(self):
        """Test creating a minuta for constituição"""
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Constituição de Empresa Teste LTDA"
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["tipo_alteracao"] == "constituicao"
        assert data["status"] == "pendente"
        self.minuta_id = data["id"]
        print(f"✓ Minuta created with ID: {self.minuta_id}")
        return data["id"]
    
    def test_06_gerar_contrato_completo(self):
        """Test full contract generation for company formation"""
        # First create a minuta
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Constituição Completa"
            }
        )
        assert minuta_response.status_code == 200
        minuta_id = minuta_response.json()["id"]
        
        # Generate contract
        contract_data = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST_EMPRESA TECNOLOGIA LTDA",
                "nome_fantasia": "Tech Test",
                "capital_social": "50.000,00",
                "capital_extenso": "cinquenta mil reais",
                "endereco": {
                    "logradouro": "Rua Teste",
                    "numero": "100",
                    "complemento": "Sala 1",
                    "bairro": "Centro",
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "cep": "01000-000"
                },
                "objeto_social": "Prestação de serviços de tecnologia da informação."
            },
            "socios": [
                {
                    "nome": "TEST_SOCIO UM",
                    "cpf": "111.111.111-11",
                    "rg": "11.111.111-1",
                    "orgao_emissor": "SSP/SP",
                    "nacionalidade": "Brasileiro",
                    "estado_civil": "Solteiro(a)",
                    "profissao": "Empresário",
                    "endereco": "Rua A, 1, Centro, São Paulo-SP",
                    "participacao": "50",
                    "administrador": True
                },
                {
                    "nome": "TEST_SOCIO DOIS",
                    "cpf": "222.222.222-22",
                    "rg": "22.222.222-2",
                    "orgao_emissor": "SSP/SP",
                    "nacionalidade": "Brasileiro",
                    "estado_civil": "Casado(a)",
                    "regime_casamento": "Comunhão Parcial de Bens",
                    "profissao": "Administrador",
                    "endereco": "Rua B, 2, Centro, São Paulo-SP",
                    "participacao": "50",
                    "administrador": False
                }
            ],
            "cnaes": ["62.01-5-01 - Desenvolvimento de programas de computador"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-contrato",
            headers=self.headers,
            json=contract_data
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "contrato" in data
        assert "minuta_id" in data
        assert len(data["contrato"]) > 500  # Should be a substantial contract
        assert "TEST_EMPRESA TECNOLOGIA LTDA" in data["contrato"]
        assert "TEST_SOCIO UM" in data["contrato"]
        assert "TEST_SOCIO DOIS" in data["contrato"]
        print(f"✓ Contract generated successfully ({len(data['contrato'])} chars)")
        
        # Verify minuta was updated
        minuta_check = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}",
            headers=self.headers
        )
        assert minuta_check.status_code == 200
        minuta_data = minuta_check.json()
        assert minuta_data["status"] == "concluida"
        assert minuta_data.get("tipo_processo") == "constituicao"
        print("✓ Minuta status updated to 'concluida'")
        
        return minuta_id
    
    def test_07_download_pdf(self):
        """Test PDF download for generated contract"""
        # Create and generate a contract first
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_PDF Download Test"
            }
        )
        minuta_id = minuta_response.json()["id"]
        
        # Generate contract
        contract_data = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST_PDF EMPRESA LTDA",
                "capital_social": "10.000,00",
                "capital_extenso": "dez mil reais",
                "endereco": {"logradouro": "Rua X", "numero": "1", "bairro": "Centro", "cidade": "SP", "estado": "SP"},
                "objeto_social": "Comércio varejista."
            },
            "socios": [
                {"nome": "TEST_SOCIO PDF", "cpf": "333.333.333-33", "participacao": "100", "administrador": True}
            ],
            "cnaes": ["47.11-3-02 - Comércio varejista"]
        }
        
        requests.post(f"{BASE_URL}/api/constituicao/gerar-contrato", headers=self.headers, json=contract_data)
        
        # Download PDF
        response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/pdf",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PDF download failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should have content
        print(f"✓ PDF downloaded successfully ({len(response.content)} bytes)")
    
    def test_08_download_word(self):
        """Test Word download for generated contract"""
        # Create and generate a contract first
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Word Download Test"
            }
        )
        minuta_id = minuta_response.json()["id"]
        
        # Generate contract
        contract_data = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST_WORD EMPRESA LTDA",
                "capital_social": "20.000,00",
                "capital_extenso": "vinte mil reais",
                "endereco": {"logradouro": "Rua Y", "numero": "2", "bairro": "Centro", "cidade": "RJ", "estado": "RJ"},
                "objeto_social": "Prestação de serviços."
            },
            "socios": [
                {"nome": "TEST_SOCIO WORD", "cpf": "444.444.444-44", "participacao": "100", "administrador": True}
            ],
            "cnaes": ["69.20-6-01 - Atividades de contabilidade"]
        }
        
        requests.post(f"{BASE_URL}/api/constituicao/gerar-contrato", headers=self.headers, json=contract_data)
        
        # Download Word
        response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/word",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Word download failed: {response.status_code}"
        assert "wordprocessingml" in response.headers.get("content-type", "")
        assert len(response.content) > 1000  # Word should have content
        print(f"✓ Word downloaded successfully ({len(response.content)} bytes)")
    
    def test_09_list_minutas_includes_constituicao(self):
        """Test that constituição minutas appear in the list"""
        response = requests.get(
            f"{BASE_URL}/api/minutas",
            headers=self.headers
        )
        
        assert response.status_code == 200
        minutas = response.json()
        assert isinstance(minutas, list)
        
        # Check if any constituição minutas exist
        constituicao_minutas = [m for m in minutas if m.get("tipo_alteracao") == "constituicao"]
        print(f"✓ Found {len(constituicao_minutas)} constituição minutas in list")
    
    def test_10_participacao_validation(self):
        """Test that participação percentages are handled correctly"""
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Participação Test"
            }
        )
        minuta_id = minuta_response.json()["id"]
        
        # Test with 3 partners with different percentages
        contract_data = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST_TRES SOCIOS LTDA",
                "capital_social": "100.000,00",
                "capital_extenso": "cem mil reais",
                "endereco": {"logradouro": "Rua Z", "numero": "3", "bairro": "Centro", "cidade": "SP", "estado": "SP"},
                "objeto_social": "Consultoria empresarial."
            },
            "socios": [
                {"nome": "TEST_SOCIO A", "cpf": "555.555.555-55", "participacao": "40", "administrador": True},
                {"nome": "TEST_SOCIO B", "cpf": "666.666.666-66", "participacao": "35", "administrador": True},
                {"nome": "TEST_SOCIO C", "cpf": "777.777.777-77", "participacao": "25", "administrador": False}
            ],
            "cnaes": ["70.20-4-00 - Atividades de consultoria"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-contrato",
            headers=self.headers,
            json=contract_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "TEST_SOCIO A" in data["contrato"]
        assert "TEST_SOCIO B" in data["contrato"]
        assert "TEST_SOCIO C" in data["contrato"]
        # Check that quotas are calculated (40% of 100k = 40k quotas)
        assert "40.000" in data["contrato"] or "40000" in data["contrato"]
        print("✓ Multiple partners with different participação handled correctly")


class TestConstituicaoEdgeCases:
    """Edge case tests for constituição"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_unauthorized_access(self):
        """Test that endpoints require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-objeto-social",
            json={"cnaes": ["test"]}
        )
        assert response.status_code == 401
        print("✓ Unauthorized access correctly blocked")
    
    def test_married_partner_with_regime(self):
        """Test that married partners include regime de casamento"""
        minuta_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers={"Authorization": f"Bearer {self.token}"},
            data={
                "tipo_alteracao": "constituicao",
                "descricao": "TEST_Casado Test"
            }
        )
        minuta_id = minuta_response.json()["id"]
        
        contract_data = {
            "minuta_id": minuta_id,
            "empresa": {
                "razao_social": "TEST_CASADO LTDA",
                "capital_social": "30.000,00",
                "capital_extenso": "trinta mil reais",
                "endereco": {"logradouro": "Rua W", "numero": "4", "bairro": "Centro", "cidade": "SP", "estado": "SP"},
                "objeto_social": "Comércio."
            },
            "socios": [
                {
                    "nome": "TEST_SOCIO CASADO",
                    "cpf": "888.888.888-88",
                    "estado_civil": "Casado(a)",
                    "regime_casamento": "Separação Total de Bens",
                    "participacao": "100",
                    "administrador": True
                }
            ],
            "cnaes": ["47.11-3-02 - Comércio"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/constituicao/gerar-contrato",
            headers=self.headers,
            json=contract_data
        )
        
        assert response.status_code == 200
        data = response.json()
        # Check that regime de casamento is mentioned
        assert "casado" in data["contrato"].lower()
        assert "separação" in data["contrato"].lower() or "Separação" in data["contrato"]
        print("✓ Married partner with regime de casamento handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
