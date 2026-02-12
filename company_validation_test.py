#!/usr/bin/env python3
"""
Specific test for company creation with empty strings and 0 values,
and verifying list companies doesn't return 500 errors.
"""

import requests
import json
from datetime import datetime
import sys

class CompanyValidationTester:
    def __init__(self, base_url="https://taxwiz-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.admin_user = None
        self.company_ids = []
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
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

    def setup_admin_user(self):
        """Setup admin user for testing"""
        # Register admin user
        admin_data = {
            "email": f"admin_validation_{datetime.now().strftime('%H%M%S')}@business.com",
            "password": "AdminPass123!",
            "name": "Admin Validation User",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if not success:
            return False
            
        self.admin_user = admin_data
        
        # Login admin user
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
            return True
        return False

    def test_company_creation_with_empty_strings(self):
        """Test company creation with empty strings for optional fields"""
        if not self.admin_token:
            return False, {}
        
        # Test with empty strings for all optional string fields
        company_data = {
            "cnpj": "11.222.333/0001-44",  # Required field
            "razao_social": "Empresa Teste Empty Strings LTDA",  # Required field
            "codigo_empresa": "",  # Optional - empty string
            "nome_fantasia": "",   # Optional - empty string
            "inscricao_estadual": "",  # Optional - empty string
            "inscricao_municipal": "",  # Optional - empty string
            "endereco": "",  # Optional - empty string
            "cidade": "",  # Optional - empty string
            "uf": "",  # Optional - empty string
            "cep": "",  # Optional - empty string
            "cnae_principal": "",  # Optional - empty string
            "cnae_principal_descricao": "",  # Optional - empty string
            "atividade_principal": "",  # Optional - empty string
            "produtos_comercializados": [],  # Optional - empty list
            "insumos_producao": [],  # Optional - empty list
            "produtos_despesa": [],  # Optional - empty list
            "regime_tributario": "lucro_presumido",  # Has default
            "anexos_simples": [],  # Optional - empty list
            "tipo_atividade": "comercio",  # Has default
            "tipos_servico": [],  # Optional - empty list
            "percentual_presuncao_irpj": 0.0,  # Test with 0
            "percentual_presuncao_csll": 0.0,  # Test with 0
            "estoque_inicial": 0.0,  # Test with 0
            "estoque_final": 0.0  # Test with 0
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company with Empty Strings and Zero Values",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.company_ids.append(response['id'])
            print(f"✅ Company created successfully with ID: {response['id']}")
            
            # Verify the created company has the expected values
            if response.get('codigo_empresa') == "":
                print("✅ Empty string codigo_empresa preserved")
            if response.get('percentual_presuncao_irpj') == 0.0:
                print("✅ Zero value percentual_presuncao_irpj preserved")
            if response.get('estoque_inicial') == 0.0:
                print("✅ Zero value estoque_inicial preserved")
                
        return success, response

    def test_company_creation_with_none_values(self):
        """Test company creation with None/null values for optional fields"""
        if not self.admin_token:
            return False, {}
        
        # Test with None values for optional fields (should use defaults)
        company_data = {
            "cnpj": "22.333.444/0001-55",  # Required field
            "razao_social": "Empresa Teste None Values LTDA",  # Required field
            "codigo_empresa": None,  # Optional - None
            "nome_fantasia": None,   # Optional - None
            "inscricao_estadual": None,  # Optional - None
            "inscricao_municipal": None,  # Optional - None
            "endereco": None,  # Optional - None
            "cidade": None,  # Optional - None
            "uf": None,  # Optional - None
            "cep": None,  # Optional - None
            "cnae_principal": None,  # Optional - None
            "cnae_principal_descricao": None,  # Optional - None
            "atividade_principal": None,  # Optional - None
            # Lists and numeric fields with defaults should work without specifying
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Create Company with None Values",
            "POST",
            "companies",
            200,
            data=company_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.company_ids.append(response['id'])
            print(f"✅ Company created successfully with ID: {response['id']}")
            
            # Verify defaults were applied
            if response.get('regime_tributario') == "lucro_presumido":
                print("✅ Default regime_tributario applied")
            if response.get('tipo_atividade') == "comercio":
                print("✅ Default tipo_atividade applied")
            if response.get('percentual_presuncao_irpj') == 8.0:
                print("✅ Default percentual_presuncao_irpj applied")
                
        return success, response

    def test_list_companies_no_500_error(self):
        """Test that listing companies doesn't return 500 error"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "List Companies - No 500 Error",
            "GET",
            "companies",
            200,
            headers=headers
        )
        
        if success:
            print(f"✅ List companies returned {len(response)} companies without 500 error")
            
            # Check if any companies have missing created_at field (the previous issue)
            companies_without_created_at = 0
            for company in response:
                if 'created_at' not in company or company['created_at'] is None:
                    companies_without_created_at += 1
            
            if companies_without_created_at > 0:
                print(f"⚠️  Found {companies_without_created_at} companies without created_at field")
            else:
                print("✅ All companies have created_at field")
                
        return success, response

    def test_list_companies_multiple_times(self):
        """Test listing companies multiple times to check for intermittent errors"""
        if not self.admin_token:
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        success_count = 0
        total_attempts = 5
        
        for i in range(total_attempts):
            success, response = self.run_test(
                f"List Companies - Attempt {i+1}",
                "GET",
                "companies",
                200,
                headers=headers
            )
            if success:
                success_count += 1
        
        if success_count == total_attempts:
            print(f"✅ All {total_attempts} attempts successful - no intermittent errors")
            return True, {}
        else:
            print(f"❌ Only {success_count}/{total_attempts} attempts successful")
            return False, {}

    def cleanup_test_companies(self):
        """Clean up test companies created during testing"""
        if not self.admin_token:
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        for company_id in self.company_ids:
            try:
                success, response = self.run_test(
                    f"Cleanup Company {company_id}",
                    "DELETE",
                    f"companies/{company_id}",
                    200,
                    headers=headers
                )
                if success:
                    print(f"✅ Cleaned up company {company_id}")
            except Exception as e:
                print(f"⚠️  Failed to cleanup company {company_id}: {str(e)}")

def main():
    print("🚀 Starting Company Validation Tests")
    print("Testing: Company creation with empty strings/0 values and list companies without 500 errors")
    print("=" * 80)
    
    tester = CompanyValidationTester()
    
    # Setup admin user
    if not tester.setup_admin_user():
        print("❌ Failed to setup admin user")
        return 1
    
    # Run specific validation tests
    tests = [
        tester.test_company_creation_with_empty_strings,
        tester.test_company_creation_with_none_values,
        tester.test_list_companies_no_500_error,
        tester.test_list_companies_multiple_times,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
            tester.errors.append(f"{test.__name__}: Exception - {str(e)}")
    
    # Cleanup
    tester.cleanup_test_companies()
    
    # Print results
    print("\n" + "=" * 80)
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