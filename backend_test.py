import requests
import sys
import json
from datetime import datetime

class PortalDPAPITester:
    def __init__(self, base_url="https://payroll-validator.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.cliente_id = None
        self.colaborador_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, data=data, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        success1, _ = self.run_test("API Root", "GET", "api/", 200)
        success2, _ = self.run_test("Health Check", "GET", "api/health", 200)
        
        return success1 and success2

    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "nome": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "senha": "TestPass123!"
        }

        # Test registration
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=test_user
        )
        
        if not success:
            return False

        if 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user', {}).get('id')
            print(f"   Token obtained: {self.token[:20]}...")

        # Test login with same credentials
        login_data = {"email": test_user["email"], "senha": test_user["senha"]}
        success2, response2 = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )

        # Test get current user
        success3, _ = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )

        return success and success2 and success3

    def test_cliente_crud(self):
        """Test cliente CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CLIENTE CRUD")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for cliente tests")
            return False

        # Generate unique CNPJ based on timestamp
        import time
        timestamp = str(int(time.time()))[-8:]  # Last 8 digits of timestamp
        unique_cnpj = f"12.345.{timestamp[:3]}/0001-90"

        # Test create cliente
        cliente_data = {
            "razao_social": "Empresa Teste LTDA",
            "cnpj": unique_cnpj,
            "nome_fantasia": "Teste Corp",
            "endereco": "Rua Teste, 123",
            "telefone": "(11) 99999-9999",
            "email": "contato@teste.com",
            "sindicato": "SINDTEST"
        }

        success1, response = self.run_test(
            "Create Cliente",
            "POST",
            "api/clientes",
            200,
            data=cliente_data
        )

        if success1 and 'id' in response:
            self.cliente_id = response['id']
            print(f"   Cliente ID: {self.cliente_id}")

        # Test list clientes
        success2, _ = self.run_test(
            "List Clientes",
            "GET",
            "api/clientes",
            200
        )

        # Test get specific cliente
        success3 = True
        if self.cliente_id:
            success3, _ = self.run_test(
                "Get Cliente",
                "GET",
                f"api/clientes/{self.cliente_id}",
                200
            )

        # Test update cliente
        success4 = True
        if self.cliente_id:
            update_data = {**cliente_data, "nome_fantasia": "Teste Corp Updated"}
            success4, _ = self.run_test(
                "Update Cliente",
                "PUT",
                f"api/clientes/{self.cliente_id}",
                200,
                data=update_data
            )

        return success1 and success2 and success3 and success4

    def test_colaborador_crud(self):
        """Test colaborador CRUD operations"""
        print("\n" + "="*50)
        print("TESTING COLABORADOR CRUD")
        print("="*50)
        
        if not self.token or not self.cliente_id:
            print("❌ No token or cliente_id available for colaborador tests")
            return False

        # Test create colaborador
        colaborador_data = {
            "cliente_id": self.cliente_id,
            "nome": "João Silva",
            "cpf": "123.456.789-00",
            "data_nascimento": "1990-01-01",
            "cargo": "Desenvolvedor",
            "salario_base": 5000.00,
            "data_admissao": "2024-01-01",
            "departamento": "TI",
            "pis": "12345678901",
            "ctps": "1234567",
            "rg": "12.345.678-9",
            "endereco": "Rua do Funcionário, 456",
            "telefone": "(11) 88888-8888",
            "email": "joao@teste.com",
            "banco": "Banco do Brasil",
            "agencia": "1234",
            "conta": "56789-0"
        }

        success1, response = self.run_test(
            "Create Colaborador",
            "POST",
            "api/colaboradores",
            200,
            data=colaborador_data
        )

        if success1 and 'id' in response:
            self.colaborador_id = response['id']
            print(f"   Colaborador ID: {self.colaborador_id}")

        # Test list colaboradores
        success2, _ = self.run_test(
            "List Colaboradores",
            "GET",
            "api/colaboradores",
            200
        )

        # Test list colaboradores by cliente
        success3, _ = self.run_test(
            "List Colaboradores by Cliente",
            "GET",
            f"api/colaboradores?cliente_id={self.cliente_id}",
            200
        )

        # Test get specific colaborador
        success4 = True
        if self.colaborador_id:
            success4, _ = self.run_test(
                "Get Colaborador",
                "GET",
                f"api/colaboradores/{self.colaborador_id}",
                200
            )

        return success1 and success2 and success3 and success4

    def test_colaborador_import(self):
        """Test colaborador import functionality"""
        print("\n" + "="*50)
        print("TESTING COLABORADOR IMPORT")
        print("="*50)
        
        if not self.token or not self.cliente_id:
            print("❌ No token or cliente_id available for import tests")
            return False

        import tempfile
        import os

        # Test 1: Import endpoint exists (should return 422 for missing file)
        success1, _ = self.run_test(
            "Import Endpoint Exists",
            "POST",
            "api/colaboradores/importar",
            422  # Expected because no file is provided
        )

        # Test 2: Import with mock PDF file
        mock_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Nome: Joao da Silva) Tj
0 -20 Td
(CPF: 123.456.789-00) Tj
0 -20 Td
(Cargo: Desenvolvedor) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF"""
        
        success2 = False
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(mock_pdf_content)
            tmp_file_path = tmp_file.name

        try:
            with open(tmp_file_path, 'rb') as f:
                files = {'file': ('test_ficha_registro.pdf', f, 'application/pdf')}
                data = {
                    'cliente_id': self.cliente_id,
                    'tipo_documento': 'ficha_registro'
                }
                
                success2, response = self.run_test(
                    "Import with Mock PDF",
                    "POST",
                    "api/colaboradores/importar",
                    200,
                    data=data,
                    files=files
                )
                
                if success2:
                    print(f"   Import response keys: {list(response.keys()) if isinstance(response, dict) else 'Not a dict'}")
                    if isinstance(response, dict):
                        print(f"   Success: {response.get('success', 'N/A')}")
                        print(f"   Document type: {response.get('tipo_documento', 'N/A')}")
                        print(f"   Confidence: {response.get('confianca', 'N/A')}")
                        print(f"   Message: {response.get('message', 'N/A')}")
        finally:
            os.unlink(tmp_file_path)

        # Test 3: Import with different document types
        success3 = True
        for doc_type in ['auto', 'holerite']:
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(mock_pdf_content)
                tmp_file_path = tmp_file.name

            try:
                with open(tmp_file_path, 'rb') as f:
                    files = {'file': (f'test_{doc_type}.pdf', f, 'application/pdf')}
                    data = {
                        'cliente_id': self.cliente_id,
                        'tipo_documento': doc_type
                    }
                    
                    success_temp, _ = self.run_test(
                        f"Import with {doc_type} type",
                        "POST",
                        "api/colaboradores/importar",
                        200,
                        data=data,
                        files=files
                    )
                    success3 = success3 and success_temp
            finally:
                os.unlink(tmp_file_path)

        return success1 and success2 and success3

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for dashboard test")
            return False

        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "api/dashboard",
            200
        )

        if success:
            print(f"   Dashboard data: {json.dumps(response, indent=2)}")

        return success

    def test_dissidio_endpoints(self):
        """Test dissídio endpoints"""
        print("\n" + "="*50)
        print("TESTING DISSÍDIO ENDPOINTS")
        print("="*50)
        
        if not self.token or not self.cliente_id:
            print("❌ No token or cliente_id available for dissídio tests")
            return False

        # Test create dissídio
        dissidio_data = {
            "cliente_id": self.cliente_id,
            "sindicato": "SINDTEST",
            "percentual_reajuste": 5.5,
            "data_base": "2024-05-01",
            "observacoes": "Reajuste anual conforme convenção coletiva"
        }

        success1, response = self.run_test(
            "Create Dissídio",
            "POST",
            "api/dissidios",
            200,
            data=dissidio_data
        )

        dissidio_id = None
        if success1 and 'id' in response:
            dissidio_id = response['id']
            print(f"   Dissídio ID: {dissidio_id}")

        # Test list dissídios
        success2, _ = self.run_test(
            "List Dissídios",
            "GET",
            "api/dissidios",
            200
        )

        return success1 and success2

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        if not self.token:
            return True

        success = True

        # Delete colaborador
        if self.colaborador_id:
            success1, _ = self.run_test(
                "Delete Colaborador",
                "DELETE",
                f"api/colaboradores/{self.colaborador_id}",
                200
            )
            success = success and success1

        # Delete cliente (this should also delete related colaboradores)
        if self.cliente_id:
            success2, _ = self.run_test(
                "Delete Cliente",
                "DELETE",
                f"api/clientes/{self.cliente_id}",
                200
            )
            success = success and success2

        return success

def main():
    print("🚀 Starting Portal DP API Tests")
    print("="*60)
    
    tester = PortalDPAPITester()
    
    # Run all tests
    tests = [
        ("Health Check", tester.test_health_check),
        ("Authentication", tester.test_auth_flow),
        ("Cliente CRUD", tester.test_cliente_crud),
        ("Colaborador CRUD", tester.test_colaborador_crud),
        ("Colaborador Import", tester.test_colaborador_import),
        ("Dashboard", tester.test_dashboard),
        ("Dissídio Endpoints", tester.test_dissidio_endpoints),
        ("Cleanup", tester.cleanup_test_data)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())