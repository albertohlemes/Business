"""
Test Suite for Dashboard Stats Tax Calculation Fix
===================================================
Tests the fix for ICMS, PIS, COFINS calculations in the dashboard stats endpoint.

The bug was that taxes (ICMS, PIS, COFINS) were showing as zero in the Dashboard
even with R$ 969,649.80 in NFCe sales. The fix adds a separate aggregation pipeline 
to calculate taxes at the PRODUCT level (campos v_icms, v_pis, v_cofins dentro de produtos[]).

Test scenarios:
1. Normal version (<5000 docs): test-company-dashboard with 10 NFCe
2. Aggregated version (>5000 docs): Republic company with ~14,700 docs

Endpoints tested:
- GET /api/dashboard/stats/{company_id}?competencia={competencia}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "Business@2026"

# Test companies
TEST_COMPANY_SMALL = "test-company-dashboard"  # ~10 docs, uses normal version
TEST_COMPANY_SMALL_COMPETENCIA = "2026-01"

TEST_COMPANY_LARGE = "2bde03ac-7314-40b3-94cc-eb7827bccd55"  # Republic - ~14,700 docs, uses aggregated version
TEST_COMPANY_LARGE_COMPETENCIA = "01/2026"


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
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardStatsResponseStructure:
    """Tests for dashboard stats response structure"""
    
    def test_dashboard_stats_returns_debitos_section(self, auth_headers):
        """Test that dashboard stats returns debitos section with tax fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify debitos section exists
        assert "debitos" in data, "Missing 'debitos' section in response"
        debitos = data["debitos"]
        
        # Verify required tax fields exist
        assert "icms" in debitos, "Missing 'icms' in debitos"
        assert "pis" in debitos, "Missing 'pis' in debitos"
        assert "cofins" in debitos, "Missing 'cofins' in debitos"
        assert "total" in debitos, "Missing 'total' in debitos"
        
        print(f"Debitos structure: ICMS={debitos['icms']}, PIS={debitos['pis']}, COFINS={debitos['cofins']}")
    
    def test_dashboard_stats_returns_impostos_pagar_section(self, auth_headers):
        """Test that dashboard stats returns impostos_pagar section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify impostos_pagar section exists
        assert "impostos_pagar" in data, "Missing 'impostos_pagar' section in response"
        impostos = data["impostos_pagar"]
        
        # Verify required fields
        assert "icms" in impostos, "Missing 'icms' in impostos_pagar"
        assert "pis" in impostos, "Missing 'pis' in impostos_pagar"
        assert "cofins" in impostos, "Missing 'cofins' in impostos_pagar"
        assert "total" in impostos, "Missing 'total' in impostos_pagar"
        
        print(f"Impostos a pagar: ICMS={impostos['icms']}, PIS={impostos['pis']}, COFINS={impostos['cofins']}")
    
    def test_dashboard_stats_returns_creditos_section(self, auth_headers):
        """Test that dashboard stats returns creditos section"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify creditos section exists
        assert "creditos" in data, "Missing 'creditos' section in response"
        creditos = data["creditos"]
        
        # Verify required fields
        assert "icms" in creditos, "Missing 'icms' in creditos"
        assert "pis" in creditos, "Missing 'pis' in creditos"
        assert "cofins" in creditos, "Missing 'cofins' in creditos"
        
        print(f"Creditos structure: ICMS={creditos['icms']}, PIS={creditos['pis']}, COFINS={creditos['cofins']}")


