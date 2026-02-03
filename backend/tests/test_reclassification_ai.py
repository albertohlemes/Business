"""
Backend API Tests for Reclassification AI Features
Tests: Reclassification endpoints, Tax validation, Learned rules
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - use existing admin user
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "test123"

# Shared state
auth_token = None
test_company_id = None


class TestSetup:
    """Setup tests - get auth token and company"""
    
    def test_login_admin(self):
        """Login with admin credentials"""
        global auth_token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        print(f"Login response: {response.status_code}")
        
        if response.status_code != 200:
            # Try to register if login fails
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "name": "Admin Test",
                "role": "admin"
            })
            print(f"Register response: {reg_response.status_code}")
            
            # Try login again
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
        
        assert response.status_code == 200
        data = response.json()
        auth_token = data["access_token"]
        print(f"Auth token obtained successfully")
    
    def test_get_company_for_testing(self):
        """Get a company ID for testing"""
        global auth_token, test_company_id
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(f"{BASE_URL}/api/companies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        companies = response.json()
        
        if len(companies) > 0:
            test_company_id = companies[0]["id"]
            print(f"Using company ID: {test_company_id} - {companies[0]['razao_social']}")
        else:
            # Create a test company
            company_data = {
                "cnpj": f"TEST_RECLASS_{uuid.uuid4().hex[:6]}",
                "razao_social": "TEST Empresa Reclassificação",
                "nome_fantasia": "Empresa Teste IA",
                "uf": "SP",
                "produtos_comercializados": ["Calçados", "Roupas"],
                "insumos_producao": ["Couro", "Tecido"],
                "produtos_despesa": ["Material de Limpeza"]
            }
            create_response = requests.post(f"{BASE_URL}/api/companies",
                json=company_data,
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert create_response.status_code == 200
            test_company_id = create_response.json()["id"]
            print(f"Created test company ID: {test_company_id}")


class TestReclassificationDocuments:
    """Test GET /api/reclassification/documents/{company_id}"""
    
    def test_get_documents_for_reclassification_success(self):
        """Test getting documents for reclassification with valid params"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/reclassification/documents/{test_company_id}?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Reclassification documents response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_documentos" in data
        assert "documentos" in data
        assert isinstance(data["documentos"], list)
        
        print(f"Found {data['total_documentos']} documents for reclassification")
        
        # If there are documents, verify structure
        if len(data["documentos"]) > 0:
            doc = data["documentos"][0]
            assert "numero_sequencial" in doc
            assert "id" in doc
            print(f"First document: NF-e {doc.get('numero_nfe', 'N/A')}")
    
    def test_get_documents_with_tipo_filter(self):
        """Test getting documents with tipo filter"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/reclassification/documents/{test_company_id}?competencia={competencia}&tipo=entrada",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "documentos" in data
        print(f"Found {data['total_documentos']} entrada documents")
    
    def test_get_documents_invalid_company(self):
        """Test getting documents with invalid company ID"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/reclassification/documents/invalid-company-id?competencia=01/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404
        print("Invalid company correctly rejected with 404")


class TestReclassificationProducts:
    """Test GET /api/reclassification/products/{company_id}"""
    
    def test_get_products_grouped_success(self):
        """Test getting grouped products for reclassification"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/reclassification/products/{test_company_id}?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Reclassification products response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_produtos" in data
        assert "produtos" in data
        assert isinstance(data["produtos"], list)
        
        print(f"Found {data['total_produtos']} grouped products")
        
        # If there are products, verify structure
        if len(data["produtos"]) > 0:
            prod = data["produtos"][0]
            assert "numero_sequencial" in prod
            assert "codigo" in prod
            assert "descricao" in prod
            assert "cfop_atual" in prod
            assert "ocorrencias" in prod
            print(f"First product: {prod.get('descricao', 'N/A')[:50]} - {prod.get('ocorrencias', 0)} occurrences")
    
    def test_get_products_invalid_company(self):
        """Test getting products with invalid company ID"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/reclassification/products/invalid-company-id?competencia=01/2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404
        print("Invalid company correctly rejected with 404")


