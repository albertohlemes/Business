import requests
import sys
import json
from datetime import datetime
import os

class FiscalSystemAPITester:
    def __init__(self, base_url="https://business-fiscal.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.client_token = None
        self.admin_user = None
        self.client_user = None
        self.company_id = None
        self.document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in default_headers:
                        del default_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=default_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response.content:
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail}"
                    except:
                        error_msg += f" - {response.text[:200]}"
                print(f"❌ Failed - {error_msg}")
                self.errors.append(f"{name}: {error_msg}")
                return False, {}

        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(f"❌ Failed - {error_msg}")
            self.errors.append(f"{name}: {error_msg}")
            return False, {}

    def test_root_endpoint(self):
        """Test root endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_admin_registration(self):
        """Test admin user registration"""
        admin_data = {
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "AdminPass123!",
            "name": "Admin Test User",
            "role": "admin"
        }
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        if success:
            self.admin_user = admin_data
        return success, response

    def test_client_registration(self):
        """Test client user registration"""
        client_data = {
            "email": f"client_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "ClientPass123!",
            "name": "Client Test User",
            "role": "client"
        }
        success, response = self.run_test(
            "Client Registration",
            "POST",
            "auth/register",
            200,
            data=client_data
        )
        if success:
            self.client_user = client_data
        return success, response

    def test_admin_login(self):
        """Test admin login"""
        if not self.admin_user:
            return False, {}
        
        login_data = {
            "email": self.admin_user["email"],
            "password": self.admin_user["password"]
        }
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
        return success, response

    def test_client_login(self):
        """Test client login"""
        if not self.client_user:
            return False, {}
            
        login_data = {
            "email": self.client_user["email"],
            "password": self.client_user["password"]
        }
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.client_token = response['access_token']
        return success, response

    def test_get_me_admin(self):
        """Test get current user (admin)"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Get Current User (Admin)",
            "GET",
            "auth/me",
            200,
            headers=headers
        )

    def test_initialize_cfop_rules(self):
        """Test CFOP rules initialization"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Initialize CFOP Rules",
            "POST",
            "cfop/initialize",
            200,
            headers=headers
        )

    def test_list_cfop_rules(self):
        """Test listing CFOP rules"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "List CFOP Rules",
            "GET",
            "cfop/rules",
            200,
            headers=headers
        )

    def test_create_company(self):
        """Test company creation (admin only)"""
        if not self.admin_token:
            return False, {}
        
        company_data = {
            "cnpj": "12.345.678/0001-90",
            "razao_social": "Empresa Teste LTDA",
            "nome_fantasia": "Teste Corp",
            "inscricao_estadual": "123456789",
            "endereco": "Rua Teste, 123",
            "cidade": "São José dos Campos",
            "uf": "SP",
            "cep": "12345-678"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        if success and 'id' in response:
            self.company_id = response['id']
        return success, response

    def test_list_companies_admin(self):
        """Test listing companies as admin"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "List Companies (Admin)",
            "GET",
            "companies",
            200,
            headers=headers
        )

    def test_list_companies_client(self):
        """Test listing companies as client"""
        if not self.client_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.client_token}'}
        return self.run_test(
            "List Companies (Client)",
            "GET",
            "companies",
            200,
            headers=headers
        )

    def test_get_company(self):
        """Test getting specific company"""
        if not self.admin_token or not self.company_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Get Company",
            "GET",
            f"companies/{self.company_id}",
            200,
            headers=headers
        )

    def test_create_xml_sample(self):
        """Create a sample XML for testing"""
        xml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
    <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35240112345678000190550010000000011123456789">
            <ide>
                <cUF>35</cUF>
                <cNF>12345678</cNF>
                <natOp>Venda</natOp>
                <mod>55</mod>
                <serie>1</serie>
                <nNF>1</nNF>
                <dhEmi>2024-01-15T10:30:00-03:00</dhEmi>
                <tpNF>1</tpNF>
                <idDest>1</idDest>
                <cMunFG>3549904</cMunFG>
                <tpImp>1</tpImp>
                <tpEmis>1</tpEmis>
                <cDV>9</cDV>
                <tpAmb>2</tpAmb>
                <finNFe>1</finNFe>
                <indFinal>1</indFinal>
                <indPres>1</indPres>
            </ide>
            <emit>
                <CNPJ>12345678000190</CNPJ>
                <xNome>Empresa Emitente LTDA</xNome>
                <enderEmit>
                    <xLgr>Rua das Flores</xLgr>
                    <nro>100</nro>
                    <xBairro>Centro</xBairro>
                    <cMun>3549904</cMun>
                    <xMun>São José dos Campos</xMun>
                    <UF>SP</UF>
                    <CEP>12345678</CEP>
                </enderEmit>
                <IE>123456789</IE>
            </emit>
            <dest>
                <CNPJ>98765432000101</CNPJ>
                <xNome>Cliente Destinatario LTDA</xNome>
                <enderDest>
                    <xLgr>Av Principal</xLgr>
                    <nro>200</nro>
                    <xBairro>Jardim</xBairro>
                    <cMun>3549904</cMun>
                    <xMun>São José dos Campos</xMun>
                    <UF>SP</UF>
                    <CEP>12345000</CEP>
                </enderDest>
                <IE>987654321</IE>
            </dest>
            <det nItem="1">
                <prod>
                    <cProd>PROD001</cProd>
                    <cEAN></cEAN>
                    <xProd>Produto Teste</xProd>
                    <NCM>12345678</NCM>
                    <CFOP>5102</CFOP>
                    <uCom>UN</uCom>
                    <qCom>1.0000</qCom>
                    <vUnCom>100.0000</vUnCom>
                    <vProd>100.00</vProd>
                    <cEANTrib></cEANTrib>
                    <uTrib>UN</uTrib>
                    <qTrib>1.0000</qTrib>
                    <vUnTrib>100.0000</vUnTrib>
                </prod>
                <imposto>
                    <ICMS>
                        <ICMS00>
                            <orig>0</orig>
                            <CST>00</CST>
                            <modBC>0</modBC>
                            <vBC>100.00</vBC>
                            <pICMS>18.00</pICMS>
                            <vICMS>18.00</vICMS>
                            <CFOP>5102</CFOP>
                        </ICMS00>
                    </ICMS>
                </imposto>
            </det>
            <total>
                <ICMSTot>
                    <vBC>100.00</vBC>
                    <vICMS>18.00</vICMS>
                    <vICMSDeson>0.00</vICMSDeson>
                    <vFCP>0.00</vFCP>
                    <vBCST>0.00</vBCST>
                    <vST>0.00</vST>
                    <vFCPST>0.00</vFCPST>
                    <vFCPSTRet>0.00</vFCPSTRet>
                    <vProd>100.00</vProd>
                    <vFrete>0.00</vFrete>
                    <vSeg>0.00</vSeg>
                    <vDesc>0.00</vDesc>
                    <vII>0.00</vII>
                    <vIPI>0.00</vIPI>
                    <vIPIDevol>0.00</vIPIDevol>
                    <vPIS>0.00</vPIS>
                    <vCOFINS>0.00</vCOFINS>
                    <vOutro>0.00</vOutro>
                    <vNF>100.00</vNF>
                </ICMSTot>
            </total>
        </infNFe>
    </NFe>
</nfeProc>'''
        return xml_content

    def test_upload_xml(self):
        """Test XML upload"""
        if not self.admin_token or not self.company_id:
            return False, {}
        
        xml_content = self.test_create_xml_sample()
        
        # Create a temporary file-like object
        files = {
            'files': ('test_nfe.xml', xml_content, 'application/xml')
        }
        
        data = {
            'company_id': self.company_id,
            'tipo': 'saida'
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Upload XML",
            "POST",
            "xml/upload",
            200,
            data=data,
            headers=headers,
            files=files
        )
        return success, response

    def test_list_documents(self):
        """Test listing documents"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "List Documents",
            "GET",
            "xml/documents",
            200,
            headers=headers
        )
        
        if success and response and len(response) > 0:
            self.document_id = response[0]['id']
        
        return success, response

    def test_get_document(self):
        """Test getting specific document"""
        if not self.admin_token or not self.document_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Get Document",
            "GET",
            f"xml/documents/{self.document_id}",
            200,
            headers=headers
        )

    def test_create_exception(self):
        """Test creating validation exception"""
        if not self.admin_token or not self.document_id:
            return False, {}
        
        exception_data = {
            "xml_document_id": self.document_id,
            "product_code": "PROD001",
            "cfop_original": "5102",
            "cfop_corrigido": "5101",
            "motivo": "Correção de CFOP para produto industrializado",
            "aplicado_em_lote": False
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Create Exception",
            "POST",
            "exceptions",
            200,
            data=exception_data,
            headers=headers
        )

    def test_list_exceptions(self):
        """Test listing exceptions"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "List Exceptions",
            "GET",
            "exceptions",
            200,
            headers=headers
        )

    def test_export_sped(self):
        """Test SPED export"""
        if not self.admin_token or not self.company_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Export SPED",
            "GET",
            f"sped/export/{self.company_id}?periodo=012024",
            200,
            headers=headers
        )

    def test_client_access_restrictions(self):
        """Test that client users have proper access restrictions"""
        if not self.client_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.client_token}'}
        
        # Client should not be able to create companies
        company_data = {
            "cnpj": "98.765.432/0001-01",
            "razao_social": "Empresa Cliente LTDA"
        }
        
        success, response = self.run_test(
            "Client Create Company (Should Fail)",
            "POST",
            "companies",
            403,  # Expecting forbidden
            data=company_data,
            headers=headers
        )
        return success, response

def main():
    print("🚀 Starting Business Contabilidade Fiscal System API Tests")
    print("=" * 60)
    
    tester = FiscalSystemAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_admin_registration,
        tester.test_client_registration,
        tester.test_admin_login,
        tester.test_client_login,
        tester.test_get_me_admin,
        tester.test_initialize_cfop_rules,
        tester.test_list_cfop_rules,
        tester.test_create_company,
        tester.test_list_companies_admin,
        tester.test_list_companies_client,
        tester.test_get_company,
        tester.test_upload_xml,
        tester.test_list_documents,
        tester.test_get_document,
        tester.test_create_exception,
        tester.test_list_exceptions,
        tester.test_export_sped,
        tester.test_client_access_restrictions
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
            tester.errors.append(f"{test.__name__}: Exception - {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.errors:
        print(f"\n❌ Errors ({len(tester.errors)}):")
        for error in tester.errors:
            print(f"  - {error}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())