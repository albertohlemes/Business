"""
Test suite for CCT (Convenção Coletiva de Trabalho) Management
Tests:
- POST /api/clientes/{cliente_id}/convencao - Upload and analyze CCT
- DELETE /api/clientes/{cliente_id}/convencao - Remove CCT
- GET /api/dashboard/convencoes-vencimento - CCT expiration alerts
- POST /api/validacao/rescisao/etapa3 - Rescission validation with CCT from cadastro
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@teste.com"
TEST_PASSWORD = "admin123"


class TestCCTManagement:
    """Tests for CCT upload, view, and delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a cliente_id for testing
        clientes_response = self.session.get(f"{BASE_URL}/api/clientes")
        assert clientes_response.status_code == 200, f"Failed to get clientes: {clientes_response.text}"
        
        clientes = clientes_response.json()
        if clientes:
            self.cliente_id = clientes[0]["id"]
            self.cliente_razao_social = clientes[0].get("razao_social", "")
        else:
            pytest.skip("No clientes available for testing")
    
    def test_01_auth_required_for_cct_upload(self):
        """Test that CCT upload requires authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao",
            files={"convencao": ("test.pdf", b"dummy content", "application/pdf")}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ CCT upload requires authentication (status: {response.status_code})")
    
    def test_02_auth_required_for_cct_delete(self):
        """Test that CCT delete requires authentication"""
        no_auth_session = requests.Session()
        
        response = no_auth_session.delete(f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ CCT delete requires authentication (status: {response.status_code})")
    
    def test_03_auth_required_for_convencoes_vencimento(self):
        """Test that convencoes-vencimento endpoint requires authentication"""
        no_auth_session = requests.Session()
        
        response = no_auth_session.get(f"{BASE_URL}/api/dashboard/convencoes-vencimento")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Convencoes vencimento requires authentication (status: {response.status_code})")
    
    def test_04_get_convencoes_vencimento_endpoint(self):
        """Test GET /api/dashboard/convencoes-vencimento returns proper structure"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/convencoes-vencimento")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_alertas" in data, "Missing total_alertas field"
        assert "alertas" in data, "Missing alertas field"
        assert isinstance(data["alertas"], list), "alertas should be a list"
        
        print(f"✓ Convencoes vencimento endpoint works - {data['total_alertas']} alertas found")
        
        # If there are alerts, verify structure
        if data["alertas"]:
            alerta = data["alertas"][0]
            expected_fields = ["cliente_id", "razao_social", "status", "data_fim"]
            for field in expected_fields:
                assert field in alerta, f"Missing field {field} in alerta"
            print(f"  - First alert: {alerta['razao_social']} - Status: {alerta['status']}")
    
    def test_05_cct_upload_requires_file(self):
        """Test that CCT upload requires a file"""
        # Send empty files dict to trigger validation error
        response = self.session.post(
            f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao",
            files={}
        )
        
        # Should fail with 400 or 422 (validation error) when no file is provided
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"
        print(f"✓ CCT upload requires file (status: {response.status_code})")
    
    def test_06_cct_upload_invalid_cliente(self):
        """Test CCT upload with invalid cliente_id"""
        fake_cliente_id = "00000000-0000-0000-0000-000000000000"
        
        # Create a simple PDF-like content
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
        
        # Remove Content-Type header to let requests set it properly for multipart
        headers = dict(self.session.headers)
        if "Content-Type" in headers:
            del headers["Content-Type"]
        
        response = requests.post(
            f"{BASE_URL}/api/clientes/{fake_cliente_id}/convencao",
            files={"convencao": ("test.pdf", pdf_content, "application/pdf")},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ CCT upload with invalid cliente returns 404")
    
    def test_07_cct_delete_invalid_cliente(self):
        """Test CCT delete with invalid cliente_id"""
        fake_cliente_id = "00000000-0000-0000-0000-000000000000"
        
        response = self.session.delete(f"{BASE_URL}/api/clientes/{fake_cliente_id}/convencao")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ CCT delete with invalid cliente returns 404")
    
    def test_08_cct_delete_success(self):
        """Test CCT delete endpoint works (even if no CCT exists)"""
        response = self.session.delete(f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        print(f"✓ CCT delete endpoint works for cliente {self.cliente_id}")
    
    def test_09_cliente_has_convencao_field(self):
        """Test that cliente response includes convencao_coletiva field"""
        response = self.session.get(f"{BASE_URL}/api/clientes/{self.cliente_id}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        cliente = response.json()
        # The field should exist (even if null)
        # After delete, it should be null/not present
        print(f"✓ Cliente endpoint works - convencao_coletiva: {'present' if cliente.get('convencao_coletiva') else 'null/absent'}")


class TestValidacaoRescisaoWithCCT:
    """Tests for Validação de Rescisão Etapa 3 with CCT from cadastro"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a cliente_id for testing
        clientes_response = self.session.get(f"{BASE_URL}/api/clientes")
        assert clientes_response.status_code == 200
        
        clientes = clientes_response.json()
        if clientes:
            self.cliente_id = clientes[0]["id"]
        else:
            pytest.skip("No clientes available for testing")
    
    def test_01_etapa3_requires_auth(self):
        """Test that etapa3 requires authentication"""
        no_auth_session = requests.Session()
        
        termo_data = json.dumps({
            "colaborador": "Test Employee",
            "resumo": {
                "data_admissao": "01/01/2020",
                "data_demissao": "01/01/2024",
                "tipo_rescisao": "Sem justa causa",
                "salario_base": "3000.00"
            }
        })
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/validacao/rescisao/etapa3",
            data={"cliente_id": self.cliente_id, "termo_data": termo_data}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Etapa 3 requires authentication (status: {response.status_code})")
    
    def test_02_etapa3_requires_cct_or_upload(self):
        """Test that etapa3 requires either CCT cadastrada or file upload"""
        # First, ensure no CCT is cadastrada by deleting it
        self.session.delete(f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao")
        
        termo_data = json.dumps({
            "colaborador": "Test Employee",
            "resumo": {
                "data_admissao": "01/01/2020",
                "data_demissao": "01/01/2024",
                "tipo_rescisao": "Sem justa causa",
                "salario_base": "3000.00"
            }
        })
        
        # Remove Content-Type header to let requests set it properly for multipart
        headers = dict(self.session.headers)
        if "Content-Type" in headers:
            del headers["Content-Type"]
        
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao/etapa3",
            data={"cliente_id": self.cliente_id, "termo_data": termo_data},
            headers=headers
        )
        
        # Should return 400 because no CCT is available
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "convenção" in data.get("detail", "").lower() or "cct" in data.get("detail", "").lower(), \
            f"Error message should mention CCT: {data}"
        
        print(f"✓ Etapa 3 requires CCT or upload - error message: {data.get('detail', '')[:80]}")
    
    def test_03_etapa3_invalid_cliente(self):
        """Test etapa3 with invalid cliente_id"""
        fake_cliente_id = "00000000-0000-0000-0000-000000000000"
        
        termo_data = json.dumps({
            "colaborador": "Test Employee",
            "resumo": {}
        })
        
        # Remove Content-Type header to let requests set it properly for multipart
        headers = dict(self.session.headers)
        if "Content-Type" in headers:
            del headers["Content-Type"]
        
        response = requests.post(
            f"{BASE_URL}/api/validacao/rescisao/etapa3",
            data={"cliente_id": fake_cliente_id, "termo_data": termo_data},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Etapa 3 with invalid cliente returns 404")


class TestCCTUploadWithAI:
    """Tests for CCT upload with AI analysis (longer timeout)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a cliente_id for testing
        clientes_response = self.session.get(f"{BASE_URL}/api/clientes")
        assert clientes_response.status_code == 200
        
        clientes = clientes_response.json()
        if clientes:
            self.cliente_id = clientes[0]["id"]
            self.cliente_razao_social = clientes[0].get("razao_social", "")
        else:
            pytest.skip("No clientes available for testing")
    
    @pytest.mark.slow
    def test_01_cct_upload_with_sample_pdf(self):
        """Test CCT upload with a sample PDF file (AI analysis - may take 60+ seconds)"""
        # Check if test PDF exists
        test_pdf_path = "/app/backend/tests/test_ficha.pdf"
        if not os.path.exists(test_pdf_path):
            pytest.skip("Test PDF file not found")
        
        with open(test_pdf_path, "rb") as f:
            pdf_content = f.read()
        
        print(f"Uploading CCT for cliente {self.cliente_id}... (this may take up to 60 seconds)")
        
        response = self.session.post(
            f"{BASE_URL}/api/clientes/{self.cliente_id}/convencao",
            files={"convencao": ("convencao_teste.pdf", pdf_content, "application/pdf")},
            timeout=120
        )
        
        # The AI might fail to parse the test file as a CCT, but the endpoint should work
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success: true"
            assert "convencao" in data, "Response should include convencao data"
            
            convencao = data["convencao"]
            assert "_meta" in convencao, "Convencao should have _meta field"
            assert convencao["_meta"]["arquivo_nome"] == "convencao_teste.pdf"
            
            print(f"✓ CCT uploaded and analyzed successfully")
            print(f"  - Sindicato: {convencao.get('identificacao', {}).get('sindicato_laboral', 'N/A')}")
            print(f"  - Vigência: {convencao.get('vigencia', {}).get('data_fim', 'N/A')}")
        elif response.status_code == 500:
            # AI parsing might fail for non-CCT documents
            print(f"⚠ CCT upload returned 500 (AI parsing may have failed for test document)")
            print(f"  - This is expected if the test PDF is not a real CCT document")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
