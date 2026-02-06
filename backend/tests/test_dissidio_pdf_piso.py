"""
Test suite for new dissídio features:
1. GET /api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf - Export PDF from existing calculation
2. POST /api/dissidio/calcular-retroativo - Retroactive calculation with piso salarial validation
"""
import pytest
import requests
import os
import json
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@teste.com"
TEST_PASSWORD = "admin123"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestExportarConvencaoPDF(TestAuth):
    """Tests for GET /api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf"""
    
    def test_export_pdf_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/calculos-dissidio/fake-id/exportar-convencao-pdf")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ PDF export requires authentication (403 without token)")
    
    def test_export_pdf_not_found(self, auth_headers):
        """Test 404 for non-existent calculation"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/non-existent-id/exportar-convencao-pdf",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PDF export returns 404 for non-existent calculation")
    
    def test_list_calculos_dissidio(self, auth_headers):
        """Test listing existing calculations"""
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of calculations"
        print(f"✓ Listed {len(data)} existing calculations")
        return data
    
    def test_export_pdf_from_existing_calculo(self, auth_headers):
        """Test PDF export from an existing calculation (if any)"""
        # First, list existing calculations
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        
        if not calculos:
            pytest.skip("No existing calculations to test PDF export")
        
        # Find a calculation with dados_convencao
        calculo_with_convencao = None
        for calc in calculos:
            if calc.get('dados_convencao'):
                calculo_with_convencao = calc
                break
        
        if not calculo_with_convencao:
            # Try to export from first calculation anyway to test error handling
            calculo_id = calculos[0]['id']
            response = requests.get(
                f"{BASE_URL}/api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf",
                headers=auth_headers
            )
            # Should return 400 if no dados_convencao
            if response.status_code == 400:
                print("✓ PDF export returns 400 when calculation has no convention data")
                return
            pytest.skip("No calculation with convention data found")
        
        # Export PDF
        calculo_id = calculo_with_convencao['id']
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/{calculo_id}/exportar-convencao-pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', \
            f"Expected PDF content-type, got {response.headers.get('content-type')}"
        assert len(response.content) > 0, "PDF content should not be empty"
        
        # Verify PDF header
        assert response.content[:4] == b'%PDF', "Response should be a valid PDF"
        print(f"✓ PDF exported successfully ({len(response.content)} bytes)")


class TestCalcularRetroativo(TestAuth):
    """Tests for POST /api/dissidio/calcular-retroativo"""
    
    def test_calcular_retroativo_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/dissidio/calcular-retroativo")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Calcular retroativo requires authentication (403 without token)")
    
    def test_calcular_retroativo_requires_files(self, auth_headers):
        """Test that endpoint requires holerite files"""
        # Remove Content-Type for multipart
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers=headers,
            data={
                "convencao_dados": json.dumps({"percentual_reajuste": 5}),
                "cliente_id": "test-cliente"
            }
        )
        # Should fail because holerites is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Calcular retroativo requires holerite files (422 without)")
    
    def test_calcular_retroativo_requires_cliente(self, auth_headers):
        """Test that endpoint requires cliente_id"""
        headers = {"Authorization": auth_headers["Authorization"]}
        
        # Create a dummy file
        dummy_file = io.BytesIO(b"dummy content")
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers=headers,
            data={
                "convencao_dados": json.dumps({"percentual_reajuste": 5})
            },
            files={"holerites": ("test.pdf", dummy_file, "application/pdf")}
        )
        # Should fail because cliente_id is required
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Calcular retroativo requires cliente_id (422 without)")
    
    def test_calcular_retroativo_invalid_cliente(self, auth_headers):
        """Test with non-existent cliente"""
        headers = {"Authorization": auth_headers["Authorization"]}
        
        # Create a dummy file
        dummy_file = io.BytesIO(b"dummy content")
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers=headers,
            data={
                "convencao_dados": json.dumps({"percentual_reajuste": 5}),
                "cliente_id": "non-existent-cliente-id"
            },
            files={"holerites": ("test.pdf", dummy_file, "application/pdf")}
        )
        # Should return 404 for non-existent cliente
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Calcular retroativo returns 404 for non-existent cliente")
    
    def test_calcular_retroativo_requires_percentual(self, auth_headers):
        """Test that percentual_reajuste is required"""
        headers = {"Authorization": auth_headers["Authorization"]}
        
        # First get a valid cliente
        response = requests.get(
            f"{BASE_URL}/api/clientes",
            headers=auth_headers
        )
        clientes = response.json()
        
        if not clientes:
            pytest.skip("No clientes available for testing")
        
        cliente_id = clientes[0]['id']
        
        # Create a dummy file
        dummy_file = io.BytesIO(b"dummy content")
        
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers=headers,
            data={
                "convencao_dados": json.dumps({}),  # No percentual
                "cliente_id": cliente_id
            },
            files={"holerites": ("test.pdf", dummy_file, "application/pdf")}
        )
        # Should return 400 for missing percentual
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "percentual" in data.get("detail", "").lower(), \
            f"Error should mention percentual: {data}"
        print("✓ Calcular retroativo returns 400 when percentual is missing")


class TestAlertasPiso(TestAuth):
    """Tests for piso salarial validation in calcular-retroativo"""
    
    def test_response_includes_alertas_piso_field(self, auth_headers):
        """Verify that the response structure includes alertas_piso field"""
        # Check existing calculations for alertas_piso field
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculos = response.json()
        
        if not calculos:
            pytest.skip("No existing calculations to verify alertas_piso structure")
        
        # Get details of first calculation
        calculo_id = calculos[0]['id']
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/{calculo_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        calculo = response.json()
        
        # Verify alertas_piso field exists in response
        assert "alertas_piso" in calculo, "Response should include alertas_piso field"
        assert isinstance(calculo["alertas_piso"], list), "alertas_piso should be a list"
        print(f"✓ Calculation includes alertas_piso field (found {len(calculo['alertas_piso'])} alerts)")
        
        # If there are alerts, verify structure
        if calculo["alertas_piso"]:
            alert = calculo["alertas_piso"][0]
            expected_fields = ['colaborador', 'tipo', 'mensagem', 'salario_calculado', 'piso_aplicavel']
            for field in expected_fields:
                assert field in alert, f"Alert should include '{field}' field"
            print(f"✓ Alert structure is correct with fields: {list(alert.keys())}")


class TestEndpointAvailability:
    """Basic endpoint availability tests"""
    
    def test_calculos_dissidio_list_endpoint(self):
        """Test that calculos-dissidio list endpoint exists"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/calculos-dissidio endpoint is available")
    
    def test_exportar_convencao_pdf_endpoint_exists(self):
        """Test that exportar-convencao-pdf endpoint exists"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Test with fake ID - should return 404, not 405 (method not allowed)
        response = requests.get(
            f"{BASE_URL}/api/calculos-dissidio/test-id/exportar-convencao-pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        # 404 means endpoint exists but resource not found
        assert response.status_code in [404, 400], \
            f"Expected 404 or 400, got {response.status_code}"
        print("✓ GET /api/calculos-dissidio/{id}/exportar-convencao-pdf endpoint exists")
    
    def test_calcular_retroativo_endpoint_exists(self):
        """Test that calcular-retroativo endpoint exists"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "senha": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Test without required fields - should return 422, not 405
        response = requests.post(
            f"{BASE_URL}/api/dissidio/calcular-retroativo",
            headers={"Authorization": f"Bearer {token}"}
        )
        # 422 means endpoint exists but validation failed
        assert response.status_code == 422, \
            f"Expected 422, got {response.status_code}"
        print("✓ POST /api/dissidio/calcular-retroativo endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
