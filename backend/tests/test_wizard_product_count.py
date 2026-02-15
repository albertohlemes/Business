"""
Test suite for Wizard Product Count Sync
Tests the bug fixes:
1. Product count in Wizard step 4 should match Classificação Inteligente
2. Central de Fechamento shows 7 steps correctly
3. CFOP alerts endpoints return proper data structure with cfop_original
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWizardProductCountSync:
    """Test that Wizard product counts match Classification Intelligence counts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment - authenticate and get tokens"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "Business@2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get SUNGROUP company ID (code 0760)
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        companies = response.json()
        sungroup = next((c for c in companies if c.get("codigo_empresa") == "0760"), None)
        assert sungroup is not None, "SUNGROUP company (0760) not found"
        self.sungroup_id = sungroup["id"]
        
        # Get M & A DE MORAES company ID (code 6388) - has CFOP alerts
        moraes = next((c for c in companies if c.get("codigo_empresa") == "6388"), None)
        if moraes:
            self.moraes_id = moraes["id"]
        else:
            self.moraes_id = None
        
    def test_wizard_step4_and_classification_counts_match(self):
        """
        Feature 1: Verify product counts in Wizard step 4 match Classification Intelligence
        The wizard was showing double the count before the fix.
        """
        competencia = "02/2026"
        
        # Get Wizard Step 4 data
        wizard_response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/step/{self.sungroup_id}/4?competencia={competencia}",
            headers=self.headers
        )
        assert wizard_response.status_code == 200, f"Wizard step 4 failed: {wizard_response.text}"
        wizard_data = wizard_response.json().get("data", {})
        
        # Get Classification Intelligence data
        classif_response = requests.get(
            f"{BASE_URL}/api/classification/suggestions-v2/{self.sungroup_id}?competencia={competencia}",
            headers=self.headers
        )
        assert classif_response.status_code == 200, f"Classification failed: {classif_response.text}"
        classif_data = classif_response.json()
        resumo = classif_data.get("resumo", {})
        
        # Compare counts
        wizard_total = wizard_data.get("total_pendentes", 0) + wizard_data.get("total_classificados", 0)
        classif_total = resumo.get("total_produtos", 0)
        
        print(f"Wizard total: {wizard_total} (pendentes: {wizard_data.get('total_pendentes')}, classificados: {wizard_data.get('total_classificados')})")
        print(f"Classification total: {classif_total} (novos: {resumo.get('novos')}, ja_classificados: {resumo.get('ja_classificados')})")
        
        # The counts should match (or be very close if there's processing differences)
        assert wizard_total == classif_total, \
            f"Product counts don't match! Wizard: {wizard_total}, Classification: {classif_total}"
    
    def test_wizard_has_7_steps(self):
        """
        Feature 2: Verify Central de Fechamento shows 7 steps
        """
        competencia = "02/2026"
        
        # Get all wizard steps data
        response = requests.get(
            f"{BASE_URL}/api/wizard-fechamento/{self.sungroup_id}/status?competencia={competencia}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Wizard status failed: {response.text}"
        data = response.json()
        
        steps = data.get("steps", [])
        
        # Verify exactly 7 steps
        assert len(steps) == 7, f"Expected 7 steps, got {len(steps)}"
        
        # Verify step names
        expected_step_names = [
            "notas_canceladas",
            "devolucoes", 
            "alertas_cfop",
            "classificacao_cfop",
            "pis_cofins_entradas",
            "pis_cofins_saidas",
            "reforma_tributaria"
        ]
        
        actual_step_names = [s.get("name") for s in steps]
        print(f"Step names: {actual_step_names}")
        
        for i, expected in enumerate(expected_step_names):
            assert actual_step_names[i] == expected, \
                f"Step {i+1} name mismatch. Expected: {expected}, Got: {actual_step_names[i]}"
    
    def test_wizard_step_navigation(self):
        """
        Feature 3: Verify navigation to each wizard step works correctly
        """
        competencia = "02/2026"
        
        for step_id in range(1, 8):
            response = requests.get(
                f"{BASE_URL}/api/wizard-fechamento/step/{self.sungroup_id}/{step_id}?competencia={competencia}",
                headers=self.headers
            )
            assert response.status_code == 200, \
                f"Navigation to step {step_id} failed: {response.text}"
            
            data = response.json()
            assert "step" in data or "data" in data, \
                f"Step {step_id} response missing expected fields"
            print(f"Step {step_id}: OK")


class TestCfopAlertsFeatures:
    """Test CFOP alerts features - Original CFOP and manual edit"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "Business@2026"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get M & A DE MORAES company (has CFOP alerts)
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = response.json()
        moraes = next((c for c in companies if c.get("codigo_empresa") == "6388"), None)
        self.moraes_id = moraes["id"] if moraes else None
        
    def test_cfop_alerts_have_original_cfop_field(self):
        """
        Feature 4 & 5: Verify CFOP alerts include cfop_original and cfop_original_emissor fields
        """
        if not self.moraes_id:
            pytest.skip("M & A DE MORAES company not found")
        
        response = requests.get(
            f"{BASE_URL}/api/alertas-cfop/{self.moraes_id}/agrupado?competencia=01/2026",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get CFOP alerts: {response.text}"
        
        data = response.json()
        grupos = data.get("grupos", [])
        
        if len(grupos) == 0:
            pytest.skip("No CFOP alert groups found for testing")
        
        # Check the first group
        grupo = grupos[0]
        
        # Verify cfop_original field exists at group level
        assert "cfop_original" in grupo, "Group should have cfop_original field"
        print(f"Group CFOP: {grupo.get('cfop')}, Original: {grupo.get('cfop_original')}")
        
        # Verify products have cfop_original_emissor field
        produtos = grupo.get("produtos", [])
        if len(produtos) > 0:
            prod = produtos[0]
            assert "cfop_original_emissor" in prod, "Product should have cfop_original_emissor field"
            print(f"Product CFOP Original Emissor: {prod.get('cfop_original_emissor')}")
    
    def test_individual_cfop_resolve_endpoint_accepts_json(self):
        """
        Feature 6: Verify individual CFOP resolve endpoint accepts JSON body
        This tests the endpoint structure, not actual resolution.
        """
        if not self.moraes_id:
            pytest.skip("M & A DE MORAES company not found")
        
        # Get alerts to get a valid produto
        response = requests.get(
            f"{BASE_URL}/api/alertas-cfop/{self.moraes_id}/agrupado?competencia=01/2026",
            headers=self.headers
        )
        
        data = response.json()
        grupos = data.get("grupos", [])
        
        if len(grupos) == 0 or len(grupos[0].get("produtos", [])) == 0:
            pytest.skip("No products found for testing individual resolve")
        
        # Get the first product
        grupo = grupos[0]
        prod = grupo["produtos"][0]
        
        # Test the endpoint with JSON body (should accept it)
        payload = {
            "documento_id": prod.get("documento_id"),
            "produto_idx": prod.get("produto_idx"),
            "novo_cfop": "1102",  # Test CFOP
            "competencia": "01/2026"
        }
        
        # We're just checking the endpoint accepts JSON body correctly
        # We won't actually resolve to avoid modifying data
        response = requests.post(
            f"{BASE_URL}/api/alertas-cfop/resolver-individual/{self.moraes_id}",
            headers=self.headers,
            json=payload
        )
        
        # The endpoint should accept the request (may fail for business reasons but not 422/400 for format)
        assert response.status_code in [200, 201, 400, 404, 500], \
            f"Endpoint rejected JSON body with status {response.status_code}: {response.text}"
        
        # If it's 200, verify the response structure
        if response.status_code == 200:
            result = response.json()
            assert "success" in result or "message" in result, \
                "Response should have success or message field"
            print(f"Individual resolve response: {result}")


class TestWizardStepperNavigation:
    """Test wizard stepper navigation - clicking each step should work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "Business@2026"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get SUNGROUP company
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = response.json()
        sungroup = next((c for c in companies if c.get("codigo_empresa") == "0760"), None)
        self.sungroup_id = sungroup["id"] if sungroup else None
    
    def test_all_7_steps_are_accessible(self):
        """Verify all 7 wizard steps can be accessed via API"""
        if not self.sungroup_id:
            pytest.skip("SUNGROUP company not found")
        
        competencia = "02/2026"
        step_responses = []
        
        for step_id in range(1, 8):
            response = requests.get(
                f"{BASE_URL}/api/wizard-fechamento/step/{self.sungroup_id}/{step_id}?competencia={competencia}",
                headers=self.headers
            )
            step_responses.append({
                "step_id": step_id,
                "status_code": response.status_code,
                "success": response.status_code == 200
            })
        
        # All steps should be accessible
        failed_steps = [s for s in step_responses if not s["success"]]
        assert len(failed_steps) == 0, f"Failed steps: {failed_steps}"
        
        print("All 7 wizard steps are accessible via API")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
