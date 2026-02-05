"""
Backend API Tests for Portal Societário Business Contabilidade
Tests: Auth, Processos (Minutas), Templates, Formatação, PDF Download
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://process-manager-15.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "teste2@teste.com"
TEST_PASSWORD = "123456"
TEST_NAME = "Teste User"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data['status']}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["token_type"] == "bearer"
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_register_duplicate_email(self):
        """Test registration with existing email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert response.status_code == 400
        data = response.json()
        assert "já cadastrado" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print("✓ Duplicate email registration correctly rejected")
    
    def test_get_me_authenticated(self):
        """Test /api/auth/me returns user info when authenticated"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ User info retrieved: {data['name']}")
    
    def test_get_me_unauthenticated(self):
        """Test /api/auth/me returns 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated access correctly rejected")


class TestMinutas:
    """Minutas (Processos) endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_list_minutas(self, auth_headers):
        """Test listing minutas returns array"""
        response = requests.get(f"{BASE_URL}/api/minutas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} minutas")
    
    def test_create_minuta_upload(self, auth_headers):
        """Test creating a minuta via upload endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "socios",
                "descricao": "TEST_Alteração de sócios para teste"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["tipo_alteracao"] == "socios"
        assert data["status"] == "pendente"
        print(f"✓ Minuta created with ID: {data['id']}")
        return data["id"]
    
    def test_get_minuta_by_id(self, auth_headers):
        """Test getting a specific minuta by ID"""
        # First create a minuta
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "endereco",
                "descricao": "TEST_Alteração de endereço"
            }
        )
        minuta_id = create_response.json()["id"]
        
        # Get the minuta
        response = requests.get(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == minuta_id
        assert data["tipo_alteracao"] == "endereco"
        print(f"✓ Retrieved minuta: {minuta_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)
    
    def test_delete_minuta(self, auth_headers):
        """Test deleting a minuta"""
        # First create a minuta
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "capital",
                "descricao": "TEST_Minuta para deletar"
            }
        )
        minuta_id = create_response.json()["id"]
        
        # Delete the minuta
        response = requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Minuta deleted successfully: {minuta_id}")
    
    def test_minuta_chat(self, auth_headers):
        """Test chat endpoint for minuta"""
        # First create a minuta
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "socios",
                "descricao": "TEST_Minuta para chat"
            }
        )
        minuta_id = create_response.json()["id"]
        
        # Send chat message
        response = requests.post(
            f"{BASE_URL}/api/minutas/{minuta_id}/chat",
            headers=auth_headers,
            json={
                "message": "Olá, preciso de ajuda com alteração de sócios",
                "minuta_id": minuta_id
            }
        )
        # Chat may return 200 or 520 depending on AI service availability
        assert response.status_code in [200, 520]
        if response.status_code == 200:
            data = response.json()
            assert "response" in data
            print(f"✓ Chat response received for minuta: {minuta_id}")
        else:
            print(f"⚠ Chat returned {response.status_code} - AI service may be unavailable")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)


class TestTemplates:
    """Templates endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_templates(self, auth_headers):
        """Test listing templates returns array"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} templates")


class TestFormatacao:
    """Formatação endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_formatacao(self, auth_headers):
        """Test getting formatação config"""
        response = requests.get(f"{BASE_URL}/api/formatacao", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "secoes" in data or data == {} or "margens" in data
        print(f"✓ Formatação config retrieved")
    
    def test_save_formatacao(self, auth_headers):
        """Test saving formatação config"""
        config = {
            "secoes": [
                {
                    "id": "titulo",
                    "nome": "Título",
                    "exemplo": "ALTERAÇÃO CONTRATUAL",
                    "fonte": "Times New Roman",
                    "tamanho": "14",
                    "negrito": True,
                    "italico": False,
                    "alinhamento": "center"
                }
            ],
            "margens": {
                "superior": "2.5",
                "inferior": "2.5",
                "esquerda": "3.0",
                "direita": "2.0"
            },
            "espacamento": "1.5",
            "organizacaoInteligente": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/formatacao/salvar",
            headers=auth_headers,
            json=config
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "message" in data
        print(f"✓ Formatação config saved")


class TestPDFDownload:
    """PDF Download endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_download_pdf_requires_content(self, auth_headers):
        """Test PDF download requires generated content"""
        # Create a minuta without generating content
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "socios",
                "descricao": "TEST_Minuta sem conteúdo"
            }
        )
        minuta_id = create_response.json()["id"]
        
        # Try to download PDF (should fail - no content generated)
        response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/pdf",
            headers=auth_headers
        )
        # Should return 400 because content not generated
        assert response.status_code == 400
        print(f"✓ PDF download correctly requires generated content")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)
    
    def test_download_word_requires_content(self, auth_headers):
        """Test Word download requires generated content"""
        # Create a minuta without generating content
        create_response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=auth_headers,
            data={
                "tipo_alteracao": "endereco",
                "descricao": "TEST_Minuta sem conteúdo para Word"
            }
        )
        minuta_id = create_response.json()["id"]
        
        # Try to download Word (should fail - no content generated)
        response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/word",
            headers=auth_headers
        )
        # Should return 400 because content not generated
        assert response.status_code == 400
        print(f"✓ Word download correctly requires generated content")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/minutas/{minuta_id}", headers=auth_headers)


class TestDashboard:
    """Dashboard stats endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "certificados" in data
        assert "licencas" in data
        assert "minutas" in data
        print(f"✓ Dashboard stats: {data['minutas']['total']} minutas, {data['certificados']['total']} certificados")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_minutas(self, auth_headers):
        """Clean up TEST_ prefixed minutas"""
        response = requests.get(f"{BASE_URL}/api/minutas", headers=auth_headers)
        minutas = response.json()
        
        deleted_count = 0
        for minuta in minutas:
            if minuta.get("descricao", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/minutas/{minuta['id']}",
                    headers=auth_headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test minutas")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
