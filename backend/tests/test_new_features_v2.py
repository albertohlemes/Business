"""
Test suite for new features (iteration 14):
- PDF Export: POST /api/convencao/exportar-resumo-pdf
- Conversão Apontamentos: POST /api/conversao/apontamentos
- Conversão Admissional: POST /api/conversao/admissional
- Validação Rescisão: POST /api/validacao/rescisao
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@teste.com",
        "senha": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture(scope="module")
def cliente_id(auth_headers):
    """Get or create a test cliente"""
    # First try to get existing clientes
    response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["id"]
    
    # Create a test cliente if none exists
    response = requests.post(f"{BASE_URL}/api/clientes", headers=auth_headers, json={
        "razao_social": "TEST_Empresa Teste LTDA",
        "cnpj": "99.999.999/0001-99",
        "nome_fantasia": "Empresa Teste"
    })
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Could not get or create cliente")


class TestPDFExport:
    """Tests for PDF export endpoint"""
    
    def test_exportar_resumo_pdf_success(self, auth_headers, cliente_id):
        """Test PDF export with valid convention data"""
        dados_convencao = {
            "sindicato": "Sindicato dos Trabalhadores",
            "categoria": "Comerciários",
            "data_base": "05/2025",
            "mes_convencao": "08/2025",
            "percentual_reajuste": 5.5,
            "meses_retroativos": 3,
            "piso_salarial": 1500.00,
            "piso_salarial_anterior": 1412.00,
            "verbas_com_reajuste": ["salario_base", "horas_extras"],
            "verbas_sem_reajuste": ["vale_transporte"],
            "beneficios": [
                {"nome": "Vale Refeição", "valor_anterior": 25.00, "valor_novo": 28.00}
            ],
            "descontos": [],
            "resumo": "Convenção coletiva 2025/2026"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/convencao/exportar-resumo-pdf",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"dados_convencao": dados_convencao, "cliente_id": cliente_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf" or "pdf" in response.headers.get("content-type", "").lower()
        assert len(response.content) > 1000, "PDF should have substantial content"
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response should be a valid PDF"
    
    def test_exportar_resumo_pdf_without_cliente(self, auth_headers):
        """Test PDF export without cliente_id (should still work)"""
        dados_convencao = {
            "sindicato": "Sindicato Teste",
            "percentual_reajuste": 4.0,
            "data_base": "01/2025"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/convencao/exportar-resumo-pdf",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"dados_convencao": dados_convencao}
        )
        
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
    
    def test_exportar_resumo_pdf_unauthorized(self):
        """Test PDF export without auth token"""
        response = requests.post(
            f"{BASE_URL}/api/convencao/exportar-resumo-pdf",
            json={"dados_convencao": {"sindicato": "Test"}}
        )
        
        assert response.status_code in [401, 403]


class TestConversaoApontamentos:
    """Tests for apontamentos conversion endpoint"""
    
    def test_conversao_apontamentos_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/conversao/apontamentos")
        assert response.status_code in [401, 403]
    
    def test_conversao_apontamentos_requires_files(self, auth_headers, cliente_id):
        """Test that endpoint requires files"""
        response = requests.post(
            f"{BASE_URL}/api/conversao/apontamentos",
            headers=auth_headers,
            data={"cliente_id": cliente_id, "competencia": "01/2025"}
        )
        # Should fail because no files provided
        assert response.status_code == 422
    
    def test_conversao_apontamentos_requires_cliente_id(self, auth_headers):
        """Test that endpoint requires cliente_id"""
        # Create a simple test file
        files = {"arquivos": ("test.txt", io.BytesIO(b"Test content"), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/conversao/apontamentos",
            headers=auth_headers,
            files=files,
            data={"competencia": "01/2025"}
        )
        # Should fail because no cliente_id
        assert response.status_code == 422
    
    def test_conversao_apontamentos_with_text_file(self, auth_headers, cliente_id):
        """Test conversion with a simple text file (may fail AI processing but endpoint should work)"""
        # Create a simple test file with apontamentos data
        test_content = """
        Apontamentos Janeiro 2025
        João Silva - 10 horas extras 50%, 2 faltas
        Maria Santos - 5 horas extras 100%
        """
        files = {"arquivos": ("apontamentos.txt", io.BytesIO(test_content.encode()), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/conversao/apontamentos",
            headers=auth_headers,
            files=files,
            data={"cliente_id": cliente_id, "competencia": "01/2025"},
            timeout=120
        )
        
        # Endpoint should return 200 even if AI processing has issues
        assert response.status_code == 200
        data = response.json()
        # Should have success field
        assert "success" in data


class TestConversaoAdmissional:
    """Tests for admissional conversion endpoint"""
    
    def test_conversao_admissional_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/conversao/admissional")
        assert response.status_code in [401, 403]
    
    def test_conversao_admissional_requires_files(self, auth_headers, cliente_id):
        """Test that endpoint requires files"""
        response = requests.post(
            f"{BASE_URL}/api/conversao/admissional",
            headers=auth_headers,
            data={"cliente_id": cliente_id}
        )
        assert response.status_code == 422
    
    def test_conversao_admissional_requires_cliente_id(self, auth_headers):
        """Test that endpoint requires cliente_id"""
        files = {"arquivos": ("test.txt", io.BytesIO(b"Test"), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/conversao/admissional",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 422
    
    def test_conversao_admissional_with_text_file(self, auth_headers, cliente_id):
        """Test conversion with a simple text file"""
        test_content = """
        Ficha de Admissão
        Nome: João da Silva
        CPF: 123.456.789-00
        RG: 12.345.678-9 SSP/SP
        Data Nascimento: 15/03/1990
        Cargo: Auxiliar Administrativo
        Salário: R$ 2.500,00
        Data Admissão: 01/02/2025
        """
        files = {"arquivos": ("ficha_admissao.txt", io.BytesIO(test_content.encode()), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/conversao/admissional",
            headers=auth_headers,
            files=files,
            data={"cliente_id": cliente_id},
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data


class TestValidacaoRescisao:
    """Tests for rescisao validation endpoint"""
    
    def test_validacao_rescisao_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/validacao/rescisao")
        assert response.status_code in [401, 403]
    
    def test_validacao_rescisao_requires_termo(self, auth_headers, cliente_id):
        """Test that endpoint requires termo_rescisao file"""
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao",
            headers=auth_headers,
            data={"cliente_id": cliente_id}
        )
        assert response.status_code == 422
    
    def test_validacao_rescisao_requires_cliente_id(self, auth_headers):
        """Test that endpoint requires cliente_id"""
        files = {"termo_rescisao": ("termo.txt", io.BytesIO(b"Test"), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == 422
    
    def test_validacao_rescisao_with_termo_only(self, auth_headers, cliente_id):
        """Test validation with only termo_rescisao (minimum required)"""
        test_content = """
        TERMO DE RESCISÃO DO CONTRATO DE TRABALHO
        
        Empregador: Empresa Teste LTDA
        Empregado: Maria Santos
        CPF: 987.654.321-00
        
        Data Admissão: 01/01/2020
        Data Demissão: 31/12/2024
        Tipo: Sem justa causa
        
        Salário Base: R$ 3.000,00
        
        VERBAS RESCISÓRIAS:
        Saldo de Salário: R$ 3.000,00
        Aviso Prévio Indenizado: R$ 3.000,00
        Férias Vencidas + 1/3: R$ 4.000,00
        Férias Proporcionais + 1/3: R$ 4.000,00
        13º Proporcional: R$ 3.000,00
        Multa 40% FGTS: R$ 4.800,00
        
        Total Bruto: R$ 21.800,00
        Descontos: R$ 1.200,00
        Total Líquido: R$ 20.600,00
        """
        files = {"termo_rescisao": ("termo_rescisao.txt", io.BytesIO(test_content.encode()), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao",
            headers=auth_headers,
            files=files,
            data={"cliente_id": cliente_id},
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
    
    def test_validacao_rescisao_with_all_files(self, auth_headers, cliente_id):
        """Test validation with all optional files"""
        termo_content = "TERMO DE RESCISÃO - João Silva - Demissão sem justa causa"
        convencao_content = "CONVENÇÃO COLETIVA 2024/2025 - Reajuste 5%"
        fgts_content = "EXTRATO FGTS - Saldo: R$ 12.000,00"
        apoio_content = "Documento de apoio - Horas extras do período"
        
        files = [
            ("termo_rescisao", ("termo.txt", io.BytesIO(termo_content.encode()), "text/plain")),
            ("convencao", ("convencao.txt", io.BytesIO(convencao_content.encode()), "text/plain")),
            ("extrato_fgts", ("fgts.txt", io.BytesIO(fgts_content.encode()), "text/plain")),
            ("apoio", ("apoio1.txt", io.BytesIO(apoio_content.encode()), "text/plain")),
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao",
            headers=auth_headers,
            files=files,
            data={"cliente_id": cliente_id},
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data


class TestFrontendRoutes:
    """Test that frontend routes are accessible"""
    
    def test_frontend_loads(self):
        """Test that frontend is accessible"""
        response = requests.get(BASE_URL, timeout=10)
        assert response.status_code == 200
    
    def test_login_page_accessible(self):
        """Test login page is accessible"""
        response = requests.get(f"{BASE_URL}/login", timeout=10)
        # React SPA returns 200 for all routes
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
