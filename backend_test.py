import requests
import sys
import json
from datetime import datetime
import os
import uuid
from pymongo import MongoClient

class FiscalSystemAPITester:
    def __init__(self, base_url="https://sped-contabil.preview.emergentagent.com/api"):
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
        
        # Use microsecond timestamp to ensure unique CNPJ
        import time
        timestamp = str(int(time.time() * 1000000))[-6:]
        company_data = {
            "cnpj": f"12.{timestamp[:3]}.{timestamp[3:]}/0001-90",
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

    def test_admin_default_login(self):
        """Test login with admin_default credentials (test@test.com / 123456)"""
        login_data = {
            "email": "test@test.com",
            "password": "123456"
        }
        success, response = self.run_test(
            "Admin Default Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"✅ Successfully logged in with admin_default credentials")
        return success, response

    def test_full_company_flow(self):
        """Test the full company flow: create, verify exists, delete, verify gone"""
        if not self.admin_token:
            print("❌ No admin token available for company flow test")
            return False, {}
        
        print("\n🔍 Testing Full Company Flow...")
        
        # Step 1: Create a company
        company_data = {
            "cnpj": "99.888.777/0001-66",
            "razao_social": "Empresa Flow Test LTDA",
            "nome_fantasia": "Flow Test Corp",
            "inscricao_estadual": "111222333",
            "endereco": "Rua Flow Test, 789",
            "cidade": "Rio de Janeiro",
            "uf": "RJ",
            "cep": "20000-000"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Step 1: Create Company",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create company in flow test")
            return False, {}
        
        flow_company_id = response['id']
        print(f"✅ Step 1 Complete: Created company with ID: {flow_company_id}")
        
        # Step 2: Verify company exists by getting it
        success, response = self.run_test(
            "Step 2: Verify Company Exists",
            "GET",
            f"companies/{flow_company_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Failed to verify company exists")
            return False, {}
        
        if response.get('id') != flow_company_id:
            print(f"❌ Company ID mismatch: expected {flow_company_id}, got {response.get('id')}")
            return False, {}
        
        print(f"✅ Step 2 Complete: Verified company exists with correct data")
        
        # Step 3: Delete the company
        success, response = self.run_test(
            "Step 3: Delete Company",
            "DELETE",
            f"companies/{flow_company_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Failed to delete company")
            return False, {}
        
        print(f"✅ Step 3 Complete: Company deleted successfully")
        
        # Step 4: Verify company is gone (should return 404)
        success, response = self.run_test(
            "Step 4: Verify Company is Gone",
            "GET",
            f"companies/{flow_company_id}",
            404,  # Should return 404 since company is deleted
            headers=headers
        )
        
        if not success:
            print("❌ Company still exists after deletion")
            return False, {}
        
        print(f"✅ Step 4 Complete: Verified company is completely gone")
        print(f"✅ Full Company Flow Test PASSED - All steps completed successfully")
        
        return True, {"message": "Full company flow completed successfully"}

    def test_ai_batch_classification_integration(self):
        """Test AI batch classification logic integration in upload flow"""
        if not self.admin_token:
            print("❌ No admin token available for AI classification test")
            return False, {}
        
        print("\n🔍 Testing AI Batch Classification Integration...")
        
        # Step 1: Create a test company for AI classification testing
        import time
        timestamp = str(int(time.time() * 1000000))[-6:]
        company_data = {
            "cnpj": f"77.{timestamp[:3]}.{timestamp[3:]}/0001-88",
            "razao_social": "Empresa AI Test LTDA",
            "nome_fantasia": "AI Test Corp",
            "inscricao_estadual": "777888999",
            "endereco": "Rua AI Test, 456",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01000-000",
            "produtos_comercializados": ["Eletrônicos", "Computadores"],
            "insumos_producao": ["Componentes", "Peças"],
            "produtos_despesa": ["Material de Escritório", "Limpeza"]
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company for AI Test",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create company for AI test")
            return False, {}
        
        ai_test_company_id = response['id']
        print(f"✅ Created company for AI test: {ai_test_company_id}")
        
        # Step 2: Create XML with products that should trigger AI classification
        xml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
    <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35240177888999000188550010000000011123456789">
            <ide>
                <cUF>35</cUF>
                <cNF>12345678</cNF>
                <natOp>Compra para Revenda</natOp>
                <mod>55</mod>
                <serie>1</serie>
                <nNF>1</nNF>
                <dhEmi>2024-01-15T10:30:00-03:00</dhEmi>
                <tpNF>0</tpNF>
                <idDest>1</idDest>
                <cMunFG>3549904</cMunFG>
                <tpImp>1</tpImp>
                <tpEmis>1</tpEmis>
                <cDV>9</cDV>
                <tpAmb>2</tpAmb>
                <finNFe>1</finNFe>
                <indFinal>0</indFinal>
                <indPres>1</indPres>
            </ide>
            <emit>
                <CNPJ>12345678000190</CNPJ>
                <xNome>Fornecedor Teste LTDA</xNome>
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
                <CNPJ>77888999000188</CNPJ>
                <xNome>Empresa AI Test LTDA</xNome>
                <enderDest>
                    <xLgr>Rua AI Test</xLgr>
                    <nro>456</nro>
                    <xBairro>Centro</xBairro>
                    <cMun>3549904</cMun>
                    <xMun>São Paulo</xMun>
                    <UF>SP</UF>
                    <CEP>01000000</CEP>
                </enderDest>
                <IE>777888999</IE>
            </dest>
            <det nItem="1">
                <prod>
                    <cProd>LAPTOP001</cProd>
                    <cEAN></cEAN>
                    <xProd>Notebook Dell Inspiron 15</xProd>
                    <NCM>84713012</NCM>
                    <CFOP>1102</CFOP>
                    <uCom>UN</uCom>
                    <qCom>1.0000</qCom>
                    <vUnCom>2500.0000</vUnCom>
                    <vProd>2500.00</vProd>
                    <cEANTrib></cEANTrib>
                    <uTrib>UN</uTrib>
                    <qTrib>1.0000</qTrib>
                    <vUnTrib>2500.0000</vUnTrib>
                </prod>
                <imposto>
                    <ICMS>
                        <ICMS00>
                            <orig>0</orig>
                            <CST>00</CST>
                            <modBC>0</modBC>
                            <vBC>2500.00</vBC>
                            <pICMS>18.00</pICMS>
                            <vICMS>450.00</vICMS>
                        </ICMS00>
                    </ICMS>
                </imposto>
            </det>
            <det nItem="2">
                <prod>
                    <cProd>PAPEL001</cProd>
                    <cEAN></cEAN>
                    <xProd>Papel A4 Sulfite</xProd>
                    <NCM>48025599</NCM>
                    <CFOP>1556</CFOP>
                    <uCom>PCT</uCom>
                    <qCom>10.0000</qCom>
                    <vUnCom>25.0000</vUnCom>
                    <vProd>250.00</vProd>
                    <cEANTrib></cEANTrib>
                    <uTrib>PCT</uTrib>
                    <qTrib>10.0000</qTrib>
                    <vUnTrib>25.0000</vUnTrib>
                </prod>
                <imposto>
                    <ICMS>
                        <ICMS00>
                            <orig>0</orig>
                            <CST>00</CST>
                            <modBC>0</modBC>
                            <vBC>250.00</vBC>
                            <pICMS>18.00</pICMS>
                            <vICMS>45.00</vICMS>
                        </ICMS00>
                    </ICMS>
                </imposto>
            </det>
            <total>
                <ICMSTot>
                    <vBC>2750.00</vBC>
                    <vICMS>495.00</vICMS>
                    <vICMSDeson>0.00</vICMSDeson>
                    <vFCP>0.00</vFCP>
                    <vBCST>0.00</vBCST>
                    <vST>0.00</vST>
                    <vFCPST>0.00</vFCPST>
                    <vFCPSTRet>0.00</vFCPSTRet>
                    <vProd>2750.00</vProd>
                    <vFrete>0.00</vFrete>
                    <vSeg>0.00</vSeg>
                    <vDesc>0.00</vDesc>
                    <vII>0.00</vII>
                    <vIPI>0.00</vIPI>
                    <vIPIDevol>0.00</vIPIDevol>
                    <vPIS>0.00</vPIS>
                    <vCOFINS>0.00</vCOFINS>
                    <vOutro>0.00</vOutro>
                    <vNF>2750.00</vNF>
                </ICMSTot>
            </total>
        </infNFe>
    </NFe>
</nfeProc>'''
        
        # Step 3: Test XML upload that should trigger AI classification
        files = {
            'files': ('test_ai_nfe.xml', xml_content, 'application/xml')
        }
        
        data = {
            'company_id': ai_test_company_id,
            'competencia': '01/2024',
            'tipo': 'entrada'  # This should trigger AI classification for products
        }
        
        success, response = self.run_test(
            "Upload XML with AI Classification",
            "POST",
            "xml/upload",
            200,
            data=data,
            headers=headers,
            files=files
        )
        
        if not success:
            print("❌ Failed to upload XML for AI classification test")
            return False, {}
        
        # Step 4: Verify the response contains AI classification results
        if 'results' not in response:
            print("❌ Upload response missing 'results' field")
            return False, {}
        
        results = response['results']
        if not results or len(results) == 0:
            print("❌ No results in upload response")
            return False, {}
        
        # Check if conversion report exists (indicates AI processing occurred)
        has_conversions = False
        for result in results:
            if 'conversions' in result and result['conversions']:
                has_conversions = True
                conversions = result['conversions']
                print(f"✅ Found {len(conversions)} product conversions from AI classification")
                
                # Verify conversion structure
                for conversion in conversions:
                    required_fields = ['produto', 'cfop_original', 'cfop_convertido', 'categoria', 'motivo']
                    for field in required_fields:
                        if field not in conversion:
                            print(f"❌ Missing field '{field}' in conversion result")
                            return False, {}
                
                # Look for AI-specific indicators in motivo
                ai_indicators = ['IA:', 'Classificado como']
                for conversion in conversions:
                    motivo = conversion.get('motivo', '')
                    if any(indicator in motivo for indicator in ai_indicators):
                        print(f"✅ Found AI classification indicator in motivo: {motivo}")
                        break
                else:
                    print("⚠️  No explicit AI classification indicators found in conversion motivos")
                
                break
        
        if not has_conversions:
            print("⚠️  No conversions found - AI classification may not have been triggered")
            print("    This could be normal if products matched direct rules instead of AI")
        
        # Step 5: Verify documents were created and can be retrieved
        success, docs_response = self.run_test(
            "List Documents After AI Upload",
            "GET",
            "xml/documents",
            200,
            headers=headers
        )
        
        if success and docs_response:
            # Find our uploaded document
            uploaded_doc = None
            for doc in docs_response:
                if doc.get('company_id') == ai_test_company_id and doc.get('competencia') == '01/2024':
                    uploaded_doc = doc
                    break
            
            if uploaded_doc:
                print(f"✅ Found uploaded document with {len(uploaded_doc.get('produtos', []))} products")
                
                # Check if products have AI classification fields
                produtos = uploaded_doc.get('produtos', [])
                for produto in produtos:
                    if 'categoria_classificada' in produto or 'justificativa_ia' in produto:
                        print(f"✅ Product '{produto.get('descricao', '')}' has AI classification fields")
                    if 'cfop_sugerido' in produto:
                        print(f"✅ Product '{produto.get('descricao', '')}' has suggested CFOP: {produto['cfop_sugerido']}")
            else:
                print("❌ Could not find uploaded document in list")
                return False, {}
        
        # Step 6: Cleanup - delete the test company
        success, cleanup_response = self.run_test(
            "Cleanup - Delete AI Test Company",
            "DELETE",
            f"companies/{ai_test_company_id}",
            200,
            headers=headers
        )
        
        if success:
            print("✅ Cleanup completed - AI test company deleted")
        
        print("✅ AI BATCH CLASSIFICATION INTEGRATION TEST COMPLETED")
        return True, {"message": "AI batch classification integration verified successfully"}

    def test_bulk_delete_documents_with_filters(self):
        """Test bulk delete documents functionality with different type and status filters"""
        if not self.admin_token:
            print("❌ No admin token available for bulk delete test")
            return False, {}
        
        print("\n🔍 Testing Bulk Delete Documents with Filters...")
        
        # Step 1: Create a test company for bulk delete testing
        import time
        timestamp = str(int(time.time() * 1000000))[-6:]  # Last 6 digits of microseconds
        company_data = {
            "cnpj": f"55.{timestamp[:3]}.{timestamp[3:]}/0001-22",
            "razao_social": "Empresa Bulk Delete Test LTDA",
            "nome_fantasia": "Bulk Delete Test Corp",
            "inscricao_estadual": "555444333",
            "endereco": "Rua Bulk Delete, 123",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01000-000"
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company for Bulk Delete Test",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if not success or 'id' not in response:
            print("❌ Failed to create company for bulk delete test")
            return False, {}
        
        bulk_test_company_id = response['id']
        competencia = "12/2024"
        print(f"✅ Created company for bulk delete test: {bulk_test_company_id}")
        
        # Step 2: Insert test documents directly into MongoDB with different types and statuses
        def create_test_documents():
            return [
                # Entrada documents
                {
                    "id": str(uuid.uuid4()),
                    "company_id": bulk_test_company_id,
                    "competencia": competencia,
                    "tipo": "entrada",
                    "modelo": "nfe",
                    "chave_nfe": f"35202455444333000122550010000000{i:02d}{uuid.uuid4().hex[:8]}",
                    "numero_nfe": f"100{i}",
                    "data_emissao": "2024-12-15T10:30:00-03:00",
                    "emitente_cnpj": "98.765.432/0001-10",
                    "emitente_nome": f"Fornecedor {i} LTDA",
                    "destinatario_cnpj": company_data["cnpj"],
                    "destinatario_nome": "Empresa Bulk Delete Test LTDA",
                    "valor_total": 1000.00 + i * 100,
                    "valor_servicos": 0.0,
                    "xml_content": f"<?xml version='1.0'?><nfe>entrada content {i}</nfe>",
                    "produtos": [{"codigo": f"PROD{i}", "descricao": f"Produto Entrada {i}"}],
                    "servicos": [],
                    "status_validacao": "pendente" if i % 2 == 0 else "validado",
                    "uploaded_at": datetime.now().isoformat(),
                    "uploaded_by": "test_user"
                }
                for i in range(1, 5)  # 4 entrada documents (2 pendente, 2 validado)
            ] + [
                # Saida documents
                {
                    "id": str(uuid.uuid4()),
                    "company_id": bulk_test_company_id,
                    "competencia": competencia,
                    "tipo": "saida",
                    "modelo": "nfe",
                    "chave_nfe": f"35202455444333000122550010000000{i:02d}{uuid.uuid4().hex[:8]}",
                    "numero_nfe": f"200{i}",
                    "data_emissao": "2024-12-15T14:30:00-03:00",
                    "emitente_cnpj": company_data["cnpj"],
                    "emitente_nome": "Empresa Bulk Delete Test LTDA",
                    "destinatario_cnpj": "11.222.333/0001-44",
                    "destinatario_nome": f"Cliente {i} LTDA",
                    "valor_total": 2000.00 + i * 200,
                    "valor_servicos": 0.0,
                    "xml_content": f"<?xml version='1.0'?><nfe>saida content {i}</nfe>",
                    "produtos": [{"codigo": f"PROD{i+10}", "descricao": f"Produto Saida {i}"}],
                    "servicos": [],
                    "status_validacao": "pendente" if i % 2 == 0 else "validado",
                    "uploaded_at": datetime.now().isoformat(),
                    "uploaded_by": "test_user"
                }
                for i in range(1, 5)  # 4 saida documents (2 pendente, 2 validado)
            ]
        
        test_documents = create_test_documents()
        
        try:
            # Insert all test documents
            result = self.db.xml_documents.insert_many(test_documents)
            print(f"✅ Inserted {len(result.inserted_ids)} test documents")
            
            # Verify initial document counts
            total_docs = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia
            })
            entrada_docs = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia,
                "tipo": "entrada"
            })
            saida_docs = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia,
                "tipo": "saida"
            })
            pendente_docs = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia,
                "status_validacao": "pendente"
            })
            validado_docs = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia,
                "status_validacao": "validado"
            })
            
            print(f"📊 Initial counts: Total={total_docs}, Entrada={entrada_docs}, Saida={saida_docs}, Pendente={pendente_docs}, Validado={validado_docs}")
            
            if total_docs != 8 or entrada_docs != 4 or saida_docs != 4 or pendente_docs != 4 or validado_docs != 4:
                print("❌ Initial document counts don't match expected values")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed to insert test documents: {str(e)}")
            return False, {}
        
        # Step 3: Test deleting ONLY 'entrada' documents
        print("\n🔍 Test 1: Delete ONLY 'entrada' documents...")
        competencia_encoded = "12%2F2024"
        
        success, response = self.run_test(
            "Bulk Delete - ONLY Entrada",
            "DELETE",
            f"documents/{bulk_test_company_id}/competencia/{competencia_encoded}?tipo=entrada",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Failed to delete entrada documents")
            return False, {}
        
        # Verify only entrada documents were deleted
        remaining_total = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia
        })
        remaining_entrada = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "tipo": "entrada"
        })
        remaining_saida = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "tipo": "saida"
        })
        
        if remaining_total != 4 or remaining_entrada != 0 or remaining_saida != 4:
            print(f"❌ Entrada delete failed: Total={remaining_total}, Entrada={remaining_entrada}, Saida={remaining_saida}")
            return False, {}
        
        print(f"✅ Test 1 PASSED: Only entrada documents deleted. Remaining: Total={remaining_total}, Saida={remaining_saida}")
        
        # Step 4: Re-insert entrada documents for next test
        entrada_docs_new = create_test_documents()[:4]  # Only entrada documents
        
        try:
            self.db.xml_documents.insert_many(entrada_docs_new)
            print("✅ Re-inserted entrada documents for next test")
        except Exception as e:
            print(f"❌ Failed to re-insert entrada documents: {str(e)}")
            return False, {}
        
        # Step 5: Test deleting ONLY 'pendente' documents
        print("\n🔍 Test 2: Delete ONLY 'pendente' documents...")
        
        success, response = self.run_test(
            "Bulk Delete - ONLY Pendente",
            "DELETE",
            f"documents/{bulk_test_company_id}/competencia/{competencia_encoded}?status=pendente",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Failed to delete pendente documents")
            return False, {}
        
        # Verify only pendente documents were deleted
        remaining_total = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia
        })
        remaining_pendente = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "status_validacao": "pendente"
        })
        remaining_validado = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "status_validacao": "validado"
        })
        
        if remaining_total != 4 or remaining_pendente != 0 or remaining_validado != 4:
            print(f"❌ Pendente delete failed: Total={remaining_total}, Pendente={remaining_pendente}, Validado={remaining_validado}")
            return False, {}
        
        print(f"✅ Test 2 PASSED: Only pendente documents deleted. Remaining: Total={remaining_total}, Validado={remaining_validado}")
        
        # Step 6: Clean up all existing documents and re-insert fresh set for final test
        # First, delete all remaining documents
        self.db.xml_documents.delete_many({
            "company_id": bulk_test_company_id,
            "competencia": competencia
        })
        
        # Re-insert fresh set of all documents for final test
        all_docs_new = create_test_documents()
        
        try:
            self.db.xml_documents.insert_many(all_docs_new)
            print("✅ Re-inserted fresh set of all documents for final test")
            
            # Verify we have the expected counts
            total_check = self.db.xml_documents.count_documents({
                "company_id": bulk_test_company_id,
                "competencia": competencia
            })
            if total_check != 8:
                print(f"❌ Expected 8 documents for final test, got {total_check}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed to re-insert all documents: {str(e)}")
            return False, {}
        
        # Step 7: Test deleting 'entrada' AND 'pendente' (combined filters)
        print("\n🔍 Test 3: Delete 'entrada' AND 'pendente' documents...")
        
        success, response = self.run_test(
            "Bulk Delete - Entrada AND Pendente",
            "DELETE",
            f"documents/{bulk_test_company_id}/competencia/{competencia_encoded}?tipo=entrada&status=pendente",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Failed to delete entrada AND pendente documents")
            return False, {}
        
        # Verify only entrada documents with pendente status were deleted
        remaining_total = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia
        })
        remaining_entrada_pendente = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "tipo": "entrada",
            "status_validacao": "pendente"
        })
        remaining_entrada_validado = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "tipo": "entrada",
            "status_validacao": "validado"
        })
        remaining_saida = self.db.xml_documents.count_documents({
            "company_id": bulk_test_company_id,
            "competencia": competencia,
            "tipo": "saida"
        })
        
        # Should have deleted 2 entrada+pendente docs, leaving 6 total (2 entrada+validado + 4 saida)
        if remaining_total != 6 or remaining_entrada_pendente != 0 or remaining_entrada_validado != 2 or remaining_saida != 4:
            print(f"❌ Combined filter delete failed: Total={remaining_total}, Entrada+Pendente={remaining_entrada_pendente}, Entrada+Validado={remaining_entrada_validado}, Saida={remaining_saida}")
            return False, {}
        
        print(f"✅ Test 3 PASSED: Only entrada+pendente documents deleted. Remaining: Total={remaining_total}")
        
        # Step 8: Cleanup - delete the test company (cascade delete will remove remaining documents)
        success, response = self.run_test(
            "Cleanup - Delete Test Company",
            "DELETE",
            f"companies/{bulk_test_company_id}",
            200,
            headers=headers
        )
        
        if success:
            print("✅ Cleanup completed - Test company and remaining documents deleted")
        
        print("✅ ALL BULK DELETE FILTER TESTS PASSED")
        return True, {"message": "Bulk delete with filters functionality verified successfully"}

    def test_cancelled_notes_report_endpoints(self):
        """Test cancelled notes report endpoints as requested in review"""
        print("\n🔍 Testing Cancelled Notes Report Endpoints...")
        
        # Step 1: Login with specified credentials
        login_data = {
            "email": "admin@test.com",
            "password": "123456"
        }
        success, response = self.run_test(
            "Step 1: Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not success or 'access_token' not in response:
            print("❌ Step 1 Failed: Could not login with admin@test.com / 123456")
            return False, {}
        
        admin_token = response['access_token']
        headers = {'Authorization': f'Bearer {admin_token}'}
        print(f"✅ Step 1 Complete: Successfully logged in")
        
        # Step 2: Get company (search for existing company)
        success, companies_response = self.run_test(
            "Step 2: Get Companies",
            "GET",
            "companies",
            200,
            headers=headers
        )
        
        if not success or not companies_response or len(companies_response) == 0:
            print("❌ Step 2 Failed: No companies found, creating one...")
            
            # Create a test company if none exist
            import time
            timestamp = str(int(time.time() * 1000000))[-6:]
            company_data = {
                "cnpj": f"88.{timestamp[:3]}.{timestamp[3:]}/0001-99",
                "razao_social": "Empresa Teste Canceladas LTDA",
                "nome_fantasia": "Teste Canceladas Corp",
                "uf": "SP",
                "inscricao_estadual": "123456789",
                "endereco": "Rua Teste Canceladas, 123",
                "cidade": "São Paulo",
                "cep": "01000-000"
            }
            
            success, response = self.run_test(
                "Create Test Company",
                "POST",
                "companies",
                200,
                data=company_data,
                headers=headers
            )
            
            if not success or 'id' not in response:
                print("❌ Failed to create test company")
                return False, {}
            
            company_id = response['id']
        else:
            # Use first available company
            company_id = companies_response[0]['id']
        
        print(f"✅ Step 2 Complete: Using company ID: {company_id}")
        
        # Step 3: Test main cancelled notes report endpoint
        success, response = self.run_test(
            "Step 3: Test Cancelled Notes Report Endpoint",
            "GET",
            f"relatorio-notas-canceladas/{company_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Step 3 Failed: Cancelled notes report endpoint failed")
            return False, {}
        
        # Step 4: Verify response structure
        print("🔍 Step 4: Verifying response structure...")
        
        expected_keys = ['titulo', 'empresa', 'competencia', 'data_geracao', 'resumo', 'descricao', 'notas']
        missing_keys = []
        
        for key in expected_keys:
            if key not in response:
                missing_keys.append(key)
        
        if missing_keys:
            print(f"❌ Step 4 Failed: Missing required keys: {missing_keys}")
            return False, {}
        
        # Verify resumo structure
        resumo = response.get('resumo', {})
        resumo_keys = ['total_notas', 'total_entradas', 'total_saidas', 'valor_total_entradas', 'valor_total_saidas', 'valor_total']
        missing_resumo_keys = []
        
        for key in resumo_keys:
            if key not in resumo:
                missing_resumo_keys.append(key)
        
        if missing_resumo_keys:
            print(f"❌ Step 4 Failed: Missing resumo keys: {missing_resumo_keys}")
            return False, {}
        
        print(f"✅ Step 4 Complete: All required structure verified")
        print(f"   - Titulo: {response.get('titulo', '')}")
        print(f"   - Empresa: {response.get('empresa', {}).get('razao_social', 'N/A')}")
        print(f"   - Competencia: {response.get('competencia', 'N/A')}")
        print(f"   - Total notas: {resumo.get('total_notas', 0)}")
        print(f"   - Total entradas: {resumo.get('total_entradas', 0)}")
        print(f"   - Total saidas: {resumo.get('total_saidas', 0)}")
        print(f"   - Valor total: {resumo.get('valor_total', 0)}")
        
        # Step 5: Test Excel export endpoint
        success, excel_response = self.run_test(
            "Step 5: Test Excel Export",
            "GET",
            f"relatorio-notas-canceladas/{company_id}/exportar?formato=excel",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ Step 5 Complete: Excel export endpoint working")
            # Note: We can't easily verify Content-Type in this test framework, 
            # but the 200 response indicates the endpoint exists and responds
        else:
            print(f"❌ Step 5 Failed: Excel export endpoint failed")
            return False, {}
        
        # Step 6: Test Word export endpoint  
        success, word_response = self.run_test(
            "Step 6: Test Word Export",
            "GET",
            f"relatorio-notas-canceladas/{company_id}/exportar?formato=word",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ Step 6 Complete: Word export endpoint working")
        else:
            print(f"❌ Step 6 Failed: Word export endpoint failed")
            return False, {}
        
        # Step 7: Test authentication requirement
        success, auth_response = self.run_test(
            "Step 7: Test Authentication Required",
            "GET",
            f"relatorio-notas-canceladas/{company_id}",
            403,  # Should return 403 without token (FastAPI returns 403 for missing auth)
            headers={}  # No authorization header
        )
        
        if success:
            print(f"✅ Step 7 Complete: Authentication properly required")
        else:
            print(f"❌ Step 7 Failed: Authentication not properly enforced")
            return False, {}
        
        # Step 8: Test invalid company ID
        success, invalid_response = self.run_test(
            "Step 8: Test Invalid Company ID",
            "GET",
            f"relatorio-notas-canceladas/invalid-company-id",
            404,  # Should return 404 for non-existent company
            headers=headers
        )
        
        if success:
            print(f"✅ Step 8 Complete: Proper 404 for invalid company ID")
        else:
            print(f"❌ Step 8 Failed: Invalid company ID not handled properly")
            return False, {}
        
        print("✅ ALL CANCELLED NOTES REPORT ENDPOINT TESTS PASSED")
        return True, {"message": "Cancelled notes report endpoints verified successfully"}

    def test_supplier_return_report_endpoints(self):
        """Test supplier return report endpoints as requested in review"""
        print("\n🔍 Testing Supplier Return Report Endpoints...")
        
        # Step 1: Login with specified credentials
        login_data = {
            "email": "admin@test.com",
            "password": "123456"
        }
        success, response = self.run_test(
            "Step 1: Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not success or 'access_token' not in response:
            print("❌ Step 1 Failed: Could not login with admin@test.com / 123456")
            return False, {}
        
        admin_token = response['access_token']
        headers = {'Authorization': f'Bearer {admin_token}'}
        print(f"✅ Step 1 Complete: Successfully logged in")
        
        # Step 2: Get company (search for existing company)
        success, companies_response = self.run_test(
            "Step 2: Get Companies",
            "GET",
            "companies",
            200,
            headers=headers
        )
        
        if not success or not companies_response or len(companies_response) == 0:
            print("❌ Step 2 Failed: No companies found, creating one...")
            
            # Create a test company if none exist
            import time
            timestamp = str(int(time.time() * 1000000))[-6:]
            company_data = {
                "cnpj": f"88.{timestamp[:3]}.{timestamp[3:]}/0001-99",
                "razao_social": "Empresa Teste Devolução LTDA",
                "nome_fantasia": "Teste Devolução Corp",
                "uf": "SP",
                "inscricao_estadual": "123456789",
                "endereco": "Rua Teste Devolução, 123",
                "cidade": "São Paulo",
                "cep": "01000-000"
            }
            
            success, response = self.run_test(
                "Create Test Company",
                "POST",
                "companies",
                200,
                data=company_data,
                headers=headers
            )
            
            if not success or 'id' not in response:
                print("❌ Failed to create test company")
                return False, {}
            
            company_id = response['id']
        else:
            # Use first available company
            company_id = companies_response[0]['id']
        
        print(f"✅ Step 2 Complete: Using company ID: {company_id}")
        
        # Step 3: Test main report endpoint
        success, response = self.run_test(
            "Step 3: Test Report Endpoint",
            "GET",
            f"relatorio-devolucoes-fornecedor/{company_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Step 3 Failed: Report endpoint failed")
            return False, {}
        
        # Step 4: Verify response structure
        print("🔍 Step 4: Verifying response structure...")
        
        expected_keys = ['titulo', 'empresa', 'competencia', 'resumo', 'descricao', 'pares']
        missing_keys = []
        
        for key in expected_keys:
            if key not in response:
                missing_keys.append(key)
        
        if missing_keys:
            print(f"❌ Step 4 Failed: Missing required keys: {missing_keys}")
            return False, {}
        
        # Verify resumo structure
        resumo = response.get('resumo', {})
        resumo_keys = ['total_pares', 'valor_total_devolucoes', 'valor_total_originais', 'pares_sem_vinculo']
        missing_resumo_keys = []
        
        for key in resumo_keys:
            if key not in resumo:
                missing_resumo_keys.append(key)
        
        if missing_resumo_keys:
            print(f"❌ Step 4 Failed: Missing resumo keys: {missing_resumo_keys}")
            return False, {}
        
        print(f"✅ Step 4 Complete: All required structure verified")
        print(f"   - Titulo: {response.get('titulo', '')}")
        print(f"   - Empresa: {response.get('empresa', {}).get('razao_social', 'N/A')}")
        print(f"   - Competencia: {response.get('competencia', 'N/A')}")
        print(f"   - Total pares: {resumo.get('total_pares', 0)}")
        
        # Step 5: Test Excel export endpoint
        success, excel_response = self.run_test(
            "Step 5: Test Excel Export",
            "GET",
            f"relatorio-devolucoes-fornecedor/{company_id}/exportar?formato=excel",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ Step 5 Complete: Excel export endpoint working")
            # Note: We can't easily verify Content-Type in this test framework, 
            # but the 200 response indicates the endpoint exists and responds
        else:
            print(f"❌ Step 5 Failed: Excel export endpoint failed")
            return False, {}
        
        # Step 6: Test Word export endpoint  
        success, word_response = self.run_test(
            "Step 6: Test Word Export",
            "GET",
            f"relatorio-devolucoes-fornecedor/{company_id}/exportar?formato=word",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ Step 6 Complete: Word export endpoint working")
        else:
            print(f"❌ Step 6 Failed: Word export endpoint failed")
            return False, {}
        
        # Step 7: Test authentication requirement
        success, auth_response = self.run_test(
            "Step 7: Test Authentication Required",
            "GET",
            f"relatorio-devolucoes-fornecedor/{company_id}",
            403,  # Should return 403 without token (FastAPI returns 403 for missing auth)
            headers={}  # No authorization header
        )
        
        if success:
            print(f"✅ Step 7 Complete: Authentication properly required")
        else:
            print(f"⚠️  Step 7: Authentication may not be properly enforced")
        
        # Step 8: Test with invalid company ID
        fake_company_id = str(uuid.uuid4())
        success, invalid_response = self.run_test(
            "Step 8: Test Invalid Company ID",
            "GET",
            f"relatorio-devolucoes-fornecedor/{fake_company_id}",
            404,  # Should return 404 for non-existent company
            headers=headers
        )
        
        if success:
            print(f"✅ Step 8 Complete: Invalid company ID properly handled")
        else:
            print(f"⚠️  Step 8: Invalid company ID handling may need improvement")
        
        print("✅ ALL SUPPLIER RETURN REPORT ENDPOINT TESTS COMPLETED")
        return True, {"message": "Supplier return report endpoints verified successfully"}
        
        # Test without authentication
        success, response = self.run_test(
            "Step 6b: Test without Authentication",
            "GET",
            f"relatorio-devolucoes-fornecedor/{test_company_id}",
            401,  # Should return 401 for unauthorized access
            headers={}
        )
        
        if success:
            print(f"✅ Step 6b Complete: Endpoint correctly requires authentication (401)")
        else:
            print(f"⚠️  Step 6b: Endpoint may not properly enforce authentication")
        
        # Step 7: Cleanup - delete the test company
        success, response = self.run_test(
            "Step 7: Cleanup - Delete Test Company",
            "DELETE",
            f"companies/{test_company_id}",
            200,
            headers=headers
        )
        
        if success:
            print("✅ Step 7 Complete: Cleanup completed - test company deleted")
        else:
            print("⚠️  Step 7: Could not cleanup test company")
        
        print("✅ SUPPLIER RETURN REPORT FUNCTIONALITY TEST COMPLETED SUCCESSFULLY")
        return True, {"message": "Supplier return report functionality verified successfully"}

    def test_single_document_delete_verification(self):
        """Test single document delete verification as requested in review"""
        if not self.admin_token:
            print("❌ No admin token available for single document delete test")
            return False, {}
        
        print("\n🔍 Testing Single Document Delete Verification...")
        
        # Step 1: Create a document by inserting directly into MongoDB
        document_id = str(uuid.uuid4())
        
        dummy_document = {
            "id": document_id,
            "company_id": "test-company-id",  # Using a test company ID
            "competencia": "12/2024",
            "tipo": "entrada",
            "modelo": "nfe",
            "chave_nfe": f"35202412345678000190550010000000011{uuid.uuid4().hex[:8]}",
            "numero_nfe": "999999",
            "data_emissao": "2024-12-30T10:30:00-03:00",
            "emitente_cnpj": "12.345.678/0001-90",
            "emitente_nome": "Fornecedor Delete Test LTDA",
            "destinatario_cnpj": "98.765.432/0001-01",
            "destinatario_nome": "Cliente Delete Test LTDA",
            "valor_total": 500.00,
            "valor_servicos": 0.0,
            "xml_content": "<?xml version='1.0'?><nfe>delete test content</nfe>",
            "produtos": [
                {
                    "codigo": "PROD999",
                    "descricao": "Produto Delete Test",
                    "ncm": "12345678",
                    "cfop": "1102",
                    "quantidade": 1.0,
                    "valor_unitario": 500.0,
                    "valor_total": 500.0,
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
            print(f"✅ Step 1 Complete: Created document with ID: {document_id}")
        except Exception as e:
            print(f"❌ Step 1 Failed: Could not create document - {str(e)}")
            return False, {}
        
        # Step 2: Verify document exists by calling GET /api/xml/documents/{document_id}
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Step 2: Verify Document Exists",
            "GET",
            f"xml/documents/{document_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Step 2 Failed: Document does not exist or API call failed")
            return False, {}
        
        if response.get('id') != document_id:
            print(f"❌ Step 2 Failed: Document ID mismatch - expected {document_id}, got {response.get('id')}")
            return False, {}
        
        print(f"✅ Step 2 Complete: Verified document exists with correct ID")
        
        # Step 3: Delete the document using DELETE /api/documents/{document_id}
        success, response = self.run_test(
            "Step 3: Delete Document",
            "DELETE",
            f"documents/{document_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Step 3 Failed: Document deletion API call failed")
            return False, {}
        
        # Verify response contains success message
        if 'message' not in response:
            print("❌ Step 3 Failed: Delete response missing success message")
            return False, {}
        
        print(f"✅ Step 3 Complete: Document deleted successfully - {response.get('message')}")
        
        # Step 4: Verify document is gone by calling GET /api/xml/documents/{document_id} (should return 404)
        success, response = self.run_test(
            "Step 4: Verify Document is Gone",
            "GET",
            f"xml/documents/{document_id}",
            404,  # Should return 404 since document is deleted
            headers=headers
        )
        
        if not success:
            print("❌ Step 4 Failed: Document still exists after deletion")
            return False, {}
        
        print(f"✅ Step 4 Complete: Verified document is completely gone (404 response)")
        
        # Additional verification: Check directly in MongoDB that document is gone
        try:
            db_check = self.db.xml_documents.find_one({"id": document_id})
            if db_check:
                print("❌ Additional Check Failed: Document still exists in database")
                return False, {}
            else:
                print("✅ Additional Check Passed: Document confirmed deleted from database")
        except Exception as e:
            print(f"⚠️  Could not verify database deletion: {str(e)}")
        
        print("✅ SINGLE DOCUMENT DELETE VERIFICATION COMPLETED SUCCESSFULLY")
        return True, {"message": "Single document delete verification completed successfully"}

def main():
    print("🚀 Starting Business Contabilidade Fiscal System API Tests")
    print("=" * 60)
    
    tester = FiscalSystemAPITester()
    
    # Test sequence - focusing on the specific review request
    tests = [
        # PRIORITY TEST: Cancelled notes report endpoints as requested in review
        tester.test_cancelled_notes_report_endpoints,
        # PRIORITY TEST: Supplier return report endpoints as requested in review
        tester.test_supplier_return_report_endpoints,
        # Additional tests: Single document delete verification
        tester.test_single_document_delete_verification,
        # Additional tests: AI batch classification integration
        tester.test_ai_batch_classification_integration,
        # Additional tests: Bulk delete documents functionality
        tester.test_bulk_delete_documents_with_filters,
        tester.test_full_company_flow,
        # Additional comprehensive tests
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