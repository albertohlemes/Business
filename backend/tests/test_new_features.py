"""
Test suite for new Portal DP features:
1. Dissídio preview with employee salary details (percentual, salário atual, diferença, novo salário)
2. Informes de Rendimento comparison (eSocial vs SCI Único)
3. Excel reports (Colaboradores, Dissídios, Validações)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@dp.com"
TEST_PASSWORD = "senha123"


class TestAuth:
    """Authentication tests"""
    
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


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "senha": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDissidioPrevia:
    """Tests for Dissídio preview feature"""
    
    def test_list_dissidios(self, auth_headers):
        """Test listing dissídios"""
        response = requests.get(f"{BASE_URL}/api/dissidios", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_dissidio_previa(self, auth_headers):
        """Test getting dissídio preview with employee salary details"""
        # First get list of dissídios
        response = requests.get(f"{BASE_URL}/api/dissidios", headers=auth_headers)
        assert response.status_code == 200
        dissidios = response.json()
        
        if not dissidios:
            pytest.skip("No dissídios available for preview test")
        
        # Get preview for first dissídio
        dissidio_id = dissidios[0]["id"]
        response = requests.get(f"{BASE_URL}/api/dissidios/{dissidio_id}/previa", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Verify preview structure
        assert "dissidio_id" in data
        assert "sindicato" in data
        assert "percentual_reajuste" in data
        assert "colaboradores" in data
        assert "resumo" in data
        
        # Verify resumo structure
        resumo = data["resumo"]
        assert "total_colaboradores" in resumo
        assert "total_salarios_atual" in resumo
        assert "total_salarios_novo" in resumo
        assert "total_diferenca" in resumo
        assert "percentual" in resumo
        
        # Verify colaboradores structure (if any)
        if data["colaboradores"]:
            colab = data["colaboradores"][0]
            assert "nome" in colab
            assert "salario_atual" in colab
            assert "salario_novo" in colab
            assert "diferenca" in colab
            assert "percentual" in colab
    
    def test_previa_not_found(self, auth_headers):
        """Test preview for non-existent dissídio"""
        response = requests.get(f"{BASE_URL}/api/dissidios/non-existent-id/previa", headers=auth_headers)
        assert response.status_code == 404


class TestInformesRendimento:
    """Tests for Informes de Rendimento comparison (eSocial vs SCI Único)"""
    
    def test_informes_historico(self, auth_headers):
        """Test listing comparison history"""
        response = requests.get(f"{BASE_URL}/api/informes/historico", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_informes_comparar_requires_files(self, auth_headers):
        """Test that comparison endpoint requires both files"""
        response = requests.post(f"{BASE_URL}/api/informes/comparar", headers=auth_headers)
        # Should return 422 (validation error) when files are missing
        assert response.status_code == 422


class TestRelatoriosExcel:
    """Tests for Excel report generation"""
    
    def test_relatorio_colaboradores_excel(self, auth_headers):
        """Test downloading colaboradores Excel report"""
        response = requests.get(f"{BASE_URL}/api/relatorios/colaboradores/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        # Verify file has content
        assert len(response.content) > 0
    
    def test_relatorio_colaboradores_excel_with_filter(self, auth_headers):
        """Test downloading colaboradores Excel report with cliente filter"""
        # First get a cliente_id
        clientes_response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        if clientes_response.status_code == 200 and clientes_response.json():
            cliente_id = clientes_response.json()[0]["id"]
            response = requests.get(f"{BASE_URL}/api/relatorios/colaboradores/excel?cliente_id={cliente_id}", headers=auth_headers)
            assert response.status_code == 200
            assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
    
    def test_relatorio_dissidios_excel(self, auth_headers):
        """Test downloading dissídios Excel report"""
        response = requests.get(f"{BASE_URL}/api/relatorios/dissidios/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 0
    
    def test_relatorio_validacoes_excel(self, auth_headers):
        """Test downloading validações Excel report"""
        response = requests.get(f"{BASE_URL}/api/relatorios/validacoes/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        assert len(response.content) > 0
    
    def test_relatorio_dissidio_previa_excel(self, auth_headers):
        """Test downloading dissídio preview Excel report"""
        # First get a dissídio
        dissidios_response = requests.get(f"{BASE_URL}/api/dissidios", headers=auth_headers)
        if dissidios_response.status_code == 200 and dissidios_response.json():
            dissidio_id = dissidios_response.json()[0]["id"]
            response = requests.get(f"{BASE_URL}/api/relatorios/dissidio/{dissidio_id}/previa/excel", headers=auth_headers)
            assert response.status_code == 200
            assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")
            assert "attachment" in response.headers.get("content-disposition", "")
            assert len(response.content) > 0
        else:
            pytest.skip("No dissídios available for preview Excel test")
    
    def test_relatorio_dissidio_previa_excel_not_found(self, auth_headers):
        """Test preview Excel for non-existent dissídio"""
        response = requests.get(f"{BASE_URL}/api/relatorios/dissidio/non-existent-id/previa/excel", headers=auth_headers)
        assert response.status_code == 404


class TestClientes:
    """Tests for clientes endpoint"""
    
    def test_list_clientes(self, auth_headers):
        """Test listing clientes"""
        response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
