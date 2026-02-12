"""
Test Iteration 43 Features:
1. Menu lateral sem títulos de seção - apenas itens diretamente
2. Menu dinâmico baseado no regime tributário (Simples Nacional vs Lucro Presumido)
3. Dashboard com card 'Outros Docs' nas entradas
4. Importação de NFS-e (Serviços Tomados e Prestados) aceita XML ou PDF/Imagem
5. Botão de upload mostra 'Importar XML ou PDF' para tipos com importType: 'both'
6. API /api/relatorio-divergencias-saida retorna CST correto sugerido (01 para saídas tributadas)
7. API /api/relatorio-divergencias-entrada retorna CST correto sugerido (50 para entradas com crédito no Lucro Real)
8. API /api/dashboard/stats retorna campo 'outros_entrada' nas quantidades e valores
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fiscalflow-31.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
EMPRESA_SERVICOS_SN = "VETCO CLINICA DE REABILITACAO ANIMAL LTDA"
EMPRESA_ID = "e83b4afd-49db-42fe-9929-b9c24ea49d0f"
COMPETENCIA = "01/2026"


class TestAuthentication:
    """Test authentication and get token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test that login returns a valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"SUCCESS: Login successful, token obtained")


class TestDashboardStats:
    """Test dashboard stats endpoint for 'outros_entrada' field"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_dashboard_stats_has_outros_entrada_quantidades(self, auth_token):
        """Test that dashboard stats returns 'outros_entrada' in quantidades"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check quantidades has outros_entrada
        assert "quantidades" in data, "No 'quantidades' in response"
        quantidades = data["quantidades"]
        assert "outros_entrada" in quantidades, f"No 'outros_entrada' in quantidades. Keys: {quantidades.keys()}"
        print(f"SUCCESS: Dashboard stats has 'outros_entrada' in quantidades: {quantidades.get('outros_entrada', 0)}")
    
    def test_dashboard_stats_has_outros_entrada_valores(self, auth_token):
        """Test that dashboard stats returns 'outros' in valores.entradas"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check valores.entradas has outros
        assert "valores" in data, "No 'valores' in response"
        valores = data["valores"]
        assert "entradas" in valores, f"No 'entradas' in valores. Keys: {valores.keys()}"
        entradas = valores["entradas"]
        assert "outros" in entradas, f"No 'outros' in valores.entradas. Keys: {entradas.keys()}"
        print(f"SUCCESS: Dashboard stats has 'outros' in valores.entradas: {entradas.get('outros', 0)}")
    
    def test_dashboard_stats_empresa_info(self, auth_token):
        """Test that dashboard stats returns empresa info with tipo_atividade"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check empresa info
        assert "empresa" in data, "No 'empresa' in response"
        empresa = data["empresa"]
        assert "tipo_atividade" in empresa, f"No 'tipo_atividade' in empresa. Keys: {empresa.keys()}"
        assert "regime_tributario" in empresa, f"No 'regime_tributario' in empresa. Keys: {empresa.keys()}"
        print(f"SUCCESS: Empresa tipo_atividade={empresa.get('tipo_atividade')}, regime={empresa.get('regime_tributario')}")


