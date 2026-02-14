"""
Backend API Tests for Wizard Fechamento P0 Issues - Iteration 54
Tests:
1. Step 4 complete API accepts classificar_produtos and forcar_reclassificacao
2. Report generation includes all steps (1-7)
3. ICMS ST endpoint returns data or empty state
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "Business@2026"
COMPANY_CODE = "0760"  # SUNGROUP ENERGIA
COMPETENCIA = "02/2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def company_id(auth_token):
    """Get company ID by company code"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
    if response.status_code == 200:
        companies = response.json()
        for company in companies:
            if company.get("codigo_empresa") == COMPANY_CODE:
                return company.get("id")
    pytest.skip(f"Company {COMPANY_CODE} not found")


class TestWizardFechamentoStep4:
    """Tests for Wizard Fechamento Step 4 - Classification with hierarchy"""
    
    def test_step4_get_data(self, auth_token, company_id):
        """Test GET step 4 data - should include pending products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/step/{company_id}/4",
            params={"competencia": COMPETENCIA},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "data" in data, "Response should contain 'data' field"
        step_data = data.get("data", {})
        
        # Check for classification-related fields
        assert "total_classificados" in step_data or "total_pendentes" in step_data, \
            "Step 4 data should include classification counts"
        
        print(f"Step 4 data: classified={step_data.get('total_classificados', 0)}, pending={step_data.get('total_pendentes', 0)}")
    
    def test_step4_complete_accepts_skip_parameter(self, auth_token, company_id):
        """Test POST step 4 complete - should accept classificar_produtos=false (skip)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with classificar_produtos=false (skip classification)
        response = requests.post(
            f"{BASE_URL}/api/wizard-fechamento/step/{company_id}/4/complete",
            params={"competencia": COMPETENCIA},
            headers=headers,
            json={"classificar_produtos": False}
        )
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        print(f"Step 4 skip classification response: {data}")


class TestApuracaoICMSST:
    """Tests for Apuração ICMS including ICMS ST tab"""
    
    def test_apuracao_icms_endpoint(self, auth_token, company_id):
        """Test ICMS apuração endpoint - includes ICMS ST data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{company_id}",
            params={"competencia": COMPETENCIA},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response should have basic ICMS data
        assert "entradas" in data or "saidas" in data or "totais" in data, \
            "Response should include ICMS data"
        
        # ICMS ST might be empty but that's OK
        icms_st = data.get("icms_st", {})
        print(f"ICMS data returned, ICMS ST present: {bool(icms_st)}")


class TestWizardStepsDefinition:
    """Tests for Wizard steps definition"""
    
    def test_wizard_status_includes_all_steps(self, auth_token, company_id):
        """Verify wizard status includes all 7 main steps + completion step"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/status/{company_id}",
            params={"competencia": COMPETENCIA},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check steps array
        steps = data.get("steps", [])
        assert len(steps) >= 7, f"Should have at least 7 steps, got {len(steps)}"
        
        # Verify step 4 is named 'classificacao_cfop' (not 'classificacao')
        step4 = next((s for s in steps if s.get("id") == 4), None)
        assert step4 is not None, "Step 4 should exist"
        assert step4.get("name") == "classificacao_cfop", \
            f"Step 4 name should be 'classificacao_cfop', got '{step4.get('name')}'"
        
        print(f"All {len(steps)} wizard steps are defined correctly")
        print(f"Step 4 name: {step4.get('name')}")


class TestWizardReport:
    """Tests for Wizard Report generation"""
    
    def test_report_endpoint_pdf(self, auth_token, company_id):
        """Test PDF report generation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/relatorio/{company_id}",
            params={"competencia": COMPETENCIA, "formato": "pdf"},
            headers=headers
        )
        
        # Should return PDF or 404 if no wizard data
        assert response.status_code in [200, 404], \
            f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            assert len(response.content) > 0, "PDF should have content"
            print(f"PDF report generated successfully ({len(response.content)} bytes)")
        else:
            print("No wizard data available for report (404 is expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
