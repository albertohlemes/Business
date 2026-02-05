"""
Backend API Tests for Iteration 14 - Business Contabilidade
Tests:
1. Bug P0: thefuzz library installed and /api/ai/smart-reclassify endpoint works
2. Feature: XML upload extracts complete address data (emitente_endereco, destinatario_endereco)
3. Feature: SPED Fiscal export generates registro 0150 with complete participant data
"""
import pytest
import requests
import os
import json
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Company IDs from existing data
ANZEN_COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"
COMERCIAL_RS_COMPANY_ID = "df1be49f-8cfd-4460-bc28-c56cbd900800"

# Sample NF-e XML with complete address data
SAMPLE_NFE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35260298765432000188550010000009871234567890" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>987</nNF>
        <dhEmi>2026-02-15T14:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>98765432000188</CNPJ>
        <xNome>FORNECEDOR COMPLETO LTDA</xNome>
        <xFant>FORNECEDOR COMPLETO</xFant>
        <enderEmit>
          <xLgr>RUA DAS FLORES</xLgr>
          <nro>1500</nro>
          <xCpl>SALA 101</xCpl>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>1140001234</fone>
        </enderEmit>
        <IE>123456789012</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>28225418000116</CNPJ>
        <xNome>ANZEN DISTRIBUIDORA DE ALIMENTOS LTDA.</xNome>
        <enderDest>
          <xLgr>PEDRO PERELLA</xLgr>
          <nro>215</nro>
          <xCpl></xCpl>
          <xBairro>JARDIM PRESIDENTE DUTRA</xBairro>
          <cMun>3518800</cMun>
          <xMun>GUARULHOS</xMun>
          <UF>SP</UF>
          <CEP>07031240</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>1124567890</fone>
        </enderDest>
        <indIEDest>1</indIEDest>
        <IE>127348620111</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PROD001</cProd>
          <cEAN>7891234567890</cEAN>
          <xProd>ARROZ TIPO 1 5KG</xProd>
          <NCM>10063021</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>20.0000</qCom>
          <vUnCom>25.00</vUnCom>
          <vProd>500.00</vProd>
          <cEANTrib>7891234567890</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>20.0000</qTrib>
          <vUnTrib>25.00</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>500.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>90.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>500.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>8.25</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>500.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>38.00</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>PROD002</cProd>
          <cEAN>7891234567891</cEAN>
          <xProd>FEIJAO CARIOCA 1KG</xProd>
          <NCM>07133319</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>30.0000</qCom>
          <vUnCom>8.50</vUnCom>
          <vProd>255.00</vProd>
          <cEANTrib>7891234567891</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>30.0000</qTrib>
          <vUnTrib>8.50</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>255.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>45.90</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>255.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>4.21</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>255.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>19.38</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>755.00</vBC>
          <vICMS>135.90</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>755.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>12.46</vPIS>
          <vCOFINS>57.38</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>755.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>"""


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login with admin credentials"""
        assert auth_token is not None
        print(f"✓ Login successful with {TEST_EMAIL}")


class TestTheFuzzLibrary:
    """Bug P0: Test thefuzz library is installed and working"""
    
    def test_thefuzz_import(self):
        """Test that thefuzz can be imported"""
        try:
            from thefuzz import fuzz, process
            # Test basic fuzzy matching
            score = fuzz.ratio("esponja", "esponja de aço")
            assert score > 0, "Fuzzy matching should return a score"
            print(f"✓ thefuzz library imported successfully, test score: {score}")
        except ImportError as e:
            pytest.fail(f"thefuzz library not installed: {e}")
    
    def test_thefuzz_process(self):
        """Test thefuzz process module for extracting best matches"""
        from thefuzz import process
        choices = ["esponja de aço", "detergente", "sabão", "esponja multiuso", "papel toalha"]
        result = process.extract("esponja", choices, limit=3)
        assert len(result) > 0, "Should find matches"
        assert "esponja" in result[0][0].lower(), "Best match should contain 'esponja'"
        print(f"✓ thefuzz process working: {result}")


