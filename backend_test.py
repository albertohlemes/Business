import requests
import sys
import json
from datetime import datetime
import os
import uuid
from pymongo import MongoClient

class FiscalSystemAPITester:
    def __init__(self, base_url="https://contaboost.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.client_token = None
        self.admin_user = None
        self.client_user = None
        self.company_id = None
        self.document_id = None
        self.cascade_test_company_id = None
        self.cascade_test_document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []
        # MongoDB connection for direct DB operations
        self.mongo_client = MongoClient("mongodb://localhost:27017")
        self.db = self.mongo_client["test_database"]

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
            'competencia': '01/2024',  # Add competencia for proper testing
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

    def test_relatorio_divergencias_saida(self):
        """Test Relatorio Divergencias Saida endpoint - should return ONLY items where tem_valor_imposto is true AND deveria_ser_aliq_zero is true"""
        if not self.admin_token or not self.company_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test with a competencia (month/year format)
        competencia = "01/2024"
        
        success, response = self.run_test(
            "Relatorio Divergencias Saida",
            "GET",
            f"relatorio-divergencias-saida/{self.company_id}?competencia={competencia}",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify the response structure
            expected_keys = ['empresa', 'competencia', 'total_documentos_saida', 'documentos_com_divergencia', 
                           'total_produtos_divergentes', 'valor_total_divergente', 'impacto_fiscal', 'divergencias']
            
            for key in expected_keys:
                if key not in response:
                    print(f"❌ Missing key in response: {key}")
                    self.errors.append(f"Relatorio Divergencias Saida: Missing key {key}")
                    return False, response
            
            # Verify that divergencias only contain items where tem_valor_imposto=true AND deveria_ser_aliq_zero=true
            divergencias = response.get('divergencias', [])
            for doc in divergencias:
                produtos = doc.get('produtos', [])
                for produto in produtos:
                    # Check if this product has imposto values > 0 (tem_valor_imposto = true)
                    v_pis = produto.get('v_pis_cobrado', 0)
                    v_cofins = produto.get('v_cofins_cobrado', 0)
                    tem_valor_imposto = v_pis > 0 or v_cofins > 0
                    
                    # Check if tipo_divergencia indicates it should be zero rate (deveria_ser_aliq_zero = true)
                    tipo_divergencia = produto.get('tipo_divergencia', '')
                    deveria_ser_aliq_zero = 'alíquota zero' in tipo_divergencia.lower()
                    
                    if not (tem_valor_imposto and deveria_ser_aliq_zero):
                        error_msg = f"Invalid divergencia found: tem_valor_imposto={tem_valor_imposto}, deveria_ser_aliq_zero={deveria_ser_aliq_zero}"
                        print(f"❌ {error_msg}")
                        self.errors.append(f"Relatorio Divergencias Saida: {error_msg}")
                        return False, response
            
            print(f"✅ Verified {len(divergencias)} documents with divergencias - all meet criteria")
        
        return success, response

    def test_delete_document_admin(self):
        """Test Delete Document endpoint for admin user"""
        if not self.admin_token or not self.document_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success, response = self.run_test(
            "Delete Document (Admin)",
            "DELETE",
            f"documents/{self.document_id}",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify response structure
            if 'message' not in response:
                print("❌ Missing 'message' in delete response")
                self.errors.append("Delete Document: Missing message in response")
                return False, response
            
            # Verify the document was actually deleted by trying to get it
            get_success, get_response = self.run_test(
                "Verify Document Deleted",
                "GET",
                f"xml/documents/{self.document_id}",
                404,  # Should return 404 since document is deleted
                headers=headers
            )
            
            if not get_success:
                print("❌ Document was not properly deleted")
                self.errors.append("Delete Document: Document still exists after deletion")
                return False, response
        
        return success, response

    def test_delete_batch_documents_admin(self):
        """Test Delete Batch Documents endpoint for admin user with encoded competencia"""
        if not self.admin_token or not self.company_id:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Use encoded competencia (URL encoded format)
        competencia_encoded = "01%2F2024"  # This is "01/2024" URL encoded
        
        success, response = self.run_test(
            "Delete Batch Documents (Admin)",
            "DELETE",
            f"documents/{self.company_id}/competencia/{competencia_encoded}",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify response structure
            expected_keys = ['message', 'deleted_count']
            for key in expected_keys:
                if key not in response:
                    print(f"❌ Missing key in batch delete response: {key}")
                    self.errors.append(f"Delete Batch Documents: Missing key {key}")
                    return False, response
            
            # Verify deleted_count is a number
            deleted_count = response.get('deleted_count')
            if not isinstance(deleted_count, int):
                print(f"❌ deleted_count should be integer, got {type(deleted_count)}")
                self.errors.append("Delete Batch Documents: deleted_count is not integer")
                return False, response
            
            print(f"✅ Batch delete successful - {deleted_count} documents deleted")
        
        return success, response

    def test_company_cascade_delete(self):
        """Test company deletion with cascade delete of associated XML documents"""
        if not self.admin_token:
            return False, {}
        
        print("\n🔍 Testing Company Cascade Delete...")
        
        # Step 1: Create a company for cascade delete testing
        company_data = {
            "cnpj": "11.222.333/0001-44",
            "razao_social": "Empresa Cascade Test LTDA",
            "nome_fantasia": "Cascade Test Corp",
            "inscricao_estadual": "987654321",
            "endereco": "Rua Cascade, 456",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01234-567"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company for Cascade Test",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create company for cascade test")
            return False, {}
        
        self.cascade_test_company_id = response['id']
        print(f"✅ Created company with ID: {self.cascade_test_company_id}")
        
        # Step 2: Insert a dummy XML document directly into the database
        document_id = str(uuid.uuid4())
        self.cascade_test_document_id = document_id
        
        dummy_document = {
            "id": document_id,
            "company_id": self.cascade_test_company_id,
            "competencia": "12/2024",
            "tipo": "entrada",
            "modelo": "nfe",
            "chave_nfe": "35202411222333000144550010000000011234567890",
            "numero_nfe": "123456",
            "data_emissao": "2024-12-15T10:30:00-03:00",
            "emitente_cnpj": "11.222.333/0001-44",
            "emitente_nome": "Fornecedor Teste LTDA",
            "destinatario_cnpj": "11.222.333/0001-44",
            "destinatario_nome": "Empresa Cascade Test LTDA",
            "valor_total": 1500.00,
            "valor_servicos": 0.0,
            "xml_content": "<?xml version='1.0'?><nfe>dummy content</nfe>",
            "produtos": [
                {
                    "codigo": "PROD123",
                    "descricao": "Produto Teste Cascade",
                    "ncm": "12345678",
                    "cfop": "1102",
                    "quantidade": 10.0,
                    "valor_unitario": 150.0,
                    "valor_total": 1500.0,
                    "unidade": "UN"
                }
            ],
            "servicos": [],
            "status_validacao": "pendente",
            "uploaded_at": datetime.now().isoformat(),
            "uploaded_by": "test_user"
        }
        
        try:
            # Insert document directly into MongoDB
            result = self.db.xml_documents.insert_one(dummy_document)
            print(f"✅ Inserted dummy document directly to DB: {document_id}")
        except Exception as e:
            print(f"❌ Failed to insert dummy document: {str(e)}")
            self.errors.append(f"Cascade Delete Test: Failed to insert dummy document - {str(e)}")
            return False, {}
        
        # Step 3: Verify both company and document exist before deletion
        # Check company exists
        company_check = self.db.companies.find_one({"id": self.cascade_test_company_id})
        if not company_check:
            print("❌ Company not found before deletion")
            self.errors.append("Cascade Delete Test: Company not found before deletion")
            return False, {}
        
        # Check document exists
        document_check = self.db.xml_documents.find_one({"id": document_id})
        if not document_check:
            print("❌ Document not found before deletion")
            self.errors.append("Cascade Delete Test: Document not found before deletion")
            return False, {}
        
        print("✅ Verified both company and document exist before deletion")
        
        # Step 4: Call DELETE /companies/{id}
        success, response = self.run_test(
            "Delete Company with Cascade",
            "DELETE",
            f"companies/{self.cascade_test_company_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Company deletion API call failed")
            return False, {}
        
        # Verify response message mentions document deletion
        if 'message' not in response:
            print("❌ Missing message in delete response")
            self.errors.append("Cascade Delete Test: Missing message in response")
            return False, response
        
        message = response['message']
        if 'documento(s) excluídos' not in message:
            print(f"❌ Response message doesn't mention document deletion: {message}")
            self.errors.append(f"Cascade Delete Test: Response doesn't mention document deletion - {message}")
            return False, response
        
        print(f"✅ Delete response: {message}")
        
        # Step 5: Verify both company and document are gone
        # Check company is deleted
        company_check_after = self.db.companies.find_one({"id": self.cascade_test_company_id})
        if company_check_after:
            print("❌ Company still exists after deletion")
            self.errors.append("Cascade Delete Test: Company still exists after deletion")
            return False, {}
        
        # Check document is deleted
        document_check_after = self.db.xml_documents.find_one({"id": document_id})
        if document_check_after:
            print("❌ Document still exists after deletion")
            self.errors.append("Cascade Delete Test: Document still exists after deletion")
            return False, {}
        
        print("✅ Verified both company and document are deleted (cascade delete working)")
        
        return True, response

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
        tester.test_client_access_restrictions,
        # Specific tests requested in review
        tester.test_relatorio_divergencias_saida,
        tester.test_delete_document_admin,
        tester.test_delete_batch_documents_admin,
        # Cascade delete test
        tester.test_company_cascade_delete
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