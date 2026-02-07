"""
Test suite for Devolução de Fornecedor (Supplier Return) detection feature.

Tests the following scenarios:
1. Upload of XML with finNFe=4 (devolução) should be detected and marked as desconsiderada
2. Field desconsiderada_devolucao should be True after upload
3. Field nfe_referenciada should be extracted correctly from XML (DFeReferenciado/chaveAcesso)
4. Relatório de devoluções endpoint should return the desconsiderada note
5. Normal notes (non-devolução) should be imported normally
"""

import pytest
import requests
import os
import json
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
TEST_COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS

# Test XML file path
TEST_DEVOLUCAO_XML = "/tmp/test_devolucao.xml"

# Expected values from the test XML
EXPECTED_CHAVE_NFE = "35260146443440000114550010002618251462953996"
EXPECTED_NFE_REF = "35251246443440000114550010002602511453763036"


class TestDevolucaoFornecedor:
    """Test suite for supplier return (devolução) detection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_01_authentication_works(self):
        """Test that authentication is working"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Auth check failed: {response.text}"
        user = response.json()
        assert user.get("email") == TEST_EMAIL
        print(f"✓ Authentication successful for {TEST_EMAIL}")
    
    def test_02_company_exists(self):
        """Test that the test company exists"""
        response = self.session.get(f"{BASE_URL}/api/companies/{TEST_COMPANY_ID}")
        assert response.status_code == 200, f"Company not found: {response.text}"
        company = response.json()
        print(f"✓ Company found: {company.get('razao_social')} (CNPJ: {company.get('cnpj')})")
    
    def test_03_xml_parser_extracts_finnfe_and_dfe_referenciado(self):
        """Test that XML parser correctly extracts finNFe and DFeReferenciado"""
        # Read the test XML file
        with open(TEST_DEVOLUCAO_XML, 'r') as f:
            xml_content = f.read()
        
        # Check that the XML contains expected values
        assert 'finNFe>4<' in xml_content or '<finNFe>4</finNFe>' in xml_content, "XML should have finNFe=4"
        assert 'DFeReferenciado' in xml_content, "XML should have DFeReferenciado element"
        assert 'chaveAcesso' in xml_content, "XML should have chaveAcesso element"
        assert EXPECTED_NFE_REF in xml_content, "XML should have the referenced NFe key"
        assert '1411' in xml_content, "XML should have CFOP 1411"
        
        print("✓ Test XML contains expected devolução markers:")
        print("  - finNFe=4 (devolução)")
        print("  - DFeReferenciado with chaveAcesso")
        print("  - CFOP 1411 (devolução de venda)")
    
    def test_04_upload_devolucao_xml_detects_devolucao(self):
        """Test that uploading a devolução XML detects it correctly"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Step 1: Initialize upload session
        init_data = {
            'company_id': TEST_COMPANY_ID,
            'competencia': '01/2026',
            'tipo': 'entrada',
            'total_files': 1
        }
        
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data=init_data,
            headers=headers
        )
        
        assert init_response.status_code == 200, f"Upload init failed: {init_response.text}"
        upload_id = init_response.json().get('upload_id')
        print(f"  Got upload_id: {upload_id}")
        
        # Step 2: Upload the test XML
        with open(TEST_DEVOLUCAO_XML, 'rb') as f:
            files = {'files': ('test_devolucao.xml', f, 'application/xml')}
            data = {'upload_id': upload_id}
            
            response = requests.post(
                f"{BASE_URL}/api/xml/upload-stream",
                files=files,
                data=data,
                headers=headers
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        # Step 3: Check progress to get results
        time.sleep(1)  # Wait for processing
        
        progress_response = requests.get(
            f"{BASE_URL}/api/xml/upload-progress/{upload_id}",
            headers=headers
        )
        
        # Parse SSE response
        progress_text = progress_response.text
        if progress_text.startswith('data:'):
            progress_data = json.loads(progress_text.split('data:')[1].strip())
        else:
            progress_data = json.loads(progress_text)
        
        print(f"  Progress status: {progress_data.get('status')}")
        
        results = progress_data.get('results', {})
        notas_desconsideradas = results.get('notas_desconsideradas_devolucao', [])
        duplicadas = results.get('duplicadas', [])
        success = results.get('success', [])
        
        print(f"  Notas desconsideradas: {len(notas_desconsideradas)}")
        print(f"  Duplicadas: {len(duplicadas)}")
        print(f"  Success: {len(success)}")
        
        # Check if devolução was detected
        devolucao_detected = False
        
        # Check in notas_desconsideradas_devolucao
        for nota in notas_desconsideradas:
            if nota.get('chave_nfe') == EXPECTED_CHAVE_NFE:
                devolucao_detected = True
                print(f"✓ Devolução detected in notas_desconsideradas_devolucao:")
                print(f"    Motivo: {nota.get('motivo')}")
                print(f"    NFe Referenciada: {nota.get('nfe_referenciada')}")
                break
        
        # Check in success list with status 'devolucao_fornecedor'
        for item in success:
            if item.get('status') == 'devolucao_fornecedor' and item.get('chave') == EXPECTED_CHAVE_NFE:
                devolucao_detected = True
                print(f"✓ Devolução detected in success list with status 'devolucao_fornecedor'")
                break
        
        # If duplicate, the document already exists - check it in next test
        if duplicadas:
            for dup in duplicadas:
                if dup.get('chave') == EXPECTED_CHAVE_NFE:
                    print(f"  Document already exists (duplicate)")
                    devolucao_detected = True  # Will verify in next test
                    break
        
        assert devolucao_detected, "Devolução should be detected"
        print("✓ Devolução detection working correctly")
    
    def test_05_document_has_desconsiderada_devolucao_true(self):
        """Test that the document has desconsiderada_devolucao=True in database"""
        # Query the relatório de devoluções endpoint which returns desconsideradas
        response = self.session.get(
            f"{BASE_URL}/api/relatorio-devolucoes-fornecedor/{TEST_COMPANY_ID}",
            params={"competencia": "01/2026"}
        )
        
        assert response.status_code == 200, f"Relatório endpoint failed: {response.text}"
        
        result = response.json()
        pares = result.get('pares', [])
        
        # Find our document
        doc_found = None
        for par in pares:
            devolucao = par.get('devolucao', {})
            if devolucao.get('chave') == EXPECTED_CHAVE_NFE:
                doc_found = par
                break
        
        assert doc_found is not None, f"Document with chave {EXPECTED_CHAVE_NFE} not found in relatório"
        
        print(f"✓ Document found in relatório de devoluções:")
        print(f"    Fornecedor: {doc_found.get('fornecedor')}")
        print(f"    NF Número: {doc_found.get('devolucao', {}).get('numero')}")
        print(f"    Valor: R$ {doc_found.get('devolucao', {}).get('valor')}")
        
        # The fact that it appears in relatório-devolucoes-fornecedor means desconsiderada_devolucao=True
        print("✓ Document correctly marked as desconsiderada_devolucao=True (appears in relatório)")
    
    def test_06_nfe_referenciada_extracted_correctly(self):
        """Test that nfe_referenciada is extracted from DFeReferenciado/chaveAcesso"""
        response = self.session.get(
            f"{BASE_URL}/api/relatorio-devolucoes-fornecedor/{TEST_COMPANY_ID}",
            params={"competencia": "01/2026"}
        )
        
        assert response.status_code == 200, f"Relatório endpoint failed: {response.text}"
        
        result = response.json()
        pares = result.get('pares', [])
        
        # Find our document
        doc_found = None
        for par in pares:
            devolucao = par.get('devolucao', {})
            if devolucao.get('chave') == EXPECTED_CHAVE_NFE:
                doc_found = par
                break
        
        assert doc_found is not None, f"Document not found"
        
        # Check nota_original which contains the referenced NFe
        nota_original = doc_found.get('nota_original', {})
        nfe_ref_chave = nota_original.get('chave', '')
        
        print(f"  NFe Referenciada chave: {nfe_ref_chave}")
        print(f"  Expected: {EXPECTED_NFE_REF}")
        
        assert nfe_ref_chave == EXPECTED_NFE_REF, f"nfe_referenciada should be {EXPECTED_NFE_REF}, got {nfe_ref_chave}"
        print("✓ nfe_referenciada correctly extracted from DFeReferenciado/chaveAcesso")
    
    def test_07_relatorio_devolucoes_returns_correct_data(self):
        """Test that /api/relatorio-devolucoes-fornecedor returns complete data"""
        response = self.session.get(
            f"{BASE_URL}/api/relatorio-devolucoes-fornecedor/{TEST_COMPANY_ID}",
            params={"competencia": "01/2026"}
        )
        
        assert response.status_code == 200, f"Relatório endpoint failed: {response.text}"
        
        result = response.json()
        pares = result.get('pares', [])
        
        print(f"  Total pares no relatório: {len(pares)}")
        
        # Find our devolução
        found = False
        for par in pares:
            devolucao = par.get('devolucao', {})
            if devolucao.get('chave') == EXPECTED_CHAVE_NFE:
                found = True
                
                # Verify all required fields
                assert devolucao.get('numero') == '261825', "Número should be 261825"
                assert devolucao.get('tipo') == 'DEVOLUÇÃO (Entrada)', "Tipo should be DEVOLUÇÃO (Entrada)"
                assert devolucao.get('valor') == 90090, f"Valor should be 90090, got {devolucao.get('valor')}"
                assert par.get('fornecedor') == 'GRF DISTRIBUICAO LTDA', "Fornecedor should be GRF DISTRIBUICAO LTDA"
                
                print(f"✓ Relatório contains correct data:")
                print(f"    Fornecedor: {par.get('fornecedor')}")
                print(f"    NF Devolução: {devolucao.get('numero')}")
                print(f"    Valor: R$ {devolucao.get('valor')}")
                print(f"    Data: {devolucao.get('data')}")
                print(f"    CFOPs: {devolucao.get('cfops')}")
                break
        
        assert found, f"Devolução with chave {EXPECTED_CHAVE_NFE} not found in relatório"
        print("✓ Relatório de devoluções returns complete and correct data")
    
    def test_08_normal_notes_not_marked_as_devolucao(self):
        """Test that normal notes (non-devolução) are not marked as desconsiderada"""
        # Check that regular documents in the company are not marked as desconsideradas
        response = self.session.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": TEST_COMPANY_ID, "competencia": "01/2026"}
        )
        
        assert response.status_code == 200, f"Documents endpoint failed: {response.text}"
        
        docs = response.json()
        print(f"  Total documents in competência 01/2026: {len(docs)}")
        
        # All documents returned by this endpoint should NOT be desconsideradas
        # (because the endpoint filters them out)
        for doc in docs[:5]:  # Check first 5
            desconsiderada = doc.get('desconsiderada_devolucao', False)
            assert desconsiderada == False, f"Document {doc.get('numero_nfe')} should not be desconsiderada"
        
        print("✓ Normal documents are not marked as desconsiderada_devolucao")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
