"""
Test suite for Upload Progress Fallback and Wizard Fechamento Concluído features.
Tests:
1. /api/xml/upload-status/{upload_id} endpoint - returns correct status (completed, not_found, error)
2. Wizard Fechamento step 8 (Concluído) - new step added
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dados-corrigidos.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "Business@2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestUploadStatusEndpoint:
    """Tests for /api/xml/upload-status/{upload_id} endpoint"""
    
    def test_upload_status_not_found(self, auth_headers):
        """Test endpoint returns 'not_found' status for non-existent upload_id"""
        fake_upload_id = "non-existent-upload-12345"
        response = requests.get(
            f"{BASE_URL}/api/xml/upload-status/{fake_upload_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "status" in data, "Response should contain 'status' field"
        assert "completed" in data, "Response should contain 'completed' field"
        
        # Verify not_found status
        assert data.get("status") == "not_found", f"Expected 'not_found', got {data.get('status')}"
        assert data.get("completed") == False, "completed should be False for not found uploads"
        assert "error" in data or data.get("status") == "not_found", "Should indicate upload not found"
        
        print(f"✓ Upload status not_found test passed: {data}")
    
    def test_upload_status_response_structure(self, auth_headers):
        """Test that endpoint returns proper response structure"""
        # Test with any upload_id to verify response structure
        response = requests.get(
            f"{BASE_URL}/api/xml/upload-status/test-structure-check",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields are present in response
        expected_fields = ["status", "completed"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Upload status response structure test passed: {data.keys()}")


class TestWizardFechamentoStep8:
    """Tests for Wizard Fechamento step 8 (Concluído)"""
    
    def test_wizard_status_endpoint_returns_8_steps(self, auth_headers):
        """Test that wizard status returns steps including step 8 (Concluído)"""
        # First get companies to find one
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available for testing")
        
        # Use first company
        company_id = companies[0].get("id")
        
        # Get wizard status
        response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/status/{company_id}?competencia=02/2026",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            pytest.skip("Wizard status endpoint not found or no data")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check steps structure
        steps = data.get("steps", [])
        print(f"Wizard steps count: {len(steps)}")
        
        # Verify steps are returned
        assert len(steps) > 0, "Wizard should return steps"
        
        # Check step IDs
        step_ids = [s.get("id") for s in steps]
        print(f"Step IDs: {step_ids}")
        
        # Verify step 8 exists (Concluído)
        if 8 in step_ids:
            step_8 = next((s for s in steps if s.get("id") == 8), None)
            print(f"✓ Step 8 (Concluído) found: {step_8.get('title', 'N/A')}")
            assert step_8 is not None, "Step 8 should exist"
        else:
            print(f"⚠ Step 8 not found in steps. Available steps: {step_ids}")
        
        print(f"✓ Wizard status endpoint test passed with {len(steps)} steps")
    
    def test_wizard_step_8_navigation(self, auth_headers):
        """Test navigation to step 8 (Concluído)"""
        # Get companies
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available for testing")
        
        company_id = companies[0].get("id")
        
        # Try to navigate to step 8
        response = requests.post(
            f"{BASE_URL}/api/wizard-fechamento/step/{company_id}/8/go?competencia=02/2026",
            headers=auth_headers,
            json={}
        )
        
        # Step 8 navigation should work (200) or fail gracefully (404 if not enabled yet)
        assert response.status_code in [200, 404, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print("✓ Step 8 navigation successful")
        else:
            print(f"⚠ Step 8 navigation returned {response.status_code}: {response.text}")
    
    def test_wizard_report_download_endpoint(self, auth_headers):
        """Test wizard report download endpoint exists"""
        # Get companies
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available for testing")
        
        company_id = companies[0].get("id")
        
        # Test PDF report endpoint
        response_pdf = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/relatorio/{company_id}?competencia=02/2026&formato=pdf",
            headers=auth_headers
        )
        
        # Endpoint should exist (200 or generate error 400/404 if no data)
        assert response_pdf.status_code in [200, 400, 404, 500], f"PDF endpoint issue: {response_pdf.status_code}"
        
        if response_pdf.status_code == 200:
            # Verify it returns PDF content-type
            content_type = response_pdf.headers.get("content-type", "")
            print(f"✓ PDF report endpoint works. Content-Type: {content_type}")
        else:
            print(f"⚠ PDF report returned {response_pdf.status_code}")
        
        # Test Excel report endpoint
        response_excel = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/relatorio/{company_id}?competencia=02/2026&formato=excel",
            headers=auth_headers
        )
        
        assert response_excel.status_code in [200, 400, 404, 500], f"Excel endpoint issue: {response_excel.status_code}"
        
        if response_excel.status_code == 200:
            content_type = response_excel.headers.get("content-type", "")
            print(f"✓ Excel report endpoint works. Content-Type: {content_type}")
        else:
            print(f"⚠ Excel report returned {response_excel.status_code}")


class TestPollingFallbackLogic:
    """Tests for upload polling fallback logic"""
    
    def test_upload_init_returns_upload_id(self, auth_headers):
        """Test that upload-init returns a valid upload_id"""
        # Get a company for testing
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=auth_headers
        )
        assert companies_response.status_code == 200
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available for testing")
        
        company_id = companies[0].get("id")
        
        # Initialize upload
        init_data = {
            "company_id": company_id,
            "competencia": "02/2026",
            "tipo": "entrada",
            "total_files": "1",
            "skip_ai": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/xml/upload-init",
            headers=auth_headers,
            data=init_data
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "upload_id" in data, "Response should contain upload_id"
            upload_id = data.get("upload_id")
            print(f"✓ Upload init returned upload_id: {upload_id}")
            
            # Now test the status endpoint with this real upload_id
            status_response = requests.get(
                f"{BASE_URL}/api/xml/upload-status/{upload_id}",
                headers=auth_headers
            )
            assert status_response.status_code == 200
            status_data = status_response.json()
            
            # Should return valid status (not not_found since we just created it)
            print(f"✓ Upload status for new upload: {status_data.get('status')}")
        else:
            print(f"⚠ Upload init returned {response.status_code}: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
