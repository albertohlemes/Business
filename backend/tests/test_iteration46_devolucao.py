"""
Test cases for Iteration 46 - Devolução Classification Bug Fix
Tests:
1. Products with CFOP 1202 should appear in 'devolucao' category
2. API /api/classification/suggestions returns products with category 'devolucao'
3. Navigation to Classificação Inteligente page works
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDevolucaoClassification:
    """Test cases for devolução classification feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        self.company_id = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS
        self.competencia = "01/2026"
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
            
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "123456"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        return self.token
    
    def test_login_success(self):
        """Test that login works and returns access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "123456"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"Login successful, token received")
    
    def test_classification_suggestions_endpoint_exists(self):
        """Test that classification suggestions endpoint exists and returns 200"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Endpoint returned {response.status_code}: {response.text}"
        print(f"Classification suggestions endpoint returned 200")
    
    def test_classification_suggestions_returns_correct_structure(self):
        """Test that classification suggestions returns correct structure"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "empresa" in data
        assert "competencia" in data
        assert "resumo" in data
        assert "sugestoes" in data
        
        # Check resumo structure
        resumo = data["resumo"]
        assert "total_produtos" in resumo
        assert "validados" in resumo
        assert "pendentes" in resumo
        assert "valor_total" in resumo
        
        print(f"Structure verified: empresa={data['empresa']}, total_produtos={resumo['total_produtos']}")
    
    def test_classification_suggestions_contains_devolucao_category(self):
        """Test that classification suggestions contains products with 'devolucao' category"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get all unique categories
        categories = set()
        for sugestao in data.get("sugestoes", []):
            categoria = sugestao.get("categoria_atual", "")
            if categoria:
                categories.add(categoria)
        
        print(f"Categories found: {categories}")
        assert "devolucao" in categories, f"'devolucao' category not found. Found categories: {categories}"
        print("SUCCESS: 'devolucao' category found in classification suggestions")
    
    def test_devolucao_products_count(self):
        """Test that there are 33 products with 'devolucao' category (as expected)"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Count products with devolucao category
        devolucao_products = [
            s for s in data.get("sugestoes", [])
            if s.get("categoria_atual") == "devolucao"
        ]
        
        count = len(devolucao_products)
        print(f"Found {count} products with 'devolucao' category")
        
        # Expected 33 products based on the bug fix
        assert count == 33, f"Expected 33 devolucao products, found {count}"
        print("SUCCESS: Exactly 33 products with 'devolucao' category found")
    
    def test_devolucao_products_have_correct_cfop(self):
        """Test that devolucao products have CFOP starting with 1202 or similar devolução CFOPs"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get devolucao products
        devolucao_products = [
            s for s in data.get("sugestoes", [])
            if s.get("categoria_atual") == "devolucao"
        ]
        
        # CFOPs de devolução de entrada
        cfops_devolucao = ['1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', '1210',
                          '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210']
        
        # Check that at least some products have devolução CFOPs
        products_with_devolucao_cfop = 0
        for prod in devolucao_products:
            cfop = prod.get("cfop_atual", "")
            if cfop in cfops_devolucao:
                products_with_devolucao_cfop += 1
        
        print(f"Products with devolução CFOP: {products_with_devolucao_cfop}/{len(devolucao_products)}")
        assert products_with_devolucao_cfop > 0, "No products with devolução CFOP found"
        print("SUCCESS: Products with devolução CFOP found")
    
    def test_classification_suggestions_returns_404_for_invalid_company(self):
        """Test that classification suggestions returns 404 for invalid company"""
        token = self.get_auth_token()
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/invalid-company-id?competencia={self.competencia}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Returns 404 for invalid company")
    
    def test_classification_suggestions_requires_auth(self):
        """Test that classification suggestions requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/classification/suggestions/{self.company_id}?competencia={self.competencia}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Requires authentication")


class TestUploadModalFix:
    """Test cases for upload modal fix (resultDisplayedRef)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        self.company_id = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS
        self.competencia = "01/2026"
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
            
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "123456"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        return self.token
    
    def test_upload_init_endpoint_exists(self):
        """Test that upload-init endpoint exists"""
        token = self.get_auth_token()
        
        # Create form data
        import io
        files = {'company_id': (None, self.company_id)}
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data={
                'company_id': self.company_id,
                'competencia': self.competencia,
                'tipo': 'entrada',
                'total_files': 1
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 with upload_id
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "upload_id" in data, "upload_id not in response"
        print(f"SUCCESS: upload-init returned upload_id: {data['upload_id']}")
    
    def test_upload_status_endpoint_exists(self):
        """Test that upload-status endpoint exists"""
        token = self.get_auth_token()
        
        # First create a session
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data={
                'company_id': self.company_id,
                'competencia': self.competencia,
                'tipo': 'entrada',
                'total_files': 1
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        upload_id = response.json()["upload_id"]
        
        # Check status
        status_response = requests.get(
            f"{BASE_URL}/api/xml/upload-status/{upload_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        print(f"SUCCESS: upload-status endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