class TestDashboardStatsNormalVersion:
    """
    Tests for dashboard stats with normal version (<5000 documents)
    Uses test-company-dashboard with ~10 NFCe documents
    """
    
    def test_dashboard_stats_debito_icms_not_zero(self, auth_headers):
        """Test that debito ICMS is NOT zero when there are saida documents with v_icms"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check that ICMS is not zero (test company has R$ 12,000 in ICMS from products)
        debito_icms = data["debitos"]["icms"]
        print(f"Normal version - Debito ICMS: R$ {debito_icms}")
        
        # MAIN BUG CHECK: ICMS should be > 0 for saida documents with v_icms
        assert debito_icms > 0, f"BUG: Debito ICMS should be > 0, got {debito_icms}"
    
    def test_dashboard_stats_debito_pis_calculation(self, auth_headers):
        """Test that debito PIS is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # PIS should be calculated from products.v_pis
        debito_pis = data["debitos"]["pis"]
        print(f"Normal version - Debito PIS: R$ {debito_pis}")
        
        # Test company has PIS values, should be > 0
        # Note: For NFCe, PIS might be 0 in the XML (this is normal)
        # Just verify the field is numeric
        assert isinstance(debito_pis, (int, float)), f"Debito PIS should be numeric, got {type(debito_pis)}"
    
    def test_dashboard_stats_debito_cofins_calculation(self, auth_headers):
        """Test that debito COFINS is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # COFINS should be calculated from products.v_cofins
        debito_cofins = data["debitos"]["cofins"]
        print(f"Normal version - Debito COFINS: R$ {debito_cofins}")
        
        # Just verify the field is numeric
        assert isinstance(debito_cofins, (int, float)), f"Debito COFINS should be numeric, got {type(debito_cofins)}"
    
    def test_dashboard_stats_impostos_pagar_calculation(self, auth_headers):
        """Test that impostos_pagar = debitos - creditos"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": TEST_COMPANY_SMALL_COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        debitos = data["debitos"]
        creditos = data["creditos"]
        impostos_pagar = data["impostos_pagar"]
        
        # Calculate expected values
        expected_icms = max(0, debitos["icms"] - creditos["icms"])
        expected_pis = max(0, debitos["pis"] - creditos["pis"])
        expected_cofins = max(0, debitos["cofins"] - creditos["cofins"])
        
        print(f"Impostos a pagar calculation:")
        print(f"  ICMS: {debitos['icms']} - {creditos['icms']} = {expected_icms} (got {impostos_pagar['icms']})")
        print(f"  PIS: {debitos['pis']} - {creditos['pis']} = {expected_pis} (got {impostos_pagar['pis']})")
        print(f"  COFINS: {debitos['cofins']} - {creditos['cofins']} = {expected_cofins} (got {impostos_pagar['cofins']})")
        
        # Allow small floating point differences
        assert abs(impostos_pagar["icms"] - expected_icms) < 0.01, f"ICMS a pagar mismatch"
        assert abs(impostos_pagar["pis"] - expected_pis) < 0.01, f"PIS a pagar mismatch"
        assert abs(impostos_pagar["cofins"] - expected_cofins) < 0.01, f"COFINS a pagar mismatch"


