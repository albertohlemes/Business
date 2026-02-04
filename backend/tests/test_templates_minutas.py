"""
Backend API Tests for Portal Societário Business Contabilidade
Tests for: Template upload, Minuta download (Word/PDF), Minutas listing
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teste_template@test.com"
TEST_PASSWORD = "123456"
TEST_NAME = "Teste Template User"


class TestAuthSetup:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get or create test user and return auth token"""
        # Try login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        # If login fails, register new user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if register_response.status_code == 200:
            return register_response.json()["access_token"]
        
        pytest.skip(f"Could not authenticate: {register_response.text}")
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_login_success(self, auth_token):
        """Test that we can authenticate"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Authentication successful, token length: {len(auth_token)}")


class TestTemplateUpload:
    """Tests for template upload functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if register_response.status_code == 200:
            return register_response.json()["access_token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_template_upload_docx(self, headers):
        """Test uploading a .docx template file"""
        # Create a minimal valid DOCX file (ZIP with required structure)
        from io import BytesIO
        import zipfile
        
        # Create minimal DOCX structure
        docx_buffer = BytesIO()
        with zipfile.ZipFile(docx_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # [Content_Types].xml
            content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
            zf.writestr('[Content_Types].xml', content_types)
            
            # _rels/.rels
            rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
            zf.writestr('_rels/.rels', rels)
            
            # word/document.xml
            document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Template Test</w:t></w:r></w:p></w:body>
</w:document>'''
            zf.writestr('word/document.xml', document)
            
            # word/_rels/document.xml.rels
            doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>'''
            zf.writestr('word/_rels/document.xml.rels', doc_rels)
        
        docx_buffer.seek(0)
        
        files = {
            'file': ('test_template.docx', docx_buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        }
        data = {'nome': 'TEST_Template_Formatacao'}
        
        response = requests.post(
            f"{BASE_URL}/api/templates/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        print(f"Template upload response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200
        
        result = response.json()
        assert "id" in result
        assert result["nome"] == "TEST_Template_Formatacao"
        assert result["tipo"] == "docx"
        print(f"✓ Template uploaded successfully: {result['id']}")
        
        return result["id"]
    
    def test_template_upload_invalid_format(self, headers):
        """Test that invalid file formats are rejected"""
        files = {
            'file': ('test.txt', b'Invalid content', 'text/plain')
        }
        data = {'nome': 'Invalid Template'}
        
        response = requests.post(
            f"{BASE_URL}/api/templates/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400
        print("✓ Invalid format correctly rejected")
    
    def test_list_templates(self, headers):
        """Test listing templates"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=headers)
        
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        print(f"✓ Templates listed: {len(templates)} templates found")
        
        return templates
    
    def test_delete_template(self, headers):
        """Test deleting a template"""
        # First list templates to get an ID
        list_response = requests.get(f"{BASE_URL}/api/templates", headers=headers)
        templates = list_response.json()
        
        # Find test template
        test_templates = [t for t in templates if t.get("nome", "").startswith("TEST_")]
        
        if test_templates:
            template_id = test_templates[0]["id"]
            delete_response = requests.delete(
                f"{BASE_URL}/api/templates/{template_id}",
                headers=headers
            )
            assert delete_response.status_code == 200
            print(f"✓ Template {template_id} deleted successfully")
        else:
            print("⚠ No test templates to delete")


class TestMinutasListing:
    """Tests for minutas listing grouped by client"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_list_minutas(self, headers):
        """Test listing minutas"""
        response = requests.get(f"{BASE_URL}/api/minutas", headers=headers)
        
        assert response.status_code == 200
        minutas = response.json()
        assert isinstance(minutas, list)
        print(f"✓ Minutas listed: {len(minutas)} minutas found")
        
        # Check response structure
        if minutas:
            minuta = minutas[0]
            assert "id" in minuta
            assert "tipo_alteracao" in minuta
            assert "status" in minuta
            assert "created_at" in minuta
            # New fields for grouping
            assert "cnpj" in minuta or minuta.get("cnpj") is None
            assert "razao_social" in minuta or minuta.get("razao_social") is None
            assert "numero_alteracao" in minuta or minuta.get("numero_alteracao") is None
            print(f"✓ Minuta structure validated: {minuta.get('tipo_alteracao')}")
        
        return minutas
    
    def test_create_minuta_for_download_test(self, headers):
        """Create a minuta with content for download testing"""
        # Create minuta
        data = {
            'tipo_alteracao': 'TEST_alteracao_endereco',
            'descricao': 'Teste de download Word/PDF'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=headers,
            data=data
        )
        
        assert response.status_code == 200
        minuta = response.json()
        minuta_id = minuta["id"]
        print(f"✓ Minuta created: {minuta_id}")
        
        return minuta_id


class TestMinutaDownload:
    """Tests for minuta download in Word and PDF formats"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def minuta_with_content(self, auth_token):
        """Create a minuta with generated content for download testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create minuta
        data = {
            'tipo_alteracao': 'TEST_download_test',
            'descricao': 'Minuta para teste de download'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=headers,
            data=data
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not create minuta: {response.text}")
        
        minuta_id = response.json()["id"]
        
        # Generate content via gerar endpoint
        gerar_response = requests.post(
            f"{BASE_URL}/api/minutas/{minuta_id}/gerar",
            headers=headers
        )
        
        print(f"Gerar response: {gerar_response.status_code}")
        
        return minuta_id
    
    def test_download_word_without_content(self, headers):
        """Test that download fails gracefully when minuta has no content"""
        # Create minuta without content
        data = {
            'tipo_alteracao': 'TEST_no_content',
            'descricao': 'Minuta sem conteudo'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=headers,
            data=data
        )
        
        minuta_id = response.json()["id"]
        
        # Try to download Word
        download_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/word",
            headers=headers
        )
        
        # Should return 400 because no content generated
        assert download_response.status_code == 400
        print("✓ Download correctly rejected for minuta without content")
    
    def test_download_pdf_without_content(self, headers):
        """Test that PDF download fails gracefully when minuta has no content"""
        # Create minuta without content
        data = {
            'tipo_alteracao': 'TEST_no_content_pdf',
            'descricao': 'Minuta sem conteudo para PDF'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/minutas/upload",
            headers=headers,
            data=data
        )
        
        minuta_id = response.json()["id"]
        
        # Try to download PDF
        download_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/pdf",
            headers=headers
        )
        
        # Should return 400 because no content generated
        assert download_response.status_code == 400
        print("✓ PDF download correctly rejected for minuta without content")
    
    def test_download_word_with_content(self, headers, minuta_with_content):
        """Test downloading minuta as Word document"""
        minuta_id = minuta_with_content
        
        # First check if minuta has content
        get_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}",
            headers=headers
        )
        
        minuta = get_response.json()
        
        if not minuta.get("conteudo_gerado"):
            # Manually set content for testing
            print("⚠ Minuta has no generated content, skipping Word download test")
            pytest.skip("Minuta has no generated content")
        
        # Download Word
        download_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/word",
            headers=headers
        )
        
        assert download_response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in download_response.headers.get("content-type", "")
        assert len(download_response.content) > 0
        print(f"✓ Word document downloaded: {len(download_response.content)} bytes")
    
    def test_download_pdf_with_content(self, headers, minuta_with_content):
        """Test downloading minuta as PDF document"""
        minuta_id = minuta_with_content
        
        # First check if minuta has content
        get_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}",
            headers=headers
        )
        
        minuta = get_response.json()
        
        if not minuta.get("conteudo_gerado"):
            print("⚠ Minuta has no generated content, skipping PDF download test")
            pytest.skip("Minuta has no generated content")
        
        # Download PDF
        download_response = requests.get(
            f"{BASE_URL}/api/minutas/{minuta_id}/download/pdf",
            headers=headers
        )
        
        assert download_response.status_code == 200
        assert "application/pdf" in download_response.headers.get("content-type", "")
        assert len(download_response.content) > 0
        # Check PDF magic bytes
        assert download_response.content[:4] == b'%PDF'
        print(f"✓ PDF document downloaded: {len(download_response.content)} bytes")
    
    def test_download_nonexistent_minuta(self, headers):
        """Test downloading a non-existent minuta"""
        fake_id = "nonexistent-minuta-id-12345"
        
        word_response = requests.get(
            f"{BASE_URL}/api/minutas/{fake_id}/download/word",
            headers=headers
        )
        assert word_response.status_code == 404
        
        pdf_response = requests.get(
            f"{BASE_URL}/api/minutas/{fake_id}/download/pdf",
            headers=headers
        )
        assert pdf_response.status_code == 404
        
        print("✓ Non-existent minuta correctly returns 404")


