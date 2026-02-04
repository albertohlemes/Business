#!/usr/bin/env python3
"""
Backend API Testing for Portal Societário Business Contabilidade
Tests all endpoints including auth, certificados, licenças, minutas, and dashboard
"""

import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class BusinessPortalTester:
    def __init__(self, base_url="https://contrato-ai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user = {
            "email": "teste@business.com",
            "password": "teste123",
            "name": "Usuário Teste"
        }
        
        # Test IDs for cleanup
        self.created_ids = {
            "certificados": [],
            "licencas": [],
            "minutas": []
        }

    def log_test(self, name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            return success, response.json() if success else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test health endpoint"""
        success, data, status = self.make_request('GET', 'health')
        self.log_test("Health Check", success, f"Status: {status}", "GET /api/health")
        return success

    def test_user_registration(self):
        """Test user registration"""
        success, data, status = self.make_request('POST', 'auth/register', self.test_user, expected_status=200)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['id']
            self.log_test("User Registration", True, "", "POST /api/auth/register")
            return True
        else:
            self.log_test("User Registration", False, f"Status: {status}, Data: {data}", "POST /api/auth/register")
            return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, data, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['id']
            self.log_test("User Login", True, "", "POST /api/auth/login")
            return True
        else:
            self.log_test("User Login", False, f"Status: {status}, Data: {data}", "POST /api/auth/login")
            return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, data, status = self.make_request('GET', 'auth/me')
        
        if success and 'email' in data:
            self.log_test("Get User Profile", True, "", "GET /api/auth/me")
            return True
        else:
            self.log_test("Get User Profile", False, f"Status: {status}", "GET /api/auth/me")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, data, status = self.make_request('GET', 'dashboard/stats')
        
        if success and 'certificados' in data and 'licencas' in data and 'minutas' in data:
            self.log_test("Dashboard Stats", True, "", "GET /api/dashboard/stats")
            return True
        else:
            self.log_test("Dashboard Stats", False, f"Status: {status}", "GET /api/dashboard/stats")
            return False

    def test_certificado_upload(self):
        """Test certificate upload"""
        # Create a dummy .pfx file for testing
        dummy_content = b"dummy certificate content"
        
        form_data = {
            'nome': 'Certificado Teste',
            'senha': 'senha123',
            'cnpjs': '12.345.678/0001-90'
        }
        
        files = {
            'file': ('test_cert.pfx', dummy_content, 'application/x-pkcs12')
        }
        
        success, data, status = self.make_request('POST', 'certificados/upload', form_data, files, expected_status=200)
        
        if success and 'id' in data:
            self.created_ids['certificados'].append(data['id'])
            self.log_test("Certificate Upload", True, "", "POST /api/certificados/upload")
            return True, data['id']
        else:
            self.log_test("Certificate Upload", False, f"Status: {status}, Data: {data}", "POST /api/certificados/upload")
            return False, None

    def test_list_certificados(self):
        """Test list certificates"""
        success, data, status = self.make_request('GET', 'certificados')
        
        if success and isinstance(data, list):
            self.log_test("List Certificates", True, f"Found {len(data)} certificates", "GET /api/certificados")
            return True
        else:
            self.log_test("List Certificates", False, f"Status: {status}", "GET /api/certificados")
            return False

    def test_add_cnpj_to_certificate(self, cert_id):
        """Test adding CNPJ to certificate"""
        cnpj_data = {
            "cnpj": "98.765.432/0001-10",
            "razao_social": "Empresa Teste LTDA",
            "certificado_id": cert_id
        }
        
        success, data, status = self.make_request('POST', f'certificados/{cert_id}/cnpjs', cnpj_data, expected_status=200)
        
        if success and 'id' in data:
            self.created_ids['licencas'].append(data['id'])
            self.log_test("Add CNPJ to Certificate", True, "", f"POST /api/certificados/{cert_id}/cnpjs")
            return True, data['id']
        else:
            self.log_test("Add CNPJ to Certificate", False, f"Status: {status}", f"POST /api/certificados/{cert_id}/cnpjs")
            return False, None

    def test_list_licencas(self):
        """Test list licenses"""
        success, data, status = self.make_request('GET', 'licencas')
        
        if success and isinstance(data, list):
            self.log_test("List Licenses", True, f"Found {len(data)} licenses", "GET /api/licencas")
            return True
        else:
            self.log_test("List Licenses", False, f"Status: {status}", "GET /api/licencas")
            return False

    def test_consultar_licenca(self, licenca_id):
        """Test license consultation (REDESIM simulation)"""
        success, data, status = self.make_request('POST', f'licencas/{licenca_id}/consultar', expected_status=200)
        
        if success and 'status' in data:
            self.log_test("Consult License (REDESIM)", True, f"Status: {data.get('status')}", f"POST /api/licencas/{licenca_id}/consultar")
            return True
        else:
            self.log_test("Consult License (REDESIM)", False, f"Status: {status}", f"POST /api/licencas/{licenca_id}/consultar")
            return False

    def test_renovar_licenca(self, licenca_id):
        """Test license renewal"""
        success, data, status = self.make_request('POST', f'licencas/{licenca_id}/renovar', expected_status=200)
        
        if success and 'status' in data:
            self.log_test("Renew License", True, f"Status: {data.get('status')}", f"POST /api/licencas/{licenca_id}/renovar")
            return True
        else:
            self.log_test("Renew License", False, f"Status: {status}", f"POST /api/licencas/{licenca_id}/renovar")
            return False

    def test_minuta_upload(self):
        """Test contract upload for minuta"""
        # Create a dummy PDF file for testing
        dummy_content = b"dummy contract content"
        
        form_data = {
            'tipo_alteracao': 'alteracao_socios',
            'descricao': 'Teste de alteração de sócios'
        }
        
        files = {
            'file': ('contrato_teste.pdf', dummy_content, 'application/pdf')
        }
        
        success, data, status = self.make_request('POST', 'minutas/upload', form_data, files, expected_status=200)
        
        if success and 'id' in data:
            self.created_ids['minutas'].append(data['id'])
            self.log_test("Contract Upload (Minuta)", True, "", "POST /api/minutas/upload")
            return True, data['id']
        else:
            self.log_test("Contract Upload (Minuta)", False, f"Status: {status}, Data: {data}", "POST /api/minutas/upload")
            return False, None

    def test_list_minutas(self):
        """Test list minutas"""
        success, data, status = self.make_request('GET', 'minutas')
        
        if success and isinstance(data, list):
            self.log_test("List Minutas", True, f"Found {len(data)} minutas", "GET /api/minutas")
            return True
        else:
            self.log_test("List Minutas", False, f"Status: {status}", "GET /api/minutas")
            return False

    def test_get_minuta(self, minuta_id):
        """Test get specific minuta"""
        success, data, status = self.make_request('GET', f'minutas/{minuta_id}')
        
        if success and 'id' in data:
            self.log_test("Get Minuta Details", True, "", f"GET /api/minutas/{minuta_id}")
            return True
        else:
            self.log_test("Get Minuta Details", False, f"Status: {status}", f"GET /api/minutas/{minuta_id}")
            return False

    def test_chat_minuta(self, minuta_id):
        """Test AI chat for minuta"""
        chat_data = {
            "message": "Preciso alterar o quadro societário da empresa, incluindo um novo sócio.",
            "minuta_id": minuta_id
        }
        
        success, data, status = self.make_request('POST', f'minutas/{minuta_id}/chat', chat_data, expected_status=200)
        
        if success and 'response' in data:
            self.log_test("AI Chat (Minuta)", True, "AI responded", f"POST /api/minutas/{minuta_id}/chat")
            return True
        else:
            self.log_test("AI Chat (Minuta)", False, f"Status: {status}, Data: {data}", f"POST /api/minutas/{minuta_id}/chat")
            return False

    def test_gerar_minuta(self, minuta_id):
        """Test minuta generation"""
        success, data, status = self.make_request('POST', f'minutas/{minuta_id}/gerar', expected_status=200)
        
        if success and 'conteudo' in data:
            self.log_test("Generate Final Minuta", True, "Minuta generated", f"POST /api/minutas/{minuta_id}/gerar")
            return True
        else:
            self.log_test("Generate Final Minuta", False, f"Status: {status}", f"POST /api/minutas/{minuta_id}/gerar")
            return False

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete minutas
        for minuta_id in self.created_ids['minutas']:
            success, _, _ = self.make_request('DELETE', f'minutas/{minuta_id}', expected_status=200)
            if success:
                print(f"  ✅ Deleted minuta {minuta_id}")
        
        # Delete licenças
        for licenca_id in self.created_ids['licencas']:
            success, _, _ = self.make_request('DELETE', f'licencas/{licenca_id}', expected_status=200)
            if success:
                print(f"  ✅ Deleted licença {licenca_id}")
        
        # Delete certificados
        for cert_id in self.created_ids['certificados']:
            success, _, _ = self.make_request('DELETE', f'certificados/{cert_id}', expected_status=200)
            if success:
                print(f"  ✅ Deleted certificado {cert_id}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Backend API Tests for Portal Societário Business Contabilidade")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Health check
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication tests
        print("\n🔐 Authentication Tests")
        if not self.test_user_registration():
            print("❌ Registration failed - trying login")
            if not self.test_user_login():
                print("❌ Login also failed - stopping tests")
                return False
        
        if not self.test_get_user_profile():
            print("❌ Profile fetch failed")
            return False
        
        # Dashboard tests
        print("\n📊 Dashboard Tests")
        self.test_dashboard_stats()
        
        # Certificate tests
        print("\n🛡️ Certificate Tests")
        self.test_list_certificados()
        cert_success, cert_id = self.test_certificado_upload()
        
        # License tests
        print("\n📋 License Tests")
        self.test_list_licencas()
        
        if cert_success and cert_id:
            cnpj_success, licenca_id = self.test_add_cnpj_to_certificate(cert_id)
            if cnpj_success and licenca_id:
                self.test_consultar_licenca(licenca_id)
                self.test_renovar_licenca(licenca_id)
        
        # Minuta tests
        print("\n📄 Minuta Tests")
        self.test_list_minutas()
        minuta_success, minuta_id = self.test_minuta_upload()
        
        if minuta_success and minuta_id:
            self.test_get_minuta(minuta_id)
            self.test_chat_minuta(minuta_id)
            self.test_gerar_minuta(minuta_id)
        
        # Cleanup
        self.cleanup_test_data()
        
        # Results
        print("\n" + "=" * 80)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test function"""
    tester = BusinessPortalTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    # Create test_reports directory if it doesn't exist
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())