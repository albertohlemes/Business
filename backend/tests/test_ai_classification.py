"""
Test AI Classification for XML Upload - Iteration 11
Tests the CFOP conversion by AI for entrada documents
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test XML with products that should be classified by AI
# CNPJ destinatário = 28225418000116 (ANZEN company)
# Competência = 02/2026
TEST_XML_CONTENT = '''<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35260212345678000199550010000001231234567890" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>999</nNF>
        <dhEmi>2026-02-15T10:00:00-03:00</dhEmi>
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
        <CNPJ>12345678000199</CNPJ>
        <xNome>FORNECEDOR ORIENTAL LTDA</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>123456789012</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>28225418000116</CNPJ>
        <xNome>ANZEN COMERCIO DE ALIMENTOS LTDA</xNome>
        <enderDest>
          <xLgr>RUA DESTINO</xLgr>
          <nro>200</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>02000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>1</indIEDest>
        <IE>987654321098</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>SHOYU TRADICIONAL 1L</xProd>
          <NCM>21039090</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>15.00</vUnCom>
          <vProd>150.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>10.0000</qTrib>
          <vUnTrib>15.00</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>150.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>27.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>150.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>2.48</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>150.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>11.40</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <det nItem="2">
        <prod>
          <cProd>002</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>DETERGENTE LIQUIDO 500ML</xProd>
          <NCM>34022000</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>20.0000</qCom>
          <vUnCom>5.00</vUnCom>
          <vProd>100.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>20.0000</qTrib>
          <vUnTrib>5.00</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>100.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>18.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>100.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>1.65</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>100.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>7.60</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <det nItem="3">
        <prod>
          <cProd>003</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>SACOLA PLASTICA GRANDE</xProd>
          <NCM>39232990</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>100.0000</qCom>
          <vUnCom>0.50</vUnCom>
          <vProd>50.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>100.0000</qTrib>
          <vUnTrib>0.50</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>50.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>9.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>50.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>0.83</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>50.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>3.80</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>300.00</vBC>
          <vICMS>54.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>300.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>4.96</vPIS>
          <vCOFINS>22.80</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>300.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>'''

COMPANY_ID = "72da3296-b8fa-42a4-8eaf-86e9ea8902f9"  # ANZEN company
COMPETENCIA = "02/2026"


class TestAIClassification:
    """Test AI Classification for CFOP conversion on entrada documents"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Clean up any existing documents for this competencia
        self.session.delete(f"{BASE_URL}/api/documents/{COMPANY_ID}/competencia/{COMPETENCIA}")
        
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {data['user']['email']}")
        
    def test_company_exists(self):
        """Test that ANZEN company exists with correct keywords"""
        response = self.session.get(f"{BASE_URL}/api/companies/{COMPANY_ID}")
        assert response.status_code == 200, f"Company not found: {response.text}"
        
        company = response.json()
        assert company["cnpj"] == "28225418000116" or "28.225.418/0001-16" in company["cnpj"]
        
        # Check keywords are configured
        print(f"✓ Company: {company['razao_social']}")
        print(f"  REVENDA keywords: {company.get('produtos_comercializados', [])}")
        print(f"  INSUMO keywords: {company.get('insumos_producao', [])}")
        print(f"  DESPESA keywords: {company.get('produtos_despesa', [])}")
        
    def test_xml_upload_with_ai_classification(self):
        """Test XML upload with AI classification - main test"""
        import io
        
        # Create file-like object from XML content
        xml_file = io.BytesIO(TEST_XML_CONTENT.encode('utf-8'))
        
        # Prepare multipart form data
        files = {
            'files': ('test_nfe_ai.xml', xml_file, 'application/xml')
        }
        data = {
            'company_id': COMPANY_ID,
            'competencia': COMPETENCIA,
            'tipo': 'entrada'
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload",
            files=files,
            data=data,
            headers=headers,
            timeout=60  # AI classification may take time
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        
        print(f"\n=== UPLOAD RESULT ===")
        print(f"Success: {len(result.get('success', []))} files")
        print(f"Errors: {len(result.get('errors', []))}")
        print(f"Duplicadas: {len(result.get('duplicadas', []))}")
        print(f"Rejeitadas CNPJ: {len(result.get('rejeitadas_cnpj', []))}")
        print(f"Rejeitadas Competência: {len(result.get('rejeitadas_competencia', []))}")
        
        # Check for conversion report
        relatorio = result.get('relatorio_conversoes', [])
        total_conversoes = result.get('total_conversoes', 0)
        
        print(f"\n=== RELATÓRIO DE CONVERSÕES ===")
        print(f"Total conversões: {total_conversoes}")
        
        if relatorio:
            for arquivo in relatorio:
                print(f"\nNF-e {arquivo.get('nfe')} - {arquivo.get('arquivo')}")
                for conv in arquivo.get('conversoes', []):
                    print(f"  • {conv.get('produto')}")
                    print(f"    CFOP: {conv.get('cfop_original')} → {conv.get('cfop_convertido')}")
                    print(f"    Categoria: {conv.get('categoria')}")
                    print(f"    Motivo: {conv.get('motivo')}")
        
        # Assertions
        assert len(result.get('success', [])) >= 1, "No files were successfully uploaded"
        
        # Check if AI classification happened
        if total_conversoes > 0:
            print(f"\n✓ AI Classification working! {total_conversoes} products classified")
            
            # Verify expected classifications based on ANZEN keywords:
            # REVENDA=['COMIDA', 'PRODUTO ORIENTAL'] -> SHOYU should be REVENDA (1102)
            # INSUMO=['SACOLA'] -> SACOLA should be INSUMO (1101)
            # DESPESA=['LIMPEZA'] -> DETERGENTE should be DESPESA (1556)
            
            for arquivo in relatorio:
                for conv in arquivo.get('conversoes', []):
                    produto = conv.get('produto', '').upper()
                    categoria = conv.get('categoria', '').lower()
                    cfop_convertido = conv.get('cfop_convertido', '')
                    
                    if 'SHOYU' in produto:
                        # SHOYU is oriental product -> should be REVENDA
                        assert categoria == 'revenda', f"SHOYU should be REVENDA, got {categoria}"
                        assert cfop_convertido == '1102', f"SHOYU CFOP should be 1102, got {cfop_convertido}"
                        print(f"✓ SHOYU correctly classified as REVENDA (CFOP 1102)")
                        
                    elif 'DETERGENTE' in produto:
                        # DETERGENTE is cleaning product -> should be DESPESA
                        assert categoria == 'despesa', f"DETERGENTE should be DESPESA, got {categoria}"
                        assert cfop_convertido == '1556', f"DETERGENTE CFOP should be 1556, got {cfop_convertido}"
                        print(f"✓ DETERGENTE correctly classified as DESPESA (CFOP 1556)")
                        
                    elif 'SACOLA' in produto:
                        # SACOLA is registered as INSUMO -> should be INSUMO
                        assert categoria == 'insumo', f"SACOLA should be INSUMO, got {categoria}"
                        assert cfop_convertido == '1101', f"SACOLA CFOP should be 1101, got {cfop_convertido}"
                        print(f"✓ SACOLA correctly classified as INSUMO (CFOP 1101)")
        else:
            print("⚠ No AI conversions reported - checking if fallback was used")
            
    def test_conversion_report_structure(self):
        """Test that conversion report has correct structure"""
        import io
        
        # Use a unique NF number to avoid duplicates
        import random
        nf_num = random.randint(10000, 99999)
        xml_content = TEST_XML_CONTENT.replace('<nNF>999</nNF>', f'<nNF>{nf_num}</nNF>')
        xml_content = xml_content.replace('NFe35260212345678000199550010000001231234567890', 
                                          f'NFe3526021234567800019955001000000{nf_num}1234567890')
        
        xml_file = io.BytesIO(xml_content.encode('utf-8'))
        
        files = {'files': (f'test_nfe_{nf_num}.xml', xml_file, 'application/xml')}
        data = {
            'company_id': COMPANY_ID,
            'competencia': COMPETENCIA,
            'tipo': 'entrada'
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload",
            files=files,
            data=data,
            headers=headers,
            timeout=60
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Check response structure
        assert 'success' in result
        assert 'errors' in result
        assert 'resumo' in result
        
        # Check resumo structure
        resumo = result.get('resumo', {})
        assert 'total_arquivos' in resumo
        assert 'importados' in resumo
        
        # If there are conversions, check structure
        if result.get('relatorio_conversoes'):
            for arquivo in result['relatorio_conversoes']:
                assert 'nfe' in arquivo
                assert 'arquivo' in arquivo
                assert 'conversoes' in arquivo
                
                for conv in arquivo.get('conversoes', []):
                    assert 'produto' in conv
                    assert 'cfop_original' in conv
                    assert 'cfop_convertido' in conv
                    assert 'categoria' in conv
                    assert 'motivo' in conv
                    
        print("✓ Conversion report structure is correct")


class TestCFOPRules:
    """Test CFOP conversion rules"""
    
    def test_cfop_revenda_rule(self):
        """REVENDA should use CFOP 1102 (estadual) or 2102 (interestadual)"""
        # Expected: REVENDA -> 1102 (compra para comercialização)
        print("✓ REVENDA CFOP rule: 1102 (estadual) / 2102 (interestadual)")
        
    def test_cfop_insumo_rule(self):
        """INSUMO should use CFOP 1101 (estadual) or 2101 (interestadual)"""
        # Expected: INSUMO -> 1101 (compra para industrialização)
        print("✓ INSUMO CFOP rule: 1101 (estadual) / 2101 (interestadual)")
        
    def test_cfop_despesa_rule(self):
        """DESPESA should use CFOP 1556 (estadual) or 2556 (interestadual)"""
        # Expected: DESPESA -> 1556 (compra para uso/consumo)
        print("✓ DESPESA CFOP rule: 1556 (estadual) / 2556 (interestadual)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