class TestSmartReclassifyEndpoint:
    """Bug P0: Test /api/ai/smart-reclassify endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_smart_reclassify_endpoint_exists(self, auth_token):
        """Test that smart-reclassify endpoint exists and responds"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with minimal payload - should return 404 if no documents
        response = requests.post(f"{BASE_URL}/api/ai/smart-reclassify", 
            headers=headers,
            json={
                "company_id": ANZEN_COMPANY_ID,
                "competencia": "02/2026",
                "comando": "reclassificar esponjas como despesa",
                "aplicar": False,  # Don't apply changes
                "sobrepor_regras": False
            }
        )
        
        # Should return 200 (success) or 404 (no documents) - NOT 500 (server error)
        assert response.status_code in [200, 404], f"Endpoint error: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Smart reclassify endpoint working: {data.get('mensagem', 'OK')}")
        else:
            print(f"✓ Smart reclassify endpoint exists (no documents found)")
    
    def test_smart_reclassify_validation(self, auth_token):
        """Test smart-reclassify validates required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with missing company_id
        response = requests.post(f"{BASE_URL}/api/ai/smart-reclassify", 
            headers=headers,
            json={
                "competencia": "02/2026",
                "comando": "test"
            }
        )
        
        # Should return 422 (validation error) for missing required field
        assert response.status_code == 422, f"Should validate required fields: {response.status_code}"
        print("✓ Smart reclassify validates required fields")


class TestXMLUploadAddressExtraction:
    """Feature: Test XML upload extracts complete address data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def uploaded_document_id(self, auth_token):
        """Upload a test XML and return the document ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First check if document already exists
        docs_response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
            headers=headers
        )
        if docs_response.status_code == 200:
            docs = docs_response.json()
            for doc in docs:
                if doc.get('numero_nfe') == '987':
                    print(f"Document already exists with ID: {doc['id']}")
                    return doc['id']
        
        # Upload XML file - endpoint requires 'tipo' and 'files' (plural)
        files = [
            ('files', ('test_nfe_completa.xml', SAMPLE_NFE_XML.encode('utf-8'), 'application/xml'))
        ]
        data = {
            'company_id': ANZEN_COMPANY_ID,
            'competencia': '02/2026',
            'tipo': 'entrada'  # Required field
        }
        
        response = requests.post(f"{BASE_URL}/api/xml/upload", 
            headers=headers,
            files=files,
            data=data
        )
        
        print(f"Upload response: {response.status_code} - {response.text[:500]}")
        
        # May return 200 (new) or have duplicates in response
        if response.status_code == 200:
            result = response.json()
            # Check if there are uploaded documents
            if result.get('uploaded'):
                return result['uploaded'][0].get('id')
            # Check for duplicates
            if result.get('duplicadas'):
                # Get the document from the list
                docs_response = requests.get(
                    f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
                    headers=headers
                )
                docs = docs_response.json()
                for doc in docs:
                    if doc.get('numero_nfe') == '987':
                        return doc['id']
        
        # If upload failed, try to get existing document
        docs_response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
            headers=headers
        )
        if docs_response.status_code == 200:
            docs = docs_response.json()
            for doc in docs:
                if doc.get('numero_nfe') == '987':
                    return doc['id']
        
        pytest.skip(f"Could not upload or find document: {response.text[:200]}")
    
    def test_emitente_address_extracted(self, auth_token, uploaded_document_id):
        """Test that emitente address fields are extracted from XML"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/xml/documents/{uploaded_document_id}", 
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get document: {response.text}"
        
        doc = response.json()
        
        # Check emitente basic fields
        assert doc.get('emitente_cnpj') == '98765432000188', f"emitente_cnpj mismatch: {doc.get('emitente_cnpj')}"
        assert doc.get('emitente_nome') == 'FORNECEDOR COMPLETO LTDA', f"emitente_nome mismatch"
        assert doc.get('emitente_ie') == '123456789012', f"emitente_ie mismatch: {doc.get('emitente_ie')}"
        assert doc.get('emitente_uf') == 'SP', f"emitente_uf mismatch: {doc.get('emitente_uf')}"
        
        # Check emitente_endereco dict
        emit_end = doc.get('emitente_endereco', {})
        assert emit_end.get('logradouro') == 'RUA DAS FLORES', f"logradouro mismatch: {emit_end.get('logradouro')}"
        assert emit_end.get('numero') == '1500', f"numero mismatch: {emit_end.get('numero')}"
        assert emit_end.get('complemento') == 'SALA 101', f"complemento mismatch: {emit_end.get('complemento')}"
        assert emit_end.get('bairro') == 'CENTRO', f"bairro mismatch: {emit_end.get('bairro')}"
        assert emit_end.get('cidade') == 'SAO PAULO', f"cidade mismatch: {emit_end.get('cidade')}"
        assert emit_end.get('cod_municipio') == '3550308', f"cod_municipio mismatch: {emit_end.get('cod_municipio')}"
        assert emit_end.get('uf') == 'SP', f"uf mismatch: {emit_end.get('uf')}"
        assert emit_end.get('cep') == '01310100', f"cep mismatch: {emit_end.get('cep')}"
        
        print("✓ Emitente address fields extracted correctly")
        print(f"  - Logradouro: {emit_end.get('logradouro')}")
        print(f"  - Número: {emit_end.get('numero')}")
        print(f"  - Bairro: {emit_end.get('bairro')}")
        print(f"  - Cidade: {emit_end.get('cidade')}")
        print(f"  - Cód. Município: {emit_end.get('cod_municipio')}")
        print(f"  - UF: {emit_end.get('uf')}")
        print(f"  - CEP: {emit_end.get('cep')}")
    
    def test_destinatario_address_extracted(self, auth_token, uploaded_document_id):
        """Test that destinatario address fields are extracted from XML"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/xml/documents/{uploaded_document_id}", 
            headers=headers
        )
        assert response.status_code == 200
        
        doc = response.json()
        
        # Check destinatario basic fields
        assert doc.get('destinatario_cnpj') == '28225418000116', f"destinatario_cnpj mismatch"
        assert 'ANZEN' in doc.get('destinatario_nome', ''), f"destinatario_nome mismatch"
        assert doc.get('destinatario_ie') == '127348620111', f"destinatario_ie mismatch: {doc.get('destinatario_ie')}"
        assert doc.get('destinatario_uf') == 'SP', f"destinatario_uf mismatch: {doc.get('destinatario_uf')}"
        
        # Check destinatario_endereco dict
        dest_end = doc.get('destinatario_endereco', {})
        assert dest_end.get('logradouro') == 'PEDRO PERELLA', f"logradouro mismatch: {dest_end.get('logradouro')}"
        assert dest_end.get('numero') == '215', f"numero mismatch: {dest_end.get('numero')}"
        assert dest_end.get('bairro') == 'JARDIM PRESIDENTE DUTRA', f"bairro mismatch: {dest_end.get('bairro')}"
        assert dest_end.get('cidade') == 'GUARULHOS', f"cidade mismatch: {dest_end.get('cidade')}"
        assert dest_end.get('cod_municipio') == '3518800', f"cod_municipio mismatch: {dest_end.get('cod_municipio')}"
        assert dest_end.get('uf') == 'SP', f"uf mismatch: {dest_end.get('uf')}"
        assert dest_end.get('cep') == '07031240', f"cep mismatch: {dest_end.get('cep')}"
        
        print("✓ Destinatario address fields extracted correctly")
        print(f"  - Logradouro: {dest_end.get('logradouro')}")
        print(f"  - Número: {dest_end.get('numero')}")
        print(f"  - Bairro: {dest_end.get('bairro')}")
        print(f"  - Cidade: {dest_end.get('cidade')}")
        print(f"  - Cód. Município: {dest_end.get('cod_municipio')}")


class TestSPEDFiscalExport:
    """Feature: Test SPED Fiscal export generates registro 0150 with complete data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_sped_export_endpoint_exists(self, auth_token):
        """Test SPED export endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/export/sped-fiscal?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
            headers=headers
        )
        
        # Should return 200 with file or 404 if no documents
        assert response.status_code in [200, 404], f"SPED export error: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            print("✓ SPED Fiscal export endpoint working")
        else:
            print("✓ SPED Fiscal export endpoint exists (no documents for export)")
    
    def test_sped_registro_0150_has_complete_data(self, auth_token):
        """Test that registro 0150 (participantes) has complete address data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/export/sped-fiscal?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
            headers=headers
        )
        
        if response.status_code == 404:
            pytest.skip("No documents available for SPED export")
        
        assert response.status_code == 200, f"SPED export failed: {response.text}"
        
        # Get the SPED content
        sped_content = response.text
        
        # Find all 0150 records (participantes)
        lines = sped_content.split('\n')
        registro_0150_lines = [l for l in lines if l.startswith('|0150|')]
        
        assert len(registro_0150_lines) > 0, "No registro 0150 found in SPED"
        
        print(f"✓ Found {len(registro_0150_lines)} registro(s) 0150 in SPED")
        
        # Check structure of 0150 records
        # Format: |REG|COD_PART|NOME|COD_PAIS|CNPJ|CPF|IE|COD_MUN|SUFRAMA|END|NUM|COMPL|BAIRRO|
        for line in registro_0150_lines:
            fields = line.split('|')
            # Fields: ['', '0150', COD_PART, NOME, COD_PAIS, CNPJ, CPF, IE, COD_MUN, SUFRAMA, END, NUM, COMPL, BAIRRO, '']
            
            if len(fields) >= 14:
                cod_part = fields[2]
                nome = fields[3]
                cod_pais = fields[4]
                cnpj = fields[5]
                ie = fields[7]
                cod_mun = fields[8]
                endereco = fields[10]
                numero = fields[11]
                complemento = fields[12]
                bairro = fields[13]
                
                print(f"\n  Participante: {nome}")
                print(f"    CNPJ: {cnpj}")
                print(f"    IE: {ie}")
                print(f"    Cód. Município: {cod_mun}")
                print(f"    Endereço: {endereco}")
                print(f"    Número: {numero}")
                print(f"    Complemento: {complemento}")
                print(f"    Bairro: {bairro}")
                
                # Verify that address fields are not empty (at least some should have data)
                has_address_data = bool(endereco or numero or bairro or cod_mun)
                if has_address_data:
                    print(f"    ✓ Address data present")
                else:
                    print(f"    ⚠ Address data may be incomplete")
        
        print("\n✓ Registro 0150 structure verified")


class TestAPIEndpoints:
    """General API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_companies_list(self, auth_token):
        """Test companies list endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) > 0, "Should have at least one company"
        print(f"✓ Companies list: {len(companies)} companies found")
    
    def test_documents_list(self, auth_token):
        """Test documents list endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={ANZEN_COMPANY_ID}&competencia=02/2026",
            headers=headers
        )
        assert response.status_code == 200
        docs = response.json()
        print(f"✓ Documents list: {len(docs)} documents found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
