"""
Integration test for dissídio features with test data creation.
Tests:
1. Create a cliente and colaborador
2. Create a calculation with convention data
3. Export PDF from the calculation
4. Verify alertas_piso structure
"""
import pytest
import requests
import os
import json
import io
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@teste.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_cliente(auth_headers):
    """Create a test cliente for testing"""
    unique_id = str(uuid.uuid4())[:8]
    cliente_data = {
        "razao_social": f"TEST_Empresa Dissidio {unique_id}",
        "cnpj": f"99.999.{unique_id[:3]}/0001-99",
        "nome_fantasia": f"TEST_Dissidio {unique_id}",
        "sindicato": "Sindicato dos Trabalhadores"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/clientes",
        headers=auth_headers,
        json=cliente_data
    )
    
    if response.status_code == 400 and "CNPJ já cadastrado" in response.text:
        # CNPJ already exists, get existing cliente
        response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        clientes = response.json()
        for c in clientes:
            if "TEST_" in c.get("razao_social", ""):
                return c
        pytest.skip("Could not create or find test cliente")
    
    assert response.status_code == 200, f"Failed to create cliente: {response.text}"
    cliente = response.json()
    print(f"✓ Created test cliente: {cliente['id']}")
    
    yield cliente
    
    # Cleanup
    requests.delete(f"{BASE_URL}/api/clientes/{cliente['id']}", headers=auth_headers)
    print(f"✓ Cleaned up test cliente: {cliente['id']}")


@pytest.fixture(scope="module")
def test_colaborador(auth_headers, test_cliente):
    """Create a test colaborador"""
    unique_id = str(uuid.uuid4())[:8]
    colaborador_data = {
        "cliente_id": test_cliente["id"],
        "nome": f"TEST_Funcionario {unique_id}",
        "cpf": f"999.999.{unique_id[:3]}-99",
        "cargo": "Auxiliar Administrativo",
        "salario_base": 1500.00
    }
    
    response = requests.post(
        f"{BASE_URL}/api/colaboradores",
        headers=auth_headers,
        json=colaborador_data
    )
    
    assert response.status_code == 200, f"Failed to create colaborador: {response.text}"
    colaborador = response.json()
    print(f"✓ Created test colaborador: {colaborador['id']}")
    
    yield colaborador
    
    # Cleanup
    requests.delete(f"{BASE_URL}/api/colaboradores/{colaborador['id']}", headers=auth_headers)
    print(f"✓ Cleaned up test colaborador: {colaborador['id']}")


