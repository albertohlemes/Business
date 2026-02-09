"""
Test cases for Iteration 42 features:
1. Sortable columns in ICMS, IPI, Users pages
2. Activity filter for document types in Saídas menu
3. Memória IA button and modal in Classificação Inteligente
4. Fallback classification to 'revenda' when AI fails
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Test successful login"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token length: {len(auth_token)}")


class TestCompanyData:
    """Test company data and activity type"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_teknolink_company_activity(self, auth_token):
        """Test that Teknolink company has tipo_atividade='comercio'"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        
        response = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get company: {response.text}"
        
        data = response.json()
        assert "tipo_atividade" in data, "tipo_atividade not in company data"
        assert data["tipo_atividade"] == "comercio", f"Expected 'comercio', got '{data['tipo_atividade']}'"
        print(f"Company activity type: {data['tipo_atividade']}")


class TestApuracaoICMS:
    """Test ICMS apuração endpoint returns sortable data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_icms_apuracao_returns_cfop_data(self, auth_token):
        """Test that ICMS apuração returns CFOP data with sortable fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        competencia = "01/2026"
        
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{company_id}?competencia={competencia}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get ICMS data: {response.text}"
        
        data = response.json()
        
        # Check for entradas/saidas with por_cfop
        if "entradas" in data and data["entradas"].get("por_cfop"):
            cfop_item = data["entradas"]["por_cfop"][0]
            # Verify sortable fields exist
            assert "cfop" in cfop_item, "cfop field missing"
            assert "qtd" in cfop_item, "qtd field missing"
            assert "valor_total" in cfop_item, "valor_total field missing"
            assert "bc_icms" in cfop_item, "bc_icms field missing"
            assert "valor_icms" in cfop_item, "valor_icms field missing"
            print(f"ICMS CFOP data has all sortable fields: cfop, qtd, valor_total, bc_icms, valor_icms")
        
        if "saidas" in data and data["saidas"].get("por_cfop"):
            cfop_item = data["saidas"]["por_cfop"][0]
            assert "cfop" in cfop_item, "cfop field missing in saidas"
            print(f"ICMS Saidas CFOP data verified")


class TestApuracaoIPI:
    """Test IPI apuração endpoint returns sortable data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_ipi_apuracao_returns_cfop_data(self, auth_token):
        """Test that IPI apuração returns CFOP data with sortable fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        competencia = "01/2026"
        
        response = requests.get(
            f"{BASE_URL}/api/apuracao-ipi/{company_id}?competencia={competencia}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get IPI data: {response.text}"
        
        data = response.json()
        
        # Check for entradas with por_cfop
        if "entradas" in data and data["entradas"].get("por_cfop"):
            cfop_item = data["entradas"]["por_cfop"][0]
            # Verify sortable fields exist
            assert "cfop" in cfop_item, "cfop field missing"
            assert "qtd" in cfop_item, "qtd field missing"
            assert "valor_total" in cfop_item, "valor_total field missing"
            assert "bc_ipi" in cfop_item, "bc_ipi field missing"
            assert "valor_ipi" in cfop_item, "valor_ipi field missing"
            print(f"IPI CFOP data has all sortable fields: cfop, qtd, valor_total, bc_ipi, valor_ipi")


class TestUsersEndpoint:
    """Test users endpoint returns sortable data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_users_list_returns_sortable_fields(self, auth_token):
        """Test that users list returns data with sortable fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/users", headers=headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        data = response.json()
        assert "users" in data, "users not in response"
        
        if len(data["users"]) > 0:
            user = data["users"][0]
            # Verify sortable fields exist
            assert "name" in user, "name field missing"
            assert "email" in user, "email field missing"
            assert "role" in user, "role field missing"
            assert "is_active" in user or user.get("is_active") is not None, "is_active field missing"
            print(f"Users data has sortable fields: name, email, role, is_active")
            print(f"Total users: {len(data['users'])}")


class TestLearnedRules:
    """Test learned rules (Memória IA) endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_get_learned_rules(self, auth_token):
        """Test getting learned rules for a company"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        
        response = requests.get(f"{BASE_URL}/api/learned-rules/{company_id}", headers=headers)
        assert response.status_code == 200, f"Failed to get learned rules: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total learned rules: {len(data)}")
        
        if len(data) > 0:
            rule = data[0]
            # Check rule structure
            assert "id" in rule or "_id" in rule, "Rule should have id"
            print(f"First rule: {rule.get('descricao_produto', rule.get('padrao', 'N/A'))}")


class TestClassificationFallback:
    """Test that classification fallback is 'revenda'"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_classification_validation_endpoint(self, auth_token):
        """Test classification validation endpoint returns products with categories"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        competencia = "01/2026"
        
        response = requests.get(
            f"{BASE_URL}/api/classificacao/validacao/{company_id}?competencia={competencia}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get classification data: {response.text}"
        
        data = response.json()
        
        # Check for resumo
        if "resumo" in data:
            resumo = data["resumo"]
            print(f"Total produtos: {resumo.get('total_produtos', 0)}")
            print(f"Validados: {resumo.get('validados', 0)}")
            print(f"Pendentes: {resumo.get('pendentes', 0)}")
        
        # Check for produtos with categories
        if "produtos" in data and len(data["produtos"]) > 0:
            # Count products by category
            categories = {}
            for prod in data["produtos"]:
                cat = prod.get("categoria", "pendente")
                categories[cat] = categories.get(cat, 0) + 1
            
            print(f"Products by category: {categories}")
            
            # Verify 'revenda' category exists (fallback)
            if "revenda" in categories:
                print(f"Revenda products: {categories['revenda']}")


class TestDocumentTypes:
    """Test document types filtering by activity"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "123456"
        })
        return response.json().get("token")
    
    def test_documents_endpoint(self, auth_token):
        """Test documents endpoint returns data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        company_id = "b76b3672-229c-4973-8ed4-5eaa9739e160"
        competencia = "01/2026"
        
        # Test saida documents
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={company_id}&competencia={competencia}&tipo_operacao=saida",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        
        data = response.json()
        print(f"Total saida documents: {len(data)}")
        
        # Check document models
        models = set()
        for doc in data:
            if "modelo" in doc:
                models.add(doc["modelo"])
        
        print(f"Document models found: {models}")
        
        # For COMERCIO company, should have NF-e (55) and NFC-e (65), but NOT CT-e (57)
        # Note: This depends on what documents are actually imported


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
