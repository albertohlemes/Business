#!/usr/bin/env python3
"""
Test script for cancelled notes report endpoints as requested in review.

Tests the following endpoints:
1. Login: POST /api/auth/login with {"email":"admin@test.com","password":"123456"}
2. Get company: GET /api/companies to obtain company_id
3. Test report endpoint: GET /api/relatorio-notas-canceladas/{company_id}
4. Test Excel export: GET /api/relatorio-notas-canceladas/{company_id}/exportar?formato=excel
5. Test Word export: GET /api/relatorio-notas-canceladas/{company_id}/exportar?formato=word

Verifies:
- Response structure: titulo, empresa, competencia, data_geracao, resumo, descricao, notas
- Resumo structure: total_notas, total_entradas, total_saidas, valor_total_entradas, valor_total_saidas, valor_total
- Authentication requirements
- Export functionality
"""

import requests
import json
import sys
from datetime import datetime

class CancelledNotesReportTester:
    def __init__(self, base_url="https://tax-compliance-test.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.company_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
    
    def test_login(self):
        """Step 1: Login with admin@test.com / 123456"""
        self.log("Step 1: Testing login with admin@test.com / 123456")
        
        url = f"{self.base_url}/auth/login"
        data = {
            "email": "admin@test.com",
            "password": "123456"
        }
        
        try:
            response = requests.post(url, json=data)
            
            if response.status_code == 200:
                result = response.json()
                if 'access_token' in result:
                    self.token = result['access_token']
                    self.log("✅ Login successful", "SUCCESS")
                    return True
                else:
                    self.log("❌ Login response missing access_token", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_get_company(self):
        """Step 2: Get company to obtain company_id"""
        self.log("Step 2: Getting company list to obtain company_id")
        
        if not self.token:
            self.log("❌ No token available", "ERROR")
            return False
        
        url = f"{self.base_url}/companies"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                companies = response.json()
                if companies and len(companies) > 0:
                    self.company_id = companies[0]['id']
                    company_name = companies[0].get('razao_social', 'N/A')
                    self.log(f"✅ Found company: {company_name} (ID: {self.company_id})", "SUCCESS")
                    return True
                else:
                    self.log("❌ No companies found", "ERROR")
                    return False
            else:
                self.log(f"❌ Get companies failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get companies failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_report_endpoint(self):
        """Step 3: Test main cancelled notes report endpoint"""
        self.log("Step 3: Testing cancelled notes report endpoint")
        
        if not self.token or not self.company_id:
            self.log("❌ Missing token or company_id", "ERROR")
            return False
        
        url = f"{self.base_url}/relatorio-notas-canceladas/{self.company_id}"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Verify required structure
                required_keys = ['titulo', 'empresa', 'competencia', 'data_geracao', 'resumo', 'descricao', 'notas']
                missing_keys = [key for key in required_keys if key not in result]
                
                if missing_keys:
                    self.log(f"❌ Missing required keys: {missing_keys}", "ERROR")
                    return False
                
                # Verify resumo structure
                resumo = result.get('resumo', {})
                resumo_keys = ['total_notas', 'total_entradas', 'total_saidas', 'valor_total_entradas', 'valor_total_saidas', 'valor_total']
                missing_resumo_keys = [key for key in resumo_keys if key not in resumo]
                
                if missing_resumo_keys:
                    self.log(f"❌ Missing resumo keys: {missing_resumo_keys}", "ERROR")
                    return False
                
                # Log report details
                self.log(f"✅ Report structure verified:", "SUCCESS")
                self.log(f"   - Titulo: {result.get('titulo', '')}")
                self.log(f"   - Empresa: {result.get('empresa', {}).get('razao_social', 'N/A')}")
                self.log(f"   - Competencia: {result.get('competencia', 'N/A')}")
                self.log(f"   - Total notas: {resumo.get('total_notas', 0)}")
                self.log(f"   - Total entradas: {resumo.get('total_entradas', 0)}")
                self.log(f"   - Total saidas: {resumo.get('total_saidas', 0)}")
                self.log(f"   - Valor total: R$ {resumo.get('valor_total', 0)}")
                
                return True
            else:
                self.log(f"❌ Report endpoint failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Report endpoint failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_excel_export(self):
        """Step 4: Test Excel export endpoint"""
        self.log("Step 4: Testing Excel export endpoint")
        
        if not self.token or not self.company_id:
            self.log("❌ Missing token or company_id", "ERROR")
            return False
        
        url = f"{self.base_url}/relatorio-notas-canceladas/{self.company_id}/exportar?formato=excel"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                # Check if response has content (file)
                if len(response.content) > 0:
                    self.log("✅ Excel export successful - file returned", "SUCCESS")
                    
                    # Check Content-Type if available
                    content_type = response.headers.get('Content-Type', '')
                    if 'spreadsheet' in content_type or 'excel' in content_type:
                        self.log(f"✅ Correct Content-Type: {content_type}", "SUCCESS")
                    else:
                        self.log(f"⚠️  Content-Type: {content_type} (may not be Excel specific)", "WARNING")
                    
                    return True
                else:
                    self.log("❌ Excel export returned empty content", "ERROR")
                    return False
            else:
                self.log(f"❌ Excel export failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Excel export failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_word_export(self):
        """Step 5: Test Word export endpoint"""
        self.log("Step 5: Testing Word export endpoint")
        
        if not self.token or not self.company_id:
            self.log("❌ Missing token or company_id", "ERROR")
            return False
        
        url = f"{self.base_url}/relatorio-notas-canceladas/{self.company_id}/exportar?formato=word"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                # Check if response has content (file)
                if len(response.content) > 0:
                    self.log("✅ Word export successful - file returned", "SUCCESS")
                    
                    # Check Content-Type if available
                    content_type = response.headers.get('Content-Type', '')
                    if 'word' in content_type or 'document' in content_type:
                        self.log(f"✅ Correct Content-Type: {content_type}", "SUCCESS")
                    else:
                        self.log(f"⚠️  Content-Type: {content_type} (may not be Word specific)", "WARNING")
                    
                    return True
                else:
                    self.log("❌ Word export returned empty content", "ERROR")
                    return False
            else:
                self.log(f"❌ Word export failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Word export failed with exception: {str(e)}", "ERROR")
            return False
    
    def test_authentication(self):
        """Step 6: Test authentication requirement"""
        self.log("Step 6: Testing authentication requirement")
        
        if not self.company_id:
            self.log("❌ Missing company_id", "ERROR")
            return False
        
        url = f"{self.base_url}/relatorio-notas-canceladas/{self.company_id}"
        # No Authorization header
        
        try:
            response = requests.get(url)
            
            if response.status_code in [401, 403]:  # Both are acceptable for missing auth
                self.log("✅ Authentication properly required", "SUCCESS")
                return True
            else:
                self.log(f"❌ Expected 401/403 for missing auth, got {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication test failed with exception: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting Cancelled Notes Report Endpoints Test", "INFO")
        self.log("=" * 60)
        
        tests = [
            ("Login", self.test_login),
            ("Get Company", self.test_get_company),
            ("Report Endpoint", self.test_report_endpoint),
            ("Excel Export", self.test_excel_export),
            ("Word Export", self.test_word_export),
            ("Authentication", self.test_authentication)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n--- {test_name} Test ---")
            if test_func():
                passed += 1
            else:
                self.log(f"❌ {test_name} test failed", "ERROR")
        
        self.log("\n" + "=" * 60)
        self.log(f"📊 Test Results: {passed}/{total} passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED - Cancelled notes report endpoints are working correctly!", "SUCCESS")
            return True
        else:
            self.log(f"❌ {total - passed} test(s) failed", "ERROR")
            return False

def main():
    tester = CancelledNotesReportTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())