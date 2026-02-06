"""
Test suite for Async Polling Validation Feature
Tests the refactored validation system that uses polling to avoid UI blocking:
- POST /api/validacoes/validar-completa - Returns job_id immediately
- GET /api/validacoes/job-status/{job_id} - Returns job status (processing/completed/failed)
- DELETE /api/validacoes/{id} - Individual deletion
- POST /api/validacoes/delete-batch - Batch deletion
"""
import pytest
import requests
import os
import io
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "123456"
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
    
    # Try alternate credentials
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "teste@emergent.com",
        "senha": "Teste123!"
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


@pytest.fixture(scope="module")
def cliente_id(auth_headers):
    """Get or create a cliente for testing"""
    # First try to get existing clientes
    response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
    if response.status_code == 200:
        clientes = response.json()
        if clientes:
            return clientes[0]["id"]
    
    # Create a new cliente if none exists
    response = requests.post(f"{BASE_URL}/api/clientes", headers=auth_headers, json={
        "razao_social": "TEST_Empresa Teste Async",
        "cnpj": "12345678000199",
        "nome_fantasia": "Empresa Teste"
    })
    if response.status_code == 200:
        return response.json()["id"]
    
    pytest.skip("Could not get or create cliente for testing")


class TestAuthAndBasics:
    """Test authentication and basic setup"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "senha": TEST_PASSWORD
        })
        
        # Try alternate credentials if first fails
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "teste@emergent.com",
                "senha": "Teste123!"
            })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful")


class TestAsyncValidationEndpoint:
    """Test POST /api/validacoes/validar-completa returns job_id"""
    
    def test_validar_completa_returns_job_id(self, auth_headers, cliente_id):
        """Test that validar-completa returns job_id immediately"""
        # Create a simple test holerite file
        holerite_content = """
        RECIBO DE PAGAMENTO DE SALÁRIO
        Funcionário: JOÃO DA SILVA
        CPF: 123.456.789-00
        Competência: 01/2026
        
        PROVENTOS:
        Salário Base                    3000.00
        Horas Extras 50%                 450.00
        
        DESCONTOS:
        INSS                             330.00
        Vale Transporte                   90.00
        
        TOTAL PROVENTOS                 3450.00
        TOTAL DESCONTOS                  420.00
        LÍQUIDO                         3030.00
        """
        
        test_file = io.BytesIO(holerite_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_teste.txt", test_file, "text/plain")},
            data={
                "cliente_id": cliente_id,
                "mes_referencia": "01",
                "ano_referencia": 2026
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify job_id is returned
        assert "job_id" in data, f"Response should contain job_id: {data}"
        assert "status" in data, f"Response should contain status: {data}"
        assert data["status"] == "processing", f"Initial status should be 'processing': {data}"
        
        print(f"✓ validar-completa returned job_id: {data['job_id']}")
        return data["job_id"]
    
    def test_validar_completa_requires_cliente_id(self, auth_headers):
        """Test that validar-completa requires cliente_id"""
        test_file = io.BytesIO(b"Test content")
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("test.pdf", test_file, "application/pdf")},
            data={"mes_referencia": "01", "ano_referencia": 2025}
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ validar-completa correctly requires cliente_id")
    
    def test_validar_completa_requires_holerite_atual(self, auth_headers, cliente_id):
        """Test that validar-completa requires holerite_atual file"""
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            data={
                "cliente_id": cliente_id,
                "mes_referencia": "01",
                "ano_referencia": 2025
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ validar-completa correctly requires holerite_atual file")


class TestJobStatusEndpoint:
    """Test GET /api/validacoes/job-status/{job_id}"""
    
    def test_job_status_returns_progress(self, auth_headers, cliente_id):
        """Test that job-status endpoint returns status and progress"""
        # First create a job
        holerite_content = """
        RECIBO DE PAGAMENTO DE SALÁRIO
        Funcionário: MARIA SANTOS
        CPF: 987.654.321-00
        Competência: 01/2026
        
        PROVENTOS:
        Salário Base                    4000.00
        
        DESCONTOS:
        INSS                             440.00
        
        TOTAL PROVENTOS                 4000.00
        TOTAL DESCONTOS                  440.00
        LÍQUIDO                         3560.00
        """
        
        test_file = io.BytesIO(holerite_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_maria.txt", test_file, "text/plain")},
            data={
                "cliente_id": cliente_id,
                "mes_referencia": "01",
                "ano_referencia": 2026
            }
        )
        
        assert response.status_code == 200
        job_id = response.json()["job_id"]
        
        # Check job status
        status_response = requests.get(
            f"{BASE_URL}/api/validacoes/job-status/{job_id}",
            headers=auth_headers
        )
        
        assert status_response.status_code == 200, f"Failed to get job status: {status_response.text}"
        status_data = status_response.json()
        
        # Verify status structure
        assert "job_id" in status_data
        assert "status" in status_data
        assert "progress" in status_data
        assert "step" in status_data
        assert status_data["status"] in ["processing", "completed", "failed"]
        
        print(f"✓ Job status: {status_data['status']}, progress: {status_data['progress']}%, step: {status_data['step']}")
        return job_id
    
    def test_job_status_completes_successfully(self, auth_headers, cliente_id):
        """Test that job completes and returns result"""
        # Create a job
        holerite_content = """
        RECIBO DE PAGAMENTO DE SALÁRIO
        Funcionário: PEDRO OLIVEIRA
        CPF: 111.222.333-44
        Competência: 01/2026
        
        PROVENTOS:
        Salário Base                    2500.00
        
        DESCONTOS:
        INSS                             275.00
        
        TOTAL PROVENTOS                 2500.00
        TOTAL DESCONTOS                  275.00
        LÍQUIDO                         2225.00
        """
        
        test_file = io.BytesIO(holerite_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_pedro.txt", test_file, "text/plain")},
            data={
                "cliente_id": cliente_id,
                "mes_referencia": "01",
                "ano_referencia": 2026
            }
        )
        
        assert response.status_code == 200
        job_id = response.json()["job_id"]
        
        # Poll for completion (max 30 seconds)
        max_attempts = 15
        for attempt in range(max_attempts):
            status_response = requests.get(
                f"{BASE_URL}/api/validacoes/job-status/{job_id}",
                headers=auth_headers
            )
            
            assert status_response.status_code == 200
            status_data = status_response.json()
            
            if status_data["status"] == "completed":
                assert "result" in status_data
                assert status_data["result"] is not None
                assert "id" in status_data["result"]
                print(f"✓ Job completed successfully after {attempt + 1} polls")
                print(f"  - Validation ID: {status_data['result']['id']}")
                print(f"  - Funcionários analisados: {status_data['result'].get('funcionarios_analisados', 0)}")
                return status_data["result"]["id"]
            
            if status_data["status"] == "failed":
                pytest.fail(f"Job failed: {status_data.get('error')}")
            
            time.sleep(2)  # Wait 2 seconds between polls
        
        pytest.fail(f"Job did not complete within {max_attempts * 2} seconds")
    
    def test_job_status_not_found(self, auth_headers):
        """Test that job-status returns 404 for invalid job_id"""
        response = requests.get(
            f"{BASE_URL}/api/validacoes/job-status/invalid-job-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ job-status correctly returns 404 for invalid job_id")


class TestDeleteEndpoints:
    """Test DELETE endpoints for validations"""
    
    def test_delete_individual_validacao(self, auth_headers, cliente_id):
        """Test DELETE /api/validacoes/{id}"""
        # First create a validation to delete
        holerite_content = """
        RECIBO DE PAGAMENTO DE SALÁRIO
        Funcionário: TEST_DELETE_USER
        CPF: 999.888.777-66
        Competência: 01/2026
        
        PROVENTOS:
        Salário Base                    1500.00
        
        TOTAL PROVENTOS                 1500.00
        TOTAL DESCONTOS                    0.00
        LÍQUIDO                         1500.00
        """
        
        test_file = io.BytesIO(holerite_content.encode('utf-8'))
        
        # Create validation
        response = requests.post(
            f"{BASE_URL}/api/validacoes/validar-completa",
            headers=auth_headers,
            files={"holerite_atual": ("holerite_delete.txt", test_file, "text/plain")},
            data={
                "cliente_id": cliente_id,
                "mes_referencia": "01",
                "ano_referencia": 2026
            }
        )
        
        assert response.status_code == 200
        job_id = response.json()["job_id"]
        
        # Wait for completion
        validacao_id = None
        for _ in range(15):
            status_response = requests.get(
                f"{BASE_URL}/api/validacoes/job-status/{job_id}",
                headers=auth_headers
            )
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data["status"] == "completed":
                    validacao_id = status_data["result"]["id"]
                    break
            time.sleep(2)
        
        if not validacao_id:
            pytest.skip("Could not create validation for delete test")
        
        # Delete the validation
        delete_response = requests.delete(
            f"{BASE_URL}/api/validacoes/{validacao_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        data = delete_response.json()
        assert "message" in data
        print(f"✓ Successfully deleted validation {validacao_id}")
        
        # Verify it's deleted
        get_response = requests.get(
            f"{BASE_URL}/api/validacoes/{validacao_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404, "Validation should be deleted"
        print("✓ Verified validation is deleted (404)")
    
    def test_delete_batch_validacoes(self, auth_headers, cliente_id):
        """Test POST /api/validacoes/delete-batch"""
        # Create multiple validations
        validacao_ids = []
        
        for i in range(2):
            holerite_content = f"""
            RECIBO DE PAGAMENTO DE SALÁRIO
            Funcionário: TEST_BATCH_DELETE_{i}
            CPF: {i}11.222.333-44
            Competência: 01/2026
            
            PROVENTOS:
            Salário Base                    1000.00
            
            TOTAL PROVENTOS                 1000.00
            LÍQUIDO                         1000.00
            """
            
            test_file = io.BytesIO(holerite_content.encode('utf-8'))
            
            response = requests.post(
                f"{BASE_URL}/api/validacoes/validar-completa",
                headers=auth_headers,
                files={"holerite_atual": (f"holerite_batch_{i}.txt", test_file, "text/plain")},
                data={
                    "cliente_id": cliente_id,
                    "mes_referencia": "01",
                    "ano_referencia": 2026
                }
            )
            
            if response.status_code == 200:
                job_id = response.json()["job_id"]
                
                # Wait for completion
                for _ in range(15):
                    status_response = requests.get(
                        f"{BASE_URL}/api/validacoes/job-status/{job_id}",
                        headers=auth_headers
                    )
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        if status_data["status"] == "completed":
                            validacao_ids.append(status_data["result"]["id"])
                            break
                    time.sleep(2)
        
        if len(validacao_ids) < 2:
            pytest.skip("Could not create enough validations for batch delete test")
        
        # Batch delete
        delete_response = requests.post(
            f"{BASE_URL}/api/validacoes/delete-batch",
            headers=auth_headers,
            json=validacao_ids
        )
        
        assert delete_response.status_code == 200, f"Batch delete failed: {delete_response.text}"
        data = delete_response.json()
        assert "deleted_count" in data
        assert data["deleted_count"] >= 2
        print(f"✓ Batch deleted {data['deleted_count']} validations")
    
    def test_delete_nonexistent_validacao(self, auth_headers):
        """Test DELETE returns 404 for nonexistent validation"""
        response = requests.delete(
            f"{BASE_URL}/api/validacoes/nonexistent-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ DELETE correctly returns 404 for nonexistent validation")


class TestValidacaoListAndDetails:
    """Test list and details endpoints"""
    
    def test_list_validacoes(self, auth_headers):
        """Test GET /api/validacoes"""
        response = requests.get(f"{BASE_URL}/api/validacoes", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list validacoes: {response.text}"
        validacoes = response.json()
        assert isinstance(validacoes, list)
        print(f"✓ Listed {len(validacoes)} validações")
    
    def test_get_validacao_details(self, auth_headers):
        """Test GET /api/validacoes/{id}"""
        # Get list first
        response = requests.get(f"{BASE_URL}/api/validacoes", headers=auth_headers)
        assert response.status_code == 200
        validacoes = response.json()
        
        if not validacoes:
            pytest.skip("No validations to test details")
        
        validacao_id = validacoes[0]["id"]
        
        # Get details
        detail_response = requests.get(
            f"{BASE_URL}/api/validacoes/{validacao_id}",
            headers=auth_headers
        )
        
        assert detail_response.status_code == 200, f"Failed to get details: {detail_response.text}"
        validacao = detail_response.json()
        
        assert validacao["id"] == validacao_id
        assert "mes_referencia" in validacao
        assert "ano_referencia" in validacao
        assert "status" in validacao
        
        print(f"✓ Got validation details for {validacao_id}")
        if validacao.get("tipo_validacao"):
            print(f"  - Tipo: {validacao['tipo_validacao']}")
        if validacao.get("funcionarios_analisados"):
            print(f"  - Funcionários: {validacao['funcionarios_analisados']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
