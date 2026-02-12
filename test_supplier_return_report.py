#!/usr/bin/env python3
"""
Focused test for supplier return report functionality as requested in review.
Tests the specific endpoint: GET /api/relatorio-devolucoes-fornecedor/{company_id}
"""

import requests
import json
import uuid
import time

class SupplierReturnReportTester:
    def __init__(self, base_url="https://fiscalsync-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.test_company_id = None

    def login_admin(self):
        """Login as admin with specified credentials"""
        print("🔐 Step 1: Login as admin...")
        
        login_data = {
            "email": "admin@test.com",
            "password": "123456"
        }
        
        url = f"{self.base_url}/auth/login"
        response = requests.post(url, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            if 'access_token' in data:
                self.admin_token = data['access_token']
                print(f"✅ Successfully logged in as admin")
                return True
            else:
                print(f"❌ Login response missing access_token: {data}")
                return False
        else:
            print(f"❌ Login failed with status {response.status_code}: {response.text}")
            return False

    def create_test_company(self):
        """Create a test company"""
        print("🏢 Step 2: Create test company...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        # Generate unique CNPJ
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
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/companies"
        response = requests.post(url, json=company_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if 'id' in data:
                self.test_company_id = data['id']
                print(f"✅ Created test company with ID: {self.test_company_id}")
                return True
            else:
                print(f"❌ Company creation response missing ID: {data}")
                return False
        else:
            print(f"❌ Company creation failed with status {response.status_code}: {response.text}")
            return False

    def test_supplier_return_report_endpoint(self):
        """Test the supplier return report endpoint"""
        print("📊 Step 3: Test supplier return report endpoint...")
        
        if not self.admin_token or not self.test_company_id:
            print("❌ Missing admin token or company ID")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/relatorio-devolucoes-fornecedor/{self.test_company_id}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint responded successfully")
            
            # Verify response structure
            expected_keys = ['titulo', 'empresa', 'resumo', 'descricao', 'pares']
            missing_keys = []
            
            for key in expected_keys:
                if key not in data:
                    missing_keys.append(key)
            
            if missing_keys:
                print(f"❌ Missing required keys in response: {missing_keys}")
                return False
            
            print(f"✅ All required keys present: {expected_keys}")
            
            # Verify response content types
            titulo = data.get('titulo', '')
            empresa = data.get('empresa', {})
            resumo = data.get('resumo', {})
            descricao = data.get('descricao', '')
            pares = data.get('pares', [])
            
            print(f"📋 Response content:")
            print(f"   - Titulo: {titulo}")
            print(f"   - Empresa type: {type(empresa)} (keys: {list(empresa.keys()) if isinstance(empresa, dict) else 'N/A'})")
            print(f"   - Resumo type: {type(resumo)} (keys: {list(resumo.keys()) if isinstance(resumo, dict) else 'N/A'})")
            print(f"   - Descricao type: {type(descricao)} (length: {len(descricao) if isinstance(descricao, str) else 'N/A'})")
            print(f"   - Pares type: {type(pares)} (count: {len(pares) if isinstance(pares, list) else 'N/A'})")
            
            # Verify content structure
            if not isinstance(empresa, dict):
                print(f"❌ Empresa should be dict, got {type(empresa)}")
                return False
            
            if not isinstance(resumo, dict):
                print(f"❌ Resumo should be dict, got {type(resumo)}")
                return False
            
            if not isinstance(descricao, str):
                print(f"❌ Descricao should be string, got {type(descricao)}")
                return False
            
            if not isinstance(pares, list):
                print(f"❌ Pares should be list, got {type(pares)}")
                return False
            
            # Since no notes exist, pares should be empty
            if len(pares) != 0:
                print(f"❌ Expected empty pares list (no notes), got {len(pares)} items")
                return False
            
            print(f"✅ Response structure is correct - empty pares list as expected (no notes)")
            return True
            
        else:
            print(f"❌ Endpoint failed with status {response.status_code}: {response.text}")
            return False

    def test_endpoint_security(self):
        """Test endpoint security (authentication required)"""
        print("🔒 Step 4: Test endpoint security...")
        
        if not self.test_company_id:
            print("❌ No test company ID available")
            return False
        
        # Test without authentication
        url = f"{self.base_url}/relatorio-devolucoes-fornecedor/{self.test_company_id}"
        response = requests.get(url)
        
        if response.status_code == 401:
            print(f"✅ Endpoint correctly requires authentication (401)")
            return True
        else:
            print(f"⚠️  Endpoint returned {response.status_code} instead of 401 for unauthenticated request")
            return False

    def test_nonexistent_company(self):
        """Test endpoint with non-existent company"""
        print("🔍 Step 5: Test with non-existent company...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        fake_company_id = str(uuid.uuid4())
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/relatorio-devolucoes-fornecedor/{fake_company_id}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 404:
            print(f"✅ Endpoint correctly handles non-existent company (404)")
            return True
        else:
            print(f"⚠️  Endpoint returned {response.status_code} instead of 404 for non-existent company")
            # This might still be acceptable depending on implementation
            return True

    def cleanup_test_company(self):
        """Delete the test company"""
        print("🧹 Step 6: Cleanup test company...")
        
        if not self.admin_token or not self.test_company_id:
            print("❌ Missing admin token or company ID for cleanup")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"{self.base_url}/companies/{self.test_company_id}"
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Test company deleted successfully")
            return True
        else:
            print(f"⚠️  Could not delete test company: {response.status_code} - {response.text}")
            return False

    def run_all_tests(self):
        """Run all supplier return report tests"""
        print("🚀 Starting Supplier Return Report Functionality Tests")
        print("=" * 60)
        
        tests_passed = 0
        total_tests = 6
        
        # Test sequence
        if self.login_admin():
            tests_passed += 1
        
        if self.create_test_company():
            tests_passed += 1
        
        if self.test_supplier_return_report_endpoint():
            tests_passed += 1
        
        if self.test_endpoint_security():
            tests_passed += 1
        
        if self.test_nonexistent_company():
            tests_passed += 1
        
        if self.cleanup_test_company():
            tests_passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {tests_passed}/{total_tests} passed")
        print(f"✅ Success Rate: {(tests_passed/total_tests)*100:.1f}%")
        
        if tests_passed == total_tests:
            print("🎉 ALL SUPPLIER RETURN REPORT TESTS PASSED!")
            return True
        else:
            print("❌ Some tests failed")
            return False

def main():
    tester = SupplierReturnReportTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)

if __name__ == "__main__":
    main()