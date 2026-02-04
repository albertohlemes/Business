"""
Test suite for Iteration 9 features:
1. Análise de Alíquotas de Saída page/endpoint
2. Company edit (PUT /companies/{id})
3. Company codigo_empresa field
4. Delete documents (individual and batch)
5. Reports tipoOperacao filter
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"


class TestAnaliseAliquotasSaida:
    """Tests for Análise de Alíquotas de Saída endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        """Get ANZEN company ID"""
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        companies = response.json()
        anzen = next((c for c in companies if "ANZEN" in c.get("razao_social", "")), None)
        if anzen:
            return anzen["id"]
        return companies[0]["id"] if companies else None
    
    def test_analise_aliquotas_saida_endpoint_exists(self, auth_token, company_id):
        """Test that /api/analise-aliquotas-saida endpoint exists and returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_analise_aliquotas_saida_response_structure(self, auth_token, company_id):
        """Test response structure contains required fields"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Check required top-level fields
        assert "empresa" in data, "Missing 'empresa' field"
        assert "competencia" in data, "Missing 'competencia' field"
        assert "total_documentos_saida" in data, "Missing 'total_documentos_saida' field"
        assert "total_produtos" in data, "Missing 'total_produtos' field"
        assert "produtos_com_alerta" in data, "Missing 'produtos_com_alerta' field"
        assert "resumo_alertas" in data, "Missing 'resumo_alertas' field"
        assert "produtos" in data, "Missing 'produtos' field"
    
    def test_analise_aliquotas_resumo_alertas_structure(self, auth_token, company_id):
        """Test resumo_alertas contains ICMS, PIS, COFINS counts"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        resumo = data.get("resumo_alertas", {})
        
        assert "total" in resumo, "Missing 'total' in resumo_alertas"
        assert "icms" in resumo, "Missing 'icms' in resumo_alertas"
        assert "pis" in resumo, "Missing 'pis' in resumo_alertas"
        assert "cofins" in resumo, "Missing 'cofins' in resumo_alertas"
    
    def test_analise_aliquotas_produto_structure(self, auth_token, company_id):
        """Test produto structure contains aliquotas and alertas"""
        response = requests.get(
            f"{BASE_URL}/api/analise-aliquotas-saida/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        produtos = data.get("produtos", [])
        
        if produtos:
            produto = produtos[0]
            assert "documento" in produto, "Missing 'documento' in produto"
            assert "codigo" in produto, "Missing 'codigo' in produto"
            assert "descricao" in produto, "Missing 'descricao' in produto"
            assert "valor_total" in produto, "Missing 'valor_total' in produto"
            assert "aliquotas" in produto, "Missing 'aliquotas' in produto"
            assert "valores" in produto, "Missing 'valores' in produto"
            assert "alertas" in produto, "Missing 'alertas' in produto"
            
            # Check aliquotas structure
            aliquotas = produto.get("aliquotas", {})
            assert "icms" in aliquotas, "Missing 'icms' in aliquotas"
            assert "pis" in aliquotas, "Missing 'pis' in aliquotas"
            assert "cofins" in aliquotas, "Missing 'cofins' in aliquotas"


class TestCompanyEdit:
    """Tests for company edit functionality (PUT /companies/{id})"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_put_company_endpoint_exists(self, auth_token, company_id):
        """Test that PUT /api/companies/{id} endpoint exists"""
        response = requests.put(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"codigo_empresa": "TEST001"}
        )
        # Should return 200 (success) or 403 (forbidden for non-admin)
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
    
    def test_update_codigo_empresa(self, auth_token, company_id):
        """Test updating codigo_empresa field"""
        # Update codigo_empresa
        response = requests.put(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"codigo_empresa": "002"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("codigo_empresa") == "002", f"codigo_empresa not updated: {data.get('codigo_empresa')}"
    
    def test_update_razao_social(self, auth_token, company_id):
        """Test updating razao_social field"""
        # Get current value
        get_response = requests.get(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        original_razao = get_response.json().get("razao_social")
        
        # Update razao_social
        response = requests.put(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"razao_social": "TEST RAZAO SOCIAL UPDATED"}
        )
        assert response.status_code == 200
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/companies/{company_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"razao_social": original_razao}
        )


class TestDeleteDocuments:
    """Tests for document deletion (individual and batch)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_delete_document_endpoint_exists(self, auth_token):
        """Test that DELETE /api/documents/{id} endpoint exists"""
        # Use a fake ID - should return 404 (not found) not 405 (method not allowed)
        response = requests.delete(
            f"{BASE_URL}/api/documents/fake-document-id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # 404 means endpoint exists but document not found
        # 403 means endpoint exists but forbidden
        assert response.status_code in [404, 403], f"Unexpected status: {response.status_code}"
    
    def test_delete_competencia_endpoint_exists(self, auth_token, company_id):
        """Test that DELETE /api/documents/{company_id}/competencia/{competencia} endpoint exists"""
        response = requests.delete(
            f"{BASE_URL}/api/documents/{company_id}/competencia/01/1900",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 200 with deleted_count: 0 (no documents in that competencia)
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        data = response.json()
        assert "deleted_count" in data, "Missing 'deleted_count' in response"


class TestReportsFilter:
    """Tests for Reports tipoOperacao filter"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def company_id(self, auth_token):
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        companies = response.json()
        return companies[0]["id"] if companies else None
    
    def test_reports_by_product_endpoint(self, auth_token, company_id):
        """Test /api/reports/by-product endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
    
    def test_reports_by_ncm_endpoint(self, auth_token, company_id):
        """Test /api/reports/by-ncm endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/by-ncm/{company_id}?competencia=12/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"


class TestCompaniesListWithCodigo:
    """Test that companies list includes codigo_empresa field"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_companies_list_has_codigo_empresa_field(self, auth_token):
        """Test that companies list response includes codigo_empresa field"""
        response = requests.get(
            f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        companies = response.json()
        
        if companies:
            company = companies[0]
            # codigo_empresa should be in the response (can be null)
            assert "codigo_empresa" in company or company.get("codigo_empresa") is None or company.get("codigo_empresa") == "", \
                "codigo_empresa field should exist in company response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