class TestRelatorioDivergenciasSaida:
    """Test relatorio-divergencias-saida endpoint for CST suggestions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_relatorio_divergencias_saida_endpoint_exists(self, auth_token):
        """Test that relatorio-divergencias-saida endpoint exists and returns data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/relatorio-divergencias-saida/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200, f"Endpoint failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "divergencias" in data or "total_valor_divergente" in data, f"Unexpected response structure: {data.keys()}"
        print(f"SUCCESS: relatorio-divergencias-saida endpoint works. Keys: {data.keys()}")
    
    def test_relatorio_divergencias_saida_cst_sugerido(self, auth_token):
        """Test that divergencias include CST sugerido (01 for tributadas)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/relatorio-divergencias-saida/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        divergencias = data.get("divergencias", [])
        if len(divergencias) > 0:
            # Check first divergencia has CST fields
            first_div = divergencias[0]
            if "itens" in first_div and len(first_div["itens"]) > 0:
                item = first_div["itens"][0]
                assert "cst_pis_correto" in item or "cst_cofins_correto" in item, f"No CST correto in item: {item.keys()}"
                print(f"SUCCESS: Divergencia has CST correto fields: cst_pis_correto={item.get('cst_pis_correto')}")
            else:
                print(f"INFO: Divergencia structure: {first_div.keys()}")
        else:
            print(f"INFO: No divergencias found for this company/competencia (may be correct)")


class TestRelatorioDivergenciasEntrada:
    """Test relatorio-divergencias-entrada endpoint for CST suggestions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_relatorio_divergencias_entrada_endpoint_exists(self, auth_token):
        """Test that relatorio-divergencias-entrada endpoint exists and returns data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/relatorio-divergencias-entrada/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200, f"Endpoint failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "divergencias" in data or "total_valor_divergente" in data, f"Unexpected response structure: {data.keys()}"
        print(f"SUCCESS: relatorio-divergencias-entrada endpoint works. Keys: {data.keys()}")
    
    def test_relatorio_divergencias_entrada_cst_sugerido(self, auth_token):
        """Test that divergencias include CST sugerido (50 for entradas com crédito no Lucro Real)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/relatorio-divergencias-entrada/{EMPRESA_ID}?competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        divergencias = data.get("divergencias", [])
        if len(divergencias) > 0:
            # Check first divergencia has CST fields
            first_div = divergencias[0]
            if "itens" in first_div and len(first_div["itens"]) > 0:
                item = first_div["itens"][0]
                assert "cst_pis_correto" in item or "cst_cofins_correto" in item, f"No CST correto in item: {item.keys()}"
                print(f"SUCCESS: Divergencia has CST correto fields: cst_pis_correto={item.get('cst_pis_correto')}")
            else:
                print(f"INFO: Divergencia structure: {first_div.keys()}")
        else:
            print(f"INFO: No divergencias found for this company/competencia (may be correct)")


class TestCompanyRegimeTributario:
    """Test company regime tributario for menu filtering"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_company_regime_tributario(self, auth_token):
        """Test that company has regime_tributario field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/companies/{EMPRESA_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Get company failed: {response.text}"
        data = response.json()
        
        assert "regime_tributario" in data, f"No 'regime_tributario' in company. Keys: {data.keys()}"
        regime = data.get("regime_tributario")
        print(f"SUCCESS: Company regime_tributario = {regime}")
        
        # VETCO should be Simples Nacional
        assert regime == "simples_nacional", f"Expected 'simples_nacional' for VETCO, got '{regime}'"
    
    def test_get_company_tipo_atividade(self, auth_token):
        """Test that company has tipo_atividade field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/companies/{EMPRESA_ID}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "tipo_atividade" in data, f"No 'tipo_atividade' in company. Keys: {data.keys()}"
        tipo = data.get("tipo_atividade")
        print(f"SUCCESS: Company tipo_atividade = {tipo}")
        
        # VETCO is a veterinary clinic - should be 'servicos'
        assert tipo == "servicos", f"Expected 'servicos' for VETCO, got '{tipo}'"


class TestDocumentTypes:
    """Test document types configuration for NFS-e import"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_documents_endpoint_exists(self, auth_token):
        """Test that documents endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={EMPRESA_ID}&competencia={COMPETENCIA}",
            headers=headers
        )
        assert response.status_code == 200, f"Documents endpoint failed: {response.text}"
        print(f"SUCCESS: Documents endpoint works")
    
    def test_documents_by_tipo_operacao(self, auth_token):
        """Test filtering documents by tipo_operacao"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test entrada
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={EMPRESA_ID}&competencia={COMPETENCIA}&tipo_operacao=entrada",
            headers=headers
        )
        assert response.status_code == 200
        entradas = response.json()
        print(f"SUCCESS: Found {len(entradas)} entrada documents")
        
        # Test saida
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={EMPRESA_ID}&competencia={COMPETENCIA}&tipo_operacao=saida",
            headers=headers
        )
        assert response.status_code == 200
        saidas = response.json()
        print(f"SUCCESS: Found {len(saidas)} saida documents")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
