"""
Test new features for Sistema de Fechamento Fiscal:
1. Company selector in header
2. Análise Tributária IA endpoint
3. Export CSV in Reports
4. CNPJ and competência validation in XML upload
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
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@test.com"
        print("SUCCESS: Login works correctly")


class TestCompanies:
    """Company management tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_list_companies(self, headers):
        """Test listing companies"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Listed {len(data)} companies")
    
    def test_get_company_by_id(self, headers):
        """Test getting company by ID"""
        # First get list to get a valid ID
        list_response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = list_response.json()
        
        if len(companies) > 0:
            company_id = companies[0]["id"]
            response = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == company_id
            print(f"SUCCESS: Got company {data['razao_social']}")
        else:
            pytest.skip("No companies available")
    
    def test_get_company_invalid_id(self, headers):
        """Test getting company with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/companies/invalid-id-12345", headers=headers)
        assert response.status_code == 404
        print("SUCCESS: Invalid company ID returns 404")


class TestAnaliseTributariaIA:
    """Análise Tributária IA endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def company_id(self, headers):
        """Get a valid company ID"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = response.json()
        if len(companies) > 0:
            return companies[0]["id"]
        return None
    
    def test_analise_tributaria_no_documents(self, headers, company_id):
        """Test análise tributária returns 404 when no documents"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.post(
            f"{BASE_URL}/api/ai/analise-tributaria",
            headers=headers,
            json={
                "company_id": company_id,
                "competencia": "01/2026"
            }
        )
        # Should return 404 when no documents
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "documento" in data["detail"].lower() or "encontrado" in data["detail"].lower()
        print("SUCCESS: Análise tributária returns 404 when no documents")
    
    def test_analise_tributaria_invalid_company(self, headers):
        """Test análise tributária with invalid company returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ai/analise-tributaria",
            headers=headers,
            json={
                "company_id": "invalid-company-id",
                "competencia": "01/2026"
            }
        )
        assert response.status_code == 404
        print("SUCCESS: Análise tributária with invalid company returns 404")


class TestReports:
    """Reports endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def company_id(self, headers):
        """Get a valid company ID"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = response.json()
        if len(companies) > 0:
            return companies[0]["id"]
        return None
    
    def test_report_by_product(self, headers, company_id):
        """Test report by product endpoint"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{company_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Report by product returned {len(data)} items")
    
    def test_report_by_product_with_competencia(self, headers, company_id):
        """Test report by product with competência filter"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{company_id}?competencia=01/2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Report by product with competência returned {len(data)} items")
    
    def test_report_by_ncm(self, headers, company_id):
        """Test report by NCM endpoint"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/reports/by-ncm/{company_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Report by NCM returned {len(data)} items")
    
    def test_report_invalid_company(self, headers):
        """Test report with invalid company returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/invalid-company-id",
            headers=headers
        )
        assert response.status_code == 404
        print("SUCCESS: Report with invalid company returns 404")


class TestXMLUpload:
    """XML Upload endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_xml_documents_list(self, headers):
        """Test listing XML documents"""
        response = requests.get(f"{BASE_URL}/api/xml/documents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Listed {len(data)} XML documents")
    
    def test_xml_documents_with_company_filter(self, headers):
        """Test listing XML documents with company filter"""
        # Get a company ID first
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = companies_response.json()
        
        if len(companies) > 0:
            company_id = companies[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/xml/documents?company_id={company_id}",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"SUCCESS: Listed {len(data)} XML documents for company")
        else:
            pytest.skip("No companies available")
    
    def test_xml_documents_with_competencia_filter(self, headers):
        """Test listing XML documents with competência filter"""
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?competencia=01/2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Listed {len(data)} XML documents for competência")


class TestReclassificationAI:
    """Reclassification AI endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def company_id(self, headers):
        """Get a valid company ID"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        companies = response.json()
        if len(companies) > 0:
            return companies[0]["id"]
        return None
    
    def test_reclassification_documents(self, headers, company_id):
        """Test getting documents for reclassification"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/reclassification/documents/{company_id}?competencia=01/2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_documentos" in data
        assert "documentos" in data
        print(f"SUCCESS: Reclassification documents returned {data['total_documentos']} items")
    
    def test_reclassification_products(self, headers, company_id):
        """Test getting grouped products for reclassification"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/reclassification/products/{company_id}?competencia=01/2026",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_produtos" in data
        assert "produtos" in data
        print(f"SUCCESS: Reclassification products returned {data['total_produtos']} items")
    
    def test_learned_rules(self, headers, company_id):
        """Test getting learned rules"""
        if not company_id:
            pytest.skip("No company available")
        
        response = requests.get(
            f"{BASE_URL}/api/learned-rules/{company_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Learned rules returned {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