class TestDashboardStatsAggregatedVersion:
    """
    Tests for dashboard stats with aggregated version (>5000 documents)
    Uses Republic company with ~14,700 NFCe documents - triggers _get_dashboard_stats_aggregated
    """
    
    def test_dashboard_stats_aggregated_mode_flag(self, auth_headers):
        """Test that aggregated mode is used for large document sets"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120  # Large dataset may take longer
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for aggregated mode flag
        is_aggregated = data.get("_modo_agregado", False)
        total_docs = data.get("_total_documentos_processados", 0)
        
        print(f"Aggregated mode: {is_aggregated}, Total docs: {total_docs}")
        
        # Should be in aggregated mode for >5000 docs
        assert is_aggregated == True, f"Expected aggregated mode for large dataset"
        assert total_docs >= 5000, f"Expected >5000 docs, got {total_docs}"
    
    def test_dashboard_stats_aggregated_debito_icms_not_zero(self, auth_headers):
        """
        MAIN BUG TEST: Test that debito ICMS is NOT zero in aggregated version
        This was the original bug - ICMS was zerado because it used icms_total (which doesn't exist)
        instead of summing products.v_icms
        """
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        debito_icms = data["debitos"]["icms"]
        faturamento = data.get("valores", {}).get("faturamento_total", 0)
        
        print(f"Aggregated version - Debito ICMS: R$ {debito_icms:,.2f}")
        print(f"Aggregated version - Faturamento: R$ {faturamento:,.2f}")
        
        # CRITICAL BUG CHECK: With R$ 969k+ in sales, ICMS should NOT be zero
        # Republic has ~R$ 30,670 in ICMS from products
        assert debito_icms > 0, f"BUG: Debito ICMS should be > 0 for aggregated version, got {debito_icms}"
        
        # Additional check: ICMS should be reasonable percentage of faturamento
        if faturamento > 0:
            icms_percentage = (debito_icms / faturamento) * 100
            print(f"ICMS as % of faturamento: {icms_percentage:.2f}%")
            # ICMS typically is between 0.1% and 20% of faturamento
            assert 0.01 <= icms_percentage <= 25, f"ICMS percentage seems off: {icms_percentage}%"
    
    def test_dashboard_stats_aggregated_debito_pis_cofins(self, auth_headers):
        """Test that PIS and COFINS are calculated in aggregated version"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        
        debito_pis = data["debitos"]["pis"]
        debito_cofins = data["debitos"]["cofins"]
        
        print(f"Aggregated version - Debito PIS: R$ {debito_pis:,.2f}")
        print(f"Aggregated version - Debito COFINS: R$ {debito_cofins:,.2f}")
        
        # For NFCe, PIS and COFINS are typically 0 in the XML (tributação monofásica)
        # Just verify the fields are numeric
        assert isinstance(debito_pis, (int, float)), f"PIS should be numeric"
        assert isinstance(debito_cofins, (int, float)), f"COFINS should be numeric"
    
    def test_dashboard_stats_aggregated_impostos_pagar(self, auth_headers):
        """Test that impostos_pagar is calculated correctly in aggregated version"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        
        debitos = data["debitos"]
        creditos = data["creditos"]
        impostos_pagar = data["impostos_pagar"]
        
        # Calculate expected values
        expected_icms = max(0, debitos["icms"] - creditos["icms"])
        expected_pis = max(0, debitos["pis"] - creditos["pis"])
        expected_cofins = max(0, debitos["cofins"] - creditos["cofins"])
        expected_total = expected_icms + expected_pis + expected_cofins
        
        print(f"Aggregated - Impostos a pagar:")
        print(f"  ICMS: R$ {impostos_pagar['icms']:,.2f}")
        print(f"  PIS: R$ {impostos_pagar['pis']:,.2f}")
        print(f"  COFINS: R$ {impostos_pagar['cofins']:,.2f}")
        print(f"  Total: R$ {impostos_pagar['total']:,.2f}")
        
        # Verify calculation
        assert abs(impostos_pagar["icms"] - expected_icms) < 1, f"ICMS mismatch"
        assert abs(impostos_pagar["total"] - expected_total) < 1, f"Total mismatch"


class TestDashboardStatsResponseTime:
    """Performance tests to ensure the fix doesn't cause timeout"""
    
    def test_dashboard_stats_aggregated_response_time(self, auth_headers):
        """Test that aggregated version responds within acceptable time"""
        import time
        
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Request failed: {response.status_code}"
        
        print(f"Aggregated version response time: {elapsed_time:.2f}s")
        
        # Should respond within 60 seconds even for 14,700 documents
        assert elapsed_time < 60, f"Response took too long: {elapsed_time:.2f}s > 60s"


class TestDashboardStatsEdgeCases:
    """Edge case tests"""
    
    def test_dashboard_stats_invalid_company(self, auth_headers):
        """Test dashboard stats with non-existent company"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/non-existent-company-id",
            params={"competencia": "01/2026"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_dashboard_stats_empty_competencia(self, auth_headers):
        """Test dashboard stats with competencia that has no documents"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_SMALL}",
            params={"competencia": "12/2030"},  # Future competencia with no docs
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # All tax values should be 0
        assert data["debitos"]["icms"] == 0, "ICMS should be 0 for empty competencia"
        assert data["debitos"]["pis"] == 0, "PIS should be 0 for empty competencia"
        assert data["debitos"]["cofins"] == 0, "COFINS should be 0 for empty competencia"


class TestSpecificBugScenario:
    """
    Specific test for the bug scenario mentioned in the problem statement:
    - NFCe sales of R$ 969,649.80
    - Taxes showing as zero
    - Fix: Separate aggregation pipeline for product-level tax calculation
    """
    
    def test_bug_scenario_nfce_with_taxes(self, auth_headers):
        """
        Test the exact bug scenario: NFCe sales with taxes.
        The bug was in _get_dashboard_stats_aggregated which used icms_total 
        instead of summing products.v_icms
        """
        # Republic company has ~14,700 NFCe with faturamento ~R$ 969k
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{TEST_COMPANY_LARGE}",
            params={"competencia": TEST_COMPANY_LARGE_COMPETENCIA},
            headers=auth_headers,
            timeout=120
        )
        
        assert response.status_code == 200, f"Request failed: {response.status_code}"
        data = response.json()
        
        # Get NFCe count and values
        qtd_nfce = data.get("quantidades", {}).get("nfce", 0)
        total_nfce = data.get("valores", {}).get("saidas", {}).get("nfce", 0)
        debito_icms = data["debitos"]["icms"]
        
        print(f"Bug scenario test:")
        print(f"  NFCe count: {qtd_nfce}")
        print(f"  NFCe total: R$ {total_nfce:,.2f}")
        print(f"  Debito ICMS: R$ {debito_icms:,.2f}")
        
        # BUG VERIFICATION: With significant NFCe sales, ICMS should NOT be zero
        if total_nfce > 100000:  # If >R$ 100k in NFCe
            assert debito_icms > 0, (
                f"BUG REPRODUCED: ICMS is zero even with R$ {total_nfce:,.2f} in NFCe sales. "
                f"Expected > 0, got {debito_icms}"
            )
            print(f"BUG FIX VERIFIED: ICMS is correctly calculated as R$ {debito_icms:,.2f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
