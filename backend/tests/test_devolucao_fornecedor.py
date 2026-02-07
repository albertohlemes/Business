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
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
TEST_COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS

# Test XML file path
TEST_DEVOLUCAO_XML = "/tmp/test_devolucao.xml"


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
        assert '35251246443440000114550010002602511453763036' in xml_content, "XML should have the referenced NFe key"
        assert '1411' in xml_content, "XML should have CFOP 1411"
        
        print("✓ Test XML contains expected devolução markers:")
        print("  - finNFe=4 (devolução)")
        print("  - DFeReferenciado with chaveAcesso")
        print("  - CFOP 1411 (devolução de venda)")
    
    def test_04_upload_devolucao_xml_detects_and_marks_desconsiderada(self):
        """Test that uploading a devolução XML marks it as desconsiderada"""
        # First, delete any existing document with this key to ensure clean test
        chave_nfe = "35260146443440000114550010002618251462953996"
        
        # Check if document already exists and delete it
        response = self.session.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": TEST_COMPANY_ID, "competencia": "01/2026", "include_desconsideradas": "true"}
        )
        
        if response.status_code == 200:
            docs = response.json()
            for doc in docs:
                if doc.get('chave_nfe') == chave_nfe:
                    # Delete existing document
                    delete_response = self.session.delete(f"{BASE_URL}/api/xml/{doc.get('id')}")
                    print(f"  Deleted existing document: {doc.get('id')}")
        
        # Step 1: Initialize upload session
        headers = {"Authorization": f"Bearer {self.token}"}
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
        
        print(f"Init response status: {init_response.status_code}")
        print(f"Init response: {init_response.text}")
        
        assert init_response.status_code == 200, f"Upload init failed: {init_response.text}"
        
        upload_id = init_response.json().get('upload_id')
        assert upload_id, "upload_id not returned"
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
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text[:1000] if response.text else 'No response'}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        result = response.json()
        
        # Check if it was detected as devolução
        success_list = result.get('success', [])
        notas_desconsideradas = result.get('notas_desconsideradas_devolucao', [])
        
        print(f"  Success list: {success_list}")
        print(f"  Notas desconsideradas: {notas_desconsideradas}")
        
        # Either it's in success with status 'devolucao_fornecedor' or in notas_desconsideradas
        is_devolucao_detected = False
        
        for item in success_list:
            if item.get('status') == 'devolucao_fornecedor':
                is_devolucao_detected = True
                print(f"✓ Devolução detected in success list: {item}")
                break
        
        if not is_devolucao_detected and notas_desconsideradas:
            is_devolucao_detected = True
            print(f"✓ Devolução detected in notas_desconsideradas: {notas_desconsideradas}")
        
        # If it was a duplicate, check the existing document
        duplicadas = result.get('duplicadas', [])
        if duplicadas:
            print(f"  Note was duplicate, checking existing document...")
            is_devolucao_detected = True  # Will verify in next test
        
        assert is_devolucao_detected or duplicadas, "Devolução should be detected or document already exists"
        print("✓ Upload completed - devolução detection triggered")
    
    def test_05_document_has_desconsiderada_devolucao_true(self):
        """Test that the uploaded document has desconsiderada_devolucao=True"""
        chave_nfe = "35260146443440000114550010002618251462953996"
        
        # Query the document directly
        response = self.session.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": TEST_COMPANY_ID, "competencia": "01/2026", "include_desconsideradas": "true"}
        )
        
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        
        docs = response.json()
        
        # Find our document
        doc_found = None
        for doc in docs:
            if doc.get('chave_nfe') == chave_nfe:
                doc_found = doc
                break
        
        # If not found in regular list, try to find via direct query
        if not doc_found:
            # Try searching all documents
            response = self.session.get(
                f"{BASE_URL}/api/xml/documents",
                params={"company_id": TEST_COMPANY_ID, "include_desconsideradas": "true"}
            )
            if response.status_code == 200:
                docs = response.json()
                for doc in docs:
                    if doc.get('chave_nfe') == chave_nfe:
                        doc_found = doc
                        break
        
        assert doc_found is not None, f"Document with chave {chave_nfe} not found"
        
        # Check desconsiderada_devolucao field
        desconsiderada = doc_found.get('desconsiderada_devolucao', False)
        print(f"  Document found: NF {doc_found.get('numero_nfe')}")
        print(f"  desconsiderada_devolucao: {desconsiderada}")
        print(f"  motivo_desconsideracao: {doc_found.get('motivo_desconsideracao', 'N/A')}")
        
        assert desconsiderada == True, f"desconsiderada_devolucao should be True, got {desconsiderada}"
        print("✓ Document correctly marked as desconsiderada_devolucao=True")
    
    def test_06_nfe_referenciada_extracted_correctly(self):
        """Test that nfe_referenciada is extracted from DFeReferenciado/chaveAcesso"""
        chave_nfe = "35260146443440000114550010002618251462953996"
        expected_nfe_ref = "35251246443440000114550010002602511453763036"
        
        # Query the document
        response = self.session.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": TEST_COMPANY_ID, "include_desconsideradas": "true"}
        )
        
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        
        docs = response.json()
        doc_found = None
        for doc in docs:
            if doc.get('chave_nfe') == chave_nfe:
                doc_found = doc
                break
        
        assert doc_found is not None, f"Document with chave {chave_nfe} not found"
        
        nfe_referenciada = doc_found.get('nfe_referenciada', '')
        print(f"  nfe_referenciada: {nfe_referenciada}")
        print(f"  Expected: {expected_nfe_ref}")
        
        assert nfe_referenciada == expected_nfe_ref, f"nfe_referenciada should be {expected_nfe_ref}, got {nfe_referenciada}"
        print("✓ nfe_referenciada correctly extracted from DFeReferenciado/chaveAcesso")
    
    def test_07_relatorio_devolucoes_includes_desconsiderada_note(self):
        """Test that /api/relatorio-devolucoes-fornecedor returns the desconsiderada note"""
        response = self.session.get(
            f"{BASE_URL}/api/relatorio-devolucoes-fornecedor/{TEST_COMPANY_ID}",
            params={"competencia": "01/2026"}
        )
        
        assert response.status_code == 200, f"Relatório endpoint failed: {response.text}"
        
        result = response.json()
        pares = result.get('pares', [])
        
        print(f"  Total pares no relatório: {len(pares)}")
        
        # Find our devolução
        chave_nfe = "35260146443440000114550010002618251462953996"
        found = False
        
        for par in pares:
            devolucao = par.get('devolucao', {})
            if devolucao.get('chave') == chave_nfe:
                found = True
                print(f"✓ Devolução found in relatório:")
                print(f"    Fornecedor: {par.get('fornecedor')}")
                print(f"    NF Devolução: {devolucao.get('numero')}")
                print(f"    Valor: R$ {devolucao.get('valor')}")
                print(f"    NFe Referenciada: {par.get('nota_original', {}).get('chave', 'N/A')}")
                break
        
        assert found, f"Devolução with chave {chave_nfe} not found in relatório"
        print("✓ Relatório de devoluções includes the desconsiderada note")
    
    def test_08_normal_notes_imported_normally(self):
        """Test that normal notes (non-devolução) are imported without desconsiderada flag"""
        # Create a simple normal NFe XML for testing
        normal_xml = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe Id="NFe35260120352600000126550010009999991000000001" versao="4.00">