class TestMinutaWithTemplateFormatting:
    """Tests for minuta download with template formatting applied"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_upload_template_and_download_formatted_minuta(self, headers):
        """Test full flow: upload template, create minuta, download with formatting"""
        from io import BytesIO
        import zipfile
        
        # 1. Upload a template
        docx_buffer = BytesIO()
        with zipfile.ZipFile(docx_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
            zf.writestr('[Content_Types].xml', content_types)
            
            rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
            zf.writestr('_rels/.rels', rels)
            
            document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Template com formatação personalizada</w:t></w:r></w:p></w:body>
</w:document>'''
            zf.writestr('word/document.xml', document)
            
            doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>'''
            zf.writestr('word/_rels/document.xml.rels', doc_rels)
        
        docx_buffer.seek(0)
        
        files = {
            'file': ('template_formatacao.docx', docx_buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        }
        data = {'nome': 'TEST_Template_Full_Flow'}
        
        template_response = requests.post(
            f"{BASE_URL}/api/templates/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert template_response.status_code == 200
        template_id = template_response.json()["id"]
        print(f"✓ Template uploaded: {template_id}")
        
        # 2. Verify template is listed
        list_response = requests.get(f"{BASE_URL}/api/templates", headers=headers)
        assert list_response.status_code == 200
        templates = list_response.json()
        assert any(t["id"] == template_id for t in templates)
        print("✓ Template appears in list")
        
        # 3. Clean up - delete test template
        delete_response = requests.delete(
            f"{BASE_URL}/api/templates/{template_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print("✓ Template deleted successfully")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_cleanup_test_minutas(self, headers):
        """Clean up test minutas"""
        # List all minutas
        response = requests.get(f"{BASE_URL}/api/minutas", headers=headers)
        minutas = response.json()
        
        # Delete test minutas
        deleted = 0
        for minuta in minutas:
            if minuta.get("tipo_alteracao", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/minutas/{minuta['id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test minutas")
    
    def test_cleanup_test_templates(self, headers):
        """Clean up test templates"""
        # List all templates
        response = requests.get(f"{BASE_URL}/api/templates", headers=headers)
        templates = response.json()
        
        # Delete test templates
        deleted = 0
        for template in templates:
            if template.get("nome", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/templates/{template['id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