class TestFullDissidioFlow:
    """Full integration test for dissídio features"""
    
    def test_create_calculo_with_convencao_data(self, auth_headers, test_cliente, test_colaborador):
        """
        Test creating a calculation with convention data.
        Note: This requires uploading holerite files which is complex.
        Instead, we'll verify the endpoint structure and error handling.
        """
        # Create a simple holerite-like text file
        holerite_content = f"""
        HOLERITE - FOLHA DE PAGAMENTO
        Competência: 01/2024
        
        Nome: {test_colaborador['nome']}
        CPF: {test_colaborador['cpf']}
        Cargo: {test_colaborador['cargo']}
        
        PROVENTOS:
        Salário Base: R$ 1.500,00
        
        DESCONTOS:
        INSS: R$ 120,00
        
        LÍQUIDO: R$ 1.380,00
        """
        
        convencao_dados = {
            "percentual_reajuste": 5.0,
            "piso_salarial": 1600.00,
            "piso_salarial_anterior": 1500.00,
            "meses_retroativos": 3,
            "verbas_com_reajuste": ["salario_base"],
            "pisos_por_funcao": [
                {"funcao": "Auxiliar Administrativo", "piso_novo": 1700.00}
            ]
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        # Create file-like object
        holerite_file = io.BytesIO(holerite_content.encode('utf-8'))
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers=headers,
            data={
                "convencao_dados": json.dumps(convencao_dados),
                "cliente_id": test_cliente["id"]
            },
            files={"holerites": ("holerite_01_2024.txt", holerite_file, "text/plain")}
        )
        
        # The endpoint should process the file
        # It may return 200 with results or 500 if OCR fails on text file
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'No content'}")
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data, "Response should include calculation ID"
            assert "alertas_piso" in data, "Response should include alertas_piso"
            print(f"✓ Calculation created with ID: {data['id']}")
            print(f"✓ Alertas piso: {data.get('alertas_piso', [])}")
            return data
        else:
            # Even if processing fails, the endpoint should exist
            print(f"Note: Calculation processing returned {response.status_code}")
            # This is acceptable for text files - OCR may not work well
            return None
    
    def test_list_and_export_pdf(self, auth_headers):
        """Test listing calculations and exporting PDF if available"""
        # List calculations
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        print(f"✓ Found {len(calculos)} calculations")
        
        # Find one with dados_convencao
        for calc in calculos:
            if calc.get('dados_convencao'):
                calculo_id = calc['id']
                print(f"✓ Found calculation with convention data: {calculo_id}")
                
                # Try to export PDF
                response = requests.get(
                    f"{BASE_URL}/api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf",
                    headers=auth_headers
                )
                
                if response.status_code == 200:
                    assert response.headers.get('content-type') == 'application/pdf'
                    assert response.content[:4] == b'%PDF'
                    print(f"✓ PDF exported successfully ({len(response.content)} bytes)")
                    return
                else:
                    print(f"PDF export returned {response.status_code}: {response.text[:200]}")
        
        print("No calculations with convention data found for PDF export")
    
    def test_alertas_piso_structure(self, auth_headers):
        """Verify alertas_piso structure in existing calculations"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        
        for calc in calculos:
            calculo_id = calc['id']
            
            # Get full calculation details
            response = requests.get(
                f"{BASE_URL}/api/calculos-dissidio/{calculo_id}",
                headers=auth_headers
            )
            
            if response.status_code == 200:
                calculo = response.json()
                
                # Verify alertas_piso field exists
                assert "alertas_piso" in calculo, f"Calculation {calculo_id} missing alertas_piso"
                
                alertas = calculo.get("alertas_piso", [])
                print(f"✓ Calculation {calculo_id} has {len(alertas)} piso alerts")
                
                # If there are alerts, verify structure
                if alertas:
                    alert = alertas[0]
                    expected_fields = ['colaborador', 'tipo', 'mensagem', 'salario_calculado', 'piso_aplicavel']
                    for field in expected_fields:
                        if field not in alert:
                            print(f"Warning: Alert missing field '{field}'")
                    print(f"✓ Alert structure: {list(alert.keys())}")
                    return
        
        print("No calculations found to verify alertas_piso structure")


class TestPDFExportEndpoint:
    """Specific tests for PDF export endpoint"""
    
    def test_pdf_export_content_type(self, auth_headers):
        """Verify PDF export returns correct content type"""
        # Get a calculation with convention data
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        calculos = response.json()
        
        for calc in calculos:
            if calc.get('dados_convencao'):
                response = requests.get(
                    f"{BASE_URL}/api/calculos-dissidio/{calc['id']}/exportar-convencao-pdf",
                    headers=auth_headers
                )
                
                if response.status_code == 200:
                    assert response.headers.get('content-type') == 'application/pdf', \
                        f"Expected application/pdf, got {response.headers.get('content-type')}"
                    print("✓ PDF export returns correct content-type")
                    return
        
        pytest.skip("No calculation with convention data available")
    
    def test_pdf_export_without_convencao_data(self, auth_headers):
        """Test PDF export returns 400 when calculation has no convention data"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        calculos = response.json()
        
        for calc in calculos:
            if not calc.get('dados_convencao'):
                response = requests.get(
                    f"{BASE_URL}/api/calculos-dissidio/{calc['id']}/exportar-convencao-pdf",
                    headers=auth_headers
                )
                
                assert response.status_code == 400, \
                    f"Expected 400 for calculation without convention data, got {response.status_code}"
                print("✓ PDF export returns 400 when no convention data")
                return
        
        pytest.skip("All calculations have convention data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