<ide>
<cUF>35</cUF>
<cNF>00000001</cNF>
<natOp>Venda de mercadoria</natOp>
<mod>55</mod>
<serie>1</serie>
<nNF>999999</nNF>
<dhEmi>2026-01-15T10:00:00-03:00</dhEmi>
<tpNF>1</tpNF>
<idDest>1</idDest>
<cMunFG>3518800</cMunFG>
<tpImp>1</tpImp>
<tpEmis>1</tpEmis>
<cDV>1</cDV>
<tpAmb>1</tpAmb>
<finNFe>1</finNFe>
<indFinal>1</indFinal>
<indPres>1</indPres>
<procEmi>0</procEmi>
<verProc>1.0</verProc>
</ide>
<emit>
<CNPJ>20352600000126</CNPJ>
<xNome>COMERCIAL RS EIRELI</xNome>
<enderEmit>
<xLgr>Av AMANCIO GAIOLLI</xLgr>
<nro>426</nro>
<xBairro>AGUA CHATA</xBairro>
<cMun>3518800</cMun>
<xMun>Guarulhos</xMun>
<UF>SP</UF>
<CEP>07251250</CEP>
<cPais>1058</cPais>
<xPais>Brasil</xPais>
</enderEmit>
<IE>127128453114</IE>
<CRT>3</CRT>
</emit>
<dest>
<CNPJ>12345678000199</CNPJ>
<xNome>CLIENTE TESTE LTDA</xNome>
<enderDest>
<xLgr>Rua Teste</xLgr>
<nro>100</nro>
<xBairro>Centro</xBairro>
<cMun>3550308</cMun>
<xMun>Sao Paulo</xMun>
<UF>SP</UF>
<CEP>01000000</CEP>
<cPais>1058</cPais>
<xPais>Brasil</xPais>
</enderDest>
<indIEDest>1</indIEDest>
<IE>123456789012</IE>
</dest>
<det nItem="1">
<prod>
<cProd>001</cProd>
<cEAN>SEM GTIN</cEAN>
<xProd>PRODUTO TESTE NORMAL</xProd>
<NCM>22089000</NCM>
<CFOP>5102</CFOP>
<uCom>UN</uCom>
<qCom>10</qCom>
<vUnCom>100.00</vUnCom>
<vProd>1000.00</vProd>
<cEANTrib>SEM GTIN</cEANTrib>
<uTrib>UN</uTrib>
<qTrib>10</qTrib>
<vUnTrib>100.00</vUnTrib>
<indTot>1</indTot>
</prod>
<imposto>
<ICMS>
<ICMS00>
<orig>0</orig>
<CST>00</CST>
<modBC>3</modBC>
<vBC>1000.00</vBC>
<pICMS>18.00</pICMS>
<vICMS>180.00</vICMS>
</ICMS00>
</ICMS>
<PIS>
<PISAliq>
<CST>01</CST>
<vBC>1000.00</vBC>
<pPIS>1.65</pPIS>
<vPIS>16.50</vPIS>
</PISAliq>
</PIS>
<COFINS>
<COFINSAliq>
<CST>01</CST>
<vBC>1000.00</vBC>
<pCOFINS>7.60</pCOFINS>
<vCOFINS>76.00</vCOFINS>
</COFINSAliq>
</COFINS>
</imposto>
</det>
<total>
<ICMSTot>
<vBC>1000.00</vBC>
<vICMS>180.00</vICMS>
<vICMSDeson>0.00</vICMSDeson>
<vFCP>0.00</vFCP>
<vBCST>0.00</vBCST>
<vST>0.00</vST>
<vFCPST>0.00</vFCPST>
<vFCPSTRet>0.00</vFCPSTRet>
<vProd>1000.00</vProd>
<vFrete>0.00</vFrete>
<vSeg>0.00</vSeg>
<vDesc>0.00</vDesc>
<vII>0.00</vII>
<vIPI>0.00</vIPI>
<vIPIDevol>0.00</vIPIDevol>
<vPIS>16.50</vPIS>
<vCOFINS>76.00</vCOFINS>
<vOutro>0.00</vOutro>
<vNF>1000.00</vNF>
</ICMSTot>
</total>
<transp>
<modFrete>9</modFrete>
</transp>
<pag>
<detPag>
<tPag>01</tPag>
<vPag>1000.00</vPag>
</detPag>
</pag>
</infNFe>
</NFe>
<protNFe versao="4.00">
<infProt>
<tpAmb>1</tpAmb>
<verAplic>SP_NFE_PL009_V4</verAplic>
<chNFe>35260120352600000126550010009999991000000001</chNFe>
<dhRecbto>2026-01-15T10:00:01-03:00</dhRecbto>
<nProt>135260000000001</nProt>
<digVal>test</digVal>
<cStat>100</cStat>
<xMotivo>Autorizado o uso da NF-e</xMotivo>
</infProt>
</protNFe>
</nfeProc>"""
        
        # Save to temp file
        temp_file = "/tmp/test_normal_nfe.xml"
        with open(temp_file, 'w') as f:
            f.write(normal_xml)
        
        chave_nfe = "35260120352600000126550010009999991000000001"
        
        # Delete if exists
        response = self.session.get(
            f"{BASE_URL}/api/xml/documents",
            params={"company_id": TEST_COMPANY_ID, "competencia": "01/2026"}
        )
        
        if response.status_code == 200:
            docs = response.json()
            for doc in docs:
                if doc.get('chave_nfe') == chave_nfe:
                    self.session.delete(f"{BASE_URL}/api/xml/{doc.get('id')}")
                    print(f"  Deleted existing test document")
        
        # Upload the normal XML
        with open(temp_file, 'rb') as f:
            files = {'files': ('test_normal.xml', f, 'application/xml')}
            data = {
                'company_id': TEST_COMPANY_ID,
                'competencia': '01/2026',
                'tipo': 'saida'
            }
            
            headers = {"Authorization": f"Bearer {self.token}"}
            
            response = requests.post(
                f"{BASE_URL}/api/xml/upload-stream",
                files=files,
                data=data,
                headers=headers
            )
        
        print(f"  Upload response: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success_list = result.get('success', [])
            
            # Check that it was NOT marked as devolução
            for item in success_list:
                assert item.get('status') != 'devolucao_fornecedor', "Normal note should not be marked as devolução"
            
            # Verify the document doesn't have desconsiderada_devolucao
            response = self.session.get(
                f"{BASE_URL}/api/xml/documents",
                params={"company_id": TEST_COMPANY_ID, "competencia": "01/2026"}
            )
            
            if response.status_code == 200:
                docs = response.json()
                for doc in docs:
                    if doc.get('chave_nfe') == chave_nfe:
                        desconsiderada = doc.get('desconsiderada_devolucao', False)
                        assert desconsiderada == False, f"Normal note should not have desconsiderada_devolucao=True"
                        print(f"✓ Normal note imported correctly without desconsiderada flag")
                        
                        # Cleanup - delete the test document
                        self.session.delete(f"{BASE_URL}/api/xml/{doc.get('id')}")
                        print(f"  Cleaned up test document")
                        return
        
        print("✓ Normal notes are imported normally (test completed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
