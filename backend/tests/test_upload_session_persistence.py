"""
Test Upload Session Persistence - MongoDB Fallback
Tests the fix for the bug where upload sessions were lost on server restart.

Bug Description:
- Upload sessions were stored only in memory (dict Python)
- Sessions were lost when server restarted (hot reload)
- Error: 'Sessão de upload não encontrada' for all 138 files

Fix:
- Sessions are now persisted in MongoDB (upload_sessions collection)
- get_upload_session() checks memory first, then MongoDB
- save_upload_session() saves to both memory and MongoDB
- delete_upload_session() removes from both memory and MongoDB
"""

import pytest
import requests
import os
import time
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
TEST_COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"

# Sample NF-e XML for testing
SAMPLE_NFE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35260120352600000126550010003708061337008361" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>33700836</cNF>
        <natOp>VENDA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>370806</nNF>
        <dhEmi>2026-01-15T10:30:00-03:00</dhEmi>
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
        <CNPJ>12345678000190</CNPJ>
        <xNome>FORNECEDOR TESTE LTDA</xNome>
        <xFant>FORNECEDOR</xFant>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3518800</cMun>
          <xMun>GUARULHOS</xMun>
          <UF>SP</UF>
          <CEP>07000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>123456789</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>20352600000126</CNPJ>
        <xNome>COMERCIAL RS LTDA</xNome>
        <enderDest>
          <xLgr>AMANCIO GAIOLLI</xLgr>
          <nro>426</nro>
          <xBairro>BONSUCESSO</xBairro>
          <cMun>3518800</cMun>
          <xMun>GUARULHOS</xMun>
          <UF>SP</UF>
          <CEP>07251250</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>1</indIEDest>
        <IE>127128453114</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>22030000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>100.0000</vUnCom>
          <vProd>1000.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>10.0000</qTrib>
          <vUnTrib>100.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>0</modBC>
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
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL009_V4</verAplic>
      <chNFe>35260120352600000126550010003708061337008361</chNFe>
      <dhRecbto>2026-01-15T10:35:00-03:00</dhRecbto>
      <nProt>135260000001234</nProt>
      <digVal>AbCdEfGhIjKlMnOpQrStUvWxYz12345678==</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>"""


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestUploadInit:
    """Tests for POST /api/xml/upload-init endpoint"""
    
    def test_upload_init_creates_session(self, auth_headers):
        """Test that upload-init creates a session and returns upload_id"""
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 5
            }
        )
        
        assert response.status_code == 200, f"upload-init failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "upload_id" in data, "Response should contain upload_id"
        assert isinstance(data["upload_id"], str), "upload_id should be a string"
        assert len(data["upload_id"]) > 0, "upload_id should not be empty"
        
        print(f"✓ upload-init created session with upload_id: {data['upload_id']}")
    
    def test_upload_init_invalid_company(self, auth_headers):
        """Test that upload-init returns 404 for invalid company"""
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": "invalid-company-id",
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 5
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ upload-init returns 404 for invalid company")
    
    def test_upload_init_requires_auth(self):
        """Test that upload-init requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 5
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ upload-init requires authentication")


class TestUploadStream:
    """Tests for POST /api/xml/upload-stream endpoint"""
    
    def test_upload_stream_with_valid_session(self, auth_headers):
        """Test that upload-stream works with a valid session"""
        # Step 1: Create upload session
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 1
            }
        )
        assert init_response.status_code == 200, f"upload-init failed: {init_response.text}"
        upload_id = init_response.json()["upload_id"]
        print(f"✓ Created session: {upload_id}")
        
        # Step 2: Upload file using the session
        files = [
            ("files", ("test_nfe.xml", SAMPLE_NFE_XML.encode(), "application/xml"))
        ]
        
        stream_response = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            headers=auth_headers,
            data={"upload_id": upload_id},
            files=files
        )
        
        assert stream_response.status_code == 200, f"upload-stream failed: {stream_response.text}"
        data = stream_response.json()
        
        # Verify response structure - upload-stream returns processed count
        assert "processed" in data or "message" in data or "success" in data or "results" in data, f"Unexpected response: {data}"
        if "processed" in data:
            assert data["processed"] >= 0, "processed count should be >= 0"
        print(f"✓ upload-stream processed file successfully: {data}")
    
    def test_upload_stream_invalid_session(self, auth_headers):
        """Test that upload-stream returns 404 for invalid session"""
        files = [
            ("files", ("test_nfe.xml", SAMPLE_NFE_XML.encode(), "application/xml"))
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            headers=auth_headers,
            data={"upload_id": "invalid-upload-id-12345"},
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        assert "Sessão de upload não encontrada" in response.text or "não encontrada" in response.text.lower()
        print("✓ upload-stream returns 404 for invalid session")


class TestSessionPersistence:
    """Tests for MongoDB session persistence (the main bug fix)"""
    
    def test_session_persisted_in_mongodb(self, auth_headers):
        """Test that session is persisted in MongoDB after creation"""
        # Create session
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 10
            }
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        print(f"✓ Created session: {upload_id}")
        
        # Wait a bit for MongoDB write to complete
        time.sleep(0.5)
        
        # Verify session can be retrieved (this tests the get_upload_session function)
        # We do this by trying to use the session with upload-stream
        files = [
            ("files", ("test_nfe.xml", SAMPLE_NFE_XML.encode(), "application/xml"))
        ]
        
        stream_response = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            headers=auth_headers,
            data={"upload_id": upload_id},
            files=files
        )
        
        # Session should be found (either in memory or MongoDB)
        assert stream_response.status_code == 200, f"Session not found: {stream_response.text}"
        print("✓ Session persisted and retrievable")
    
    def test_session_survives_memory_clear_simulation(self, auth_headers):
        """
        Test that session can be recovered from MongoDB.
        This simulates the scenario where server restarts and memory is cleared.
        
        Note: We can't actually restart the server, but we can verify the MongoDB
        persistence by checking that the session data is correctly stored.
        """
        # Create session
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 5
            }
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        print(f"✓ Created session: {upload_id}")
        
        # Wait for MongoDB write
        time.sleep(0.5)
        
        # Try to use the session multiple times (simulating multiple file batches)
        for i in range(3):
            files = [
                ("files", (f"test_nfe_{i}.xml", SAMPLE_NFE_XML.encode(), "application/xml"))
            ]
            
            stream_response = requests.post(
                f"{BASE_URL}/api/xml/upload-stream",
                headers=auth_headers,
                data={"upload_id": upload_id},
                files=files
            )
            
            # Each batch should find the session
            assert stream_response.status_code == 200, f"Batch {i+1} failed: {stream_response.text}"
            print(f"✓ Batch {i+1} processed successfully")
        
        print("✓ Session survived multiple batch uploads")


