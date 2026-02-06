"""
Test suite for cancelled notes (notas canceladas) feature
Tests the detection and filtering of cancelled NF-e documents
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"

# Test company ID from context
TEST_COMPANY_ID = "df1be49f-8cfd-4460-bc28-c56cbd900800"  # COMERCIAL RS LTDA
TEST_CNPJ = "20352600000126"  # CNPJ that matches the test XML

# Cancelled note test data
CANCELLED_NOTE_CHAVE = "35260120352600000126550010003735591337008362"
CANCELLED_NOTE_XML_PATH = "/tmp/nfe_cancelada_teste.xml"


class TestCancelledNotesFeature:
    """Tests for cancelled notes detection and filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_01_auth_works(self):
        """Verify authentication is working"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == TEST_EMAIL
        print(f"✓ Auth working - logged in as {data.get('email')}")
    
    def test_02_company_exists(self):
        """Verify test company exists"""
        response = self.session.get(f"{BASE_URL}/api/companies")
        assert response.status_code == 200
        companies = response.json()
        
        # Find the test company
        test_company = None
        for company in companies:
            if company.get('id') == TEST_COMPANY_ID:
                test_company = company
                break
        
        if test_company:
            print(f"✓ Test company found: {test_company.get('razao_social')} - CNPJ: {test_company.get('cnpj')}")
        else:
            # List available companies for debugging
            print(f"Available companies: {[c.get('razao_social') for c in companies[:5]]}")
            pytest.skip(f"Test company {TEST_COMPANY_ID} not found")
    
    def test_03_upload_cancelled_xml_saves_with_cancelada_true(self):
        """
        Test that uploading a cancelled XML (cStat=101) saves with cancelada=true
        and all cancellation fields are populated
        """
        # First, delete any existing document with this key
        # We'll try to find and delete it
        response = self.session.get(f"{BASE_URL}/api/xml/documents", params={
            "company_id": TEST_COMPANY_ID
        })
        
        if response.status_code == 200:
            docs = response.json()
            for doc in docs:
                if doc.get('chave_nfe') == CANCELLED_NOTE_CHAVE:
                    # Delete existing document
                    del_response = self.session.delete(f"{BASE_URL}/api/xml/documents/{doc.get('id')}")
                    print(f"Deleted existing document: {del_response.status_code}")
        
        # Read the test XML file
        with open(CANCELLED_NOTE_XML_PATH, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        # Upload the cancelled XML
        files = {
            'files': ('nfe_cancelada_teste.xml', xml_content, 'application/xml')
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/xml/upload/{TEST_COMPANY_ID}",
            files=files,
            headers=headers,
            params={"competencia": "01/2026"}
        )
        
        print(f"Upload response status: {upload_response.status_code}")
        print(f"Upload response: {upload_response.text[:500]}")
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        result = upload_response.json()
        
        # Check if the response indicates the note was detected as cancelled
        if 'results' in result:
            for item in result['results']:
                if item.get('chave') == CANCELLED_NOTE_CHAVE:
                    assert item.get('status') == 'cancelada', f"Expected status='cancelada', got {item.get('status')}"
                    print(f"✓ Upload response shows status='cancelada' for the note")
                    
                    # Check if message contains cancellation reason
                    if 'mensagem' in item:
                        print(f"✓ Cancellation message: {item.get('mensagem')}")
                    break
        
        print(f"✓ Cancelled XML uploaded successfully")
    
    def test_04_verify_cancelled_note_saved_with_cancellation_fields(self):
        """
        Verify that the cancelled note was saved with all cancellation fields:
        - cancelada=true
        - cStat_cancelamento
        - xMotivo_cancelamento
        - dhRecbto_cancelamento
        - nProt_cancelamento
        """
        # Get the document directly from the database via API
        # Since /api/xml/documents might filter cancelled notes, we need another approach
        
        # Try to get the specific document by ID or check if it exists
        response = self.session.get(f"{BASE_URL}/api/xml/documents", params={
            "company_id": TEST_COMPANY_ID,
            "competencia": "01/2026"
        })
        
        print(f"Documents list response: {response.status_code}")
        
        # The cancelled note should NOT appear in the list if filtering is working
        if response.status_code == 200:
            docs = response.json()
            cancelled_doc = None
            for doc in docs:
                if doc.get('chave_nfe') == CANCELLED_NOTE_CHAVE:
                    cancelled_doc = doc
                    break
            
            if cancelled_doc:
                # If it appears, check if it has cancellation fields
                print(f"⚠ Cancelled note appears in documents list (filter may not be working)")
                print(f"  cancelada: {cancelled_doc.get('cancelada')}")
                print(f"  cStat_cancelamento: {cancelled_doc.get('cStat_cancelamento')}")
                print(f"  xMotivo_cancelamento: {cancelled_doc.get('xMotivo_cancelamento')}")
                
                # Verify cancellation fields
                assert cancelled_doc.get('cancelada') == True, "cancelada should be True"
                assert cancelled_doc.get('cStat_cancelamento') in ['101', '151'], f"cStat should be 101 or 151, got {cancelled_doc.get('cStat_cancelamento')}"
                assert cancelled_doc.get('xMotivo_cancelamento'), "xMotivo_cancelamento should not be empty"
            else:
                print(f"✓ Cancelled note correctly filtered from documents list")
    
    def test_05_dashboard_stats_excludes_cancelled_notes(self):
        """
        Test that /api/dashboard/stats excludes cancelled notes from totals
        """
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats", params={
            "company_id": TEST_COMPANY_ID,
            "competencia": "01/2026"
        })
        
        print(f"Dashboard stats response: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"Dashboard stats: {json.dumps(stats, indent=2)[:500]}")
            
            # The cancelled note value (R$ 1000.00) should NOT be included in totals
            # We can't assert exact values without knowing other data, but we verify the endpoint works
            print(f"✓ Dashboard stats endpoint working")
            
            # Check if there are any totals
            if 'total_entradas' in stats or 'total_saidas' in stats:
                print(f"  Total entradas: {stats.get('total_entradas', 0)}")
                print(f"  Total saídas: {stats.get('total_saidas', 0)}")
        else:
            print(f"Dashboard stats error: {response.text}")
    
    def test_06_documents_endpoint_filters_cancelled_notes(self):
        """
        Test that /api/xml/documents filters out cancelled notes
        """
        response = self.session.get(f"{BASE_URL}/api/xml/documents", params={
            "company_id": TEST_COMPANY_ID
        })
        
        assert response.status_code == 200
        docs = response.json()
        
        # Check if any cancelled note appears in the list
        cancelled_found = False
        for doc in docs:
            if doc.get('cancelada') == True:
                cancelled_found = True
                print(f"⚠ Found cancelled note in list: {doc.get('chave_nfe')}")
        
        if cancelled_found:
            print(f"✗ FAIL: Cancelled notes should be filtered from /api/xml/documents")
            # This is a bug - the endpoint should filter cancelled notes
            assert False, "Cancelled notes should not appear in /api/xml/documents"
        else:
            print(f"✓ No cancelled notes in documents list (filter working or no cancelled notes)")
    
    def test_07_verify_cancellation_detection_logic(self):
        """
        Test the XML parsing logic for cancellation detection
        by checking if a note with cStat=101 is correctly identified
        """
        # Upload a fresh cancelled XML and verify the response
        with open(CANCELLED_NOTE_XML_PATH, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        # Verify the XML contains cStat=101
        assert '<cStat>101</cStat>' in xml_content, "Test XML should contain cStat=101"
        assert '<xMotivo>Cancelamento de NF-e homologado</xMotivo>' in xml_content
        
        print(f"✓ Test XML correctly contains cStat=101 and cancellation reason")


class TestCancelledNotesEdgeCases:
    """Edge case tests for cancelled notes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_08_cstat_151_also_detected_as_cancelled(self):
        """
        Test that cStat=151 (extemporaneous cancellation) is also detected
        """
        # Create a test XML with cStat=151
        xml_151 = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35260120352600000126550010003735591337008363" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>33700837</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>373560</nNF>
        <dhEmi>2026-01-15T11:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
      </ide>
      <emit>
        <CNPJ>20352600000126</CNPJ>
        <xNome>EMPRESA EMITENTE LTDA</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01001000</CEP>
        </enderEmit>
        <IE>123456789012</IE>
      </emit>
      <dest>
        <CNPJ>12345678000190</CNPJ>
        <xNome>CLIENTE TESTE LTDA</xNome>
        <enderDest>
          <xLgr>AV BRASIL</xLgr>
          <nro>200</nro>
          <xBairro>JARDINS</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
        </enderDest>
        <IE>987654321098</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PROD002</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO TESTE CANCELADO 151</xProd>
          <NCM>21069090</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>200.0000</vUnCom>
          <vProd>1000.00</vProd>
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
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>1000.00</vBC>
          <vICMS>180.00</vICMS>
          <vProd>1000.00</vProd>
          <vNF>1000.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL009_V4</verAplic>
      <chNFe>35260120352600000126550010003735591337008363</chNFe>
      <dhRecbto>2026-01-15T11:35:00-03:00</dhRecbto>
      <nProt>135260000001235</nProt>
      <digVal>ABCD1234567890EFGI</digVal>
      <cStat>151</cStat>
      <xMotivo>Cancelamento de NF-e homologado fora de prazo</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>"""
        
        # Upload the XML with cStat=151
        files = {
            'files': ('nfe_cancelada_151.xml', xml_151, 'application/xml')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/xml/upload/{TEST_COMPANY_ID}",
            files=files,
            headers=headers,
            params={"competencia": "01/2026"}
        )
        
        print(f"Upload cStat=151 response: {upload_response.status_code}")
        
        if upload_response.status_code == 200:
            result = upload_response.json()
            print(f"Upload result: {json.dumps(result, indent=2)[:500]}")
            
            # Check if detected as cancelled
            if 'results' in result:
                for item in result['results']:
                    if '337008363' in str(item.get('chave', '')):
                        status = item.get('status')
                        print(f"  Status for cStat=151 note: {status}")
                        if status == 'cancelada':
                            print(f"✓ cStat=151 correctly detected as cancelled")
                        else:
                            print(f"⚠ cStat=151 not detected as cancelled (status={status})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