class TestLearnedRules:
    """Test GET /api/learned-rules/{company_id}"""
    
    def test_get_learned_rules_success(self):
        """Test getting learned rules for a company"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        response = requests.get(
            f"{BASE_URL}/api/learned-rules/{test_company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Learned rules response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list (may be empty)
        assert isinstance(data, list)
        print(f"Found {len(data)} learned rules")
        
        # If there are rules, verify structure
        if len(data) > 0:
            rule = data[0]
            assert "produto_descricao" in rule
            assert "categoria_correta" in rule
            assert "cfop_correto" in rule
            print(f"First rule: {rule.get('produto_descricao', 'N/A')[:30]} -> {rule.get('categoria_correta', 'N/A')}")


class TestTaxValidation:
    """Test POST /api/ai/validate-taxes"""
    
    def test_validate_taxes_no_documents(self):
        """Test tax validation when no documents exist"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        # Use a competencia that likely has no documents
        response = requests.post(
            f"{BASE_URL}/api/ai/validate-taxes",
            json={
                "company_id": test_company_id,
                "competencia": "12/2099",  # Future date - no documents
                "document_ids": [],
                "validar_pis": True,
                "validar_cofins": True,
                "validar_icms": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Tax validation (no docs) response: {response.status_code}")
        
        # Should return 404 when no documents found
        assert response.status_code == 404
        print("Correctly returned 404 for no documents")
    
    def test_validate_taxes_invalid_company(self):
        """Test tax validation with invalid company"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.post(
            f"{BASE_URL}/api/ai/validate-taxes",
            json={
                "company_id": "invalid-company-id",
                "competencia": "01/2025",
                "document_ids": [],
                "validar_pis": True,
                "validar_cofins": True,
                "validar_icms": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404
        print("Invalid company correctly rejected with 404")
    
    def test_validate_taxes_with_documents(self):
        """Test tax validation with existing documents (if any)"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        # First check if there are documents
        docs_response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={test_company_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if docs_response.status_code != 200 or len(docs_response.json()) == 0:
            pytest.skip("No documents available for tax validation test")
        
        docs = docs_response.json()
        competencia = docs[0].get("competencia", "01/2025")
        
        response = requests.post(
            f"{BASE_URL}/api/ai/validate-taxes",
            json={
                "company_id": test_company_id,
                "competencia": competencia,
                "document_ids": [],
                "validar_pis": True,
                "validar_cofins": True,
                "validar_icms": True
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=60  # AI may take time
        )
        print(f"Tax validation response: {response.status_code}")
        
        # Should return 200 with analysis or 404 if no docs in competencia
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"Tax validation result: success={data.get('success')}")


class TestAIReclassify:
    """Test POST /api/ai/reclassify"""
    
    def test_reclassify_no_documents(self):
        """Test AI reclassification when no documents exist"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        response = requests.post(
            f"{BASE_URL}/api/ai/reclassify",
            json={
                "company_id": test_company_id,
                "competencia": "12/2099",  # Future date - no documents
                "product_ids": [],
                "instrucao_usuario": "Reclassifique todos os produtos de limpeza como DESPESA",
                "aplicar_em_lote": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"AI reclassify (no docs) response: {response.status_code}")
        
        # Should return 404 when no documents found
        assert response.status_code == 404
        print("Correctly returned 404 for no documents")
    
    def test_reclassify_invalid_company(self):
        """Test AI reclassification with invalid company"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.post(
            f"{BASE_URL}/api/ai/reclassify",
            json={
                "company_id": "invalid-company-id",
                "competencia": "01/2025",
                "product_ids": [],
                "instrucao_usuario": "Test instruction",
                "aplicar_em_lote": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404
        print("Invalid company correctly rejected with 404")


class TestManualReclassify:
    """Test POST /api/manual-reclassify"""
    
    def test_manual_reclassify_invalid_document(self):
        """Test manual reclassification with invalid document"""
        global auth_token
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.post(
            f"{BASE_URL}/api/manual-reclassify",
            params={
                "doc_id": "invalid-doc-id",
                "produto_codigo": "TEST001",
                "novo_cfop": "1102",
                "nova_categoria": "revenda",
                "motivo": "Test reclassification",
                "salvar_regra": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404
        print("Invalid document correctly rejected with 404")


class TestSPEDExportWithCompetencia:
    """Test SPED export with competencia filter"""
    
    def test_sped_export_with_competencia(self):
        """Test SPED export filtering by competencia"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/sped/export/{test_company_id}?competencia={competencia}&periodo=012025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"SPED export response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "content" in data
        assert "filename" in data
        # Filename contains competencia in some format
        assert "SPED_FISCAL" in data["filename"]
        assert "01" in data["filename"] and "2025" in data["filename"]
        
        print(f"SPED file generated: {data['filename']}")
        print(f"Content length: {len(data['content'])} characters")


class TestReportsWithCompetencia:
    """Test reports with competencia filter"""
    
    def test_report_by_product_with_competencia(self):
        """Test product report with competencia filter"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/reports/by-product/{test_company_id}?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Product report response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} products in report")
    
    def test_report_by_ncm_with_competencia(self):
        """Test NCM report with competencia filter"""
        global auth_token, test_company_id
        if not auth_token or not test_company_id:
            pytest.skip("No auth token or company ID available")
        
        competencia = "01/2025"
        response = requests.get(
            f"{BASE_URL}/api/reports/by-ncm/{test_company_id}?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"NCM report response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} NCMs in report")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