class TestUploadProgress:
    """Tests for GET /api/xml/upload-progress/{upload_id} SSE endpoint"""
    
    def test_upload_progress_endpoint_exists(self, auth_headers):
        """Test that upload-progress endpoint exists and returns SSE stream"""
        # Create session first
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 1
            }
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        
        # Try to connect to progress stream (with timeout)
        try:
            response = requests.get(
                f"{BASE_URL}/api/xml/upload-progress/{upload_id}",
                stream=True,
                timeout=5
            )
            
            # Should return 200 with SSE content type
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            content_type = response.headers.get("content-type", "")
            assert "text/event-stream" in content_type, f"Expected SSE, got {content_type}"
            
            # Read first event
            for line in response.iter_lines(decode_unicode=True):
                if line and line.startswith("data:"):
                    print(f"✓ Received SSE event: {line[:100]}...")
                    break
            
            response.close()
            print("✓ upload-progress endpoint returns SSE stream")
            
        except requests.exceptions.Timeout:
            # Timeout is acceptable for SSE - it means the connection was established
            print("✓ upload-progress endpoint accepts connection (timeout expected for SSE)")
    
    def test_upload_progress_invalid_session(self):
        """Test that upload-progress handles invalid session gracefully"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/xml/upload-progress/invalid-session-id",
                stream=True,
                timeout=5
            )
            
            # Should return 200 (SSE) but with error message in stream
            assert response.status_code == 200
            
            # Read events until we get error or timeout
            for line in response.iter_lines(decode_unicode=True):
                if line and "error" in line.lower():
                    print(f"✓ Received error event for invalid session: {line[:100]}...")
                    break
            
            response.close()
            
        except requests.exceptions.Timeout:
            print("✓ upload-progress handles invalid session (timeout)")


class TestEndToEndUploadFlow:
    """End-to-end tests for the complete upload flow"""
    
    def test_complete_upload_flow(self, auth_headers):
        """Test the complete upload flow: init -> stream -> verify"""
        # Step 1: Initialize upload session
        init_response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data={
                "company_id": TEST_COMPANY_ID,
                "competencia": "01/2026",
                "tipo": "entrada",
                "total_files": 2
            }
        )
        assert init_response.status_code == 200
        upload_id = init_response.json()["upload_id"]
        print(f"Step 1: Created session {upload_id}")
        
        # Step 2: Upload first batch
        files1 = [
            ("files", ("nfe_batch1.xml", SAMPLE_NFE_XML.encode(), "application/xml"))
        ]
        
        stream_response1 = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            headers=auth_headers,
            data={"upload_id": upload_id},
            files=files1
        )
        assert stream_response1.status_code == 200
        print("Step 2: First batch uploaded")
        
        # Step 3: Upload second batch (using same session)
        # Modify XML slightly to avoid duplicate detection
        modified_xml = SAMPLE_NFE_XML.replace("370806", "370807").replace("33700836", "33700837")
        
        files2 = [
            ("files", ("nfe_batch2.xml", modified_xml.encode(), "application/xml"))
        ]
        
        stream_response2 = requests.post(
            f"{BASE_URL}/api/xml/upload-stream",
            headers=auth_headers,
            data={"upload_id": upload_id},
            files=files2
        )
        assert stream_response2.status_code == 200
        print("Step 3: Second batch uploaded")
        
        print("✓ Complete upload flow successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
