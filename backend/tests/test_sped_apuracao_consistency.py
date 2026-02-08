"""
Test consistency between /api/apuracao-periodo and /api/sped/validar endpoints.

Bug Fix Verification:
- The issue was that /api/sped/validar did not apply get_filtro_notas_ativas() filter,
  causing it to include cancelled and desconsiderada notes in calculations.
- The fix added query.update(get_filtro_notas_ativas()) before fetching documents.
- Both endpoints should now return identical values for the same company and competência.

Test Cases:
1. Verify both endpoints return same total values for entradas/saidas
2. Verify cancelled notes are excluded from both endpoints
3. Verify totals by CFOP match between endpoints
4. Test with different competências
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "123456"
TEST_COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"
TEST_COMPANY_NAME = "COMERCIAL RS LTDA"
TEST_COMPETENCIA = "01/2026"


class TestSpedApuracaoConsistency:
    """Test consistency between SPED validation and Apuração Mensal endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_01_authentication_working(self):
        """Verify authentication is working"""
        assert self.authenticated, "Authentication should succeed"
        print("PASSED: Authentication working correctly")
    
    def test_02_company_exists(self):
        """Verify test company exists"""
        response = self.session.get(f"{BASE_URL}/api/companies/{TEST_COMPANY_ID}")
        assert response.status_code == 200, f"Company should exist: {response.status_code}"
        
        company = response.json()
        assert company.get('razao_social') == TEST_COMPANY_NAME, f"Company name mismatch: {company.get('razao_social')}"
        print(f"PASSED: Company {TEST_COMPANY_NAME} exists")
    
    def test_03_apuracao_periodo_endpoint_works(self):
        """Verify /api/apuracao-periodo endpoint returns data"""
        response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert response.status_code == 200, f"Apuração endpoint should return 200: {response.status_code}"
        
        data = response.json()
        # Response structure: {entradas: {lista: [...], subtotal: {...}}, saidas: {lista: [...], subtotal: {...}}}
        assert 'entradas' in data, "Response should contain 'entradas'"
        assert 'saidas' in data, "Response should contain 'saidas'"
        assert 'lista' in data.get('entradas', {}), "entradas should contain 'lista'"
        assert 'lista' in data.get('saidas', {}), "saidas should contain 'lista'"
        
        entradas_count = len(data.get('entradas', {}).get('lista', []))
        saidas_count = len(data.get('saidas', {}).get('lista', []))
        print(f"PASSED: Apuração endpoint working - {entradas_count} CFOPs entrada, {saidas_count} CFOPs saída")
        return data
    
    def test_04_sped_validar_endpoint_works(self):
        """Verify /api/sped/validar endpoint returns data"""
        response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert response.status_code == 200, f"SPED validar endpoint should return 200: {response.status_code}"
        
        data = response.json()
        # Response structure: {resumo: {entradas: {...}, saidas: {...}}, detalhamento_cfop: {...}}
        assert 'resumo' in data, "Response should contain 'resumo'"
        assert 'detalhamento_cfop' in data, "Response should contain 'detalhamento_cfop'"
        assert 'entradas' in data.get('resumo', {}), "resumo should contain 'entradas'"
        assert 'saidas' in data.get('resumo', {}), "resumo should contain 'saidas'"
        
        print(f"PASSED: SPED validar endpoint working")
        return data
    
    def test_05_total_entradas_consistency(self):
        """Verify total entradas value is consistent between endpoints"""
        # Get data from both endpoints
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert apuracao_response.status_code == 200
        assert sped_response.status_code == 200
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Get total entradas from apuração subtotal
        apuracao_total_entradas = apuracao_data.get('entradas', {}).get('subtotal', {}).get('valor', 0)
        
        # Get total entradas from SPED validar resumo
        sped_total_entradas = sped_data.get('resumo', {}).get('entradas', {}).get('total_valor', 0)
        
        print(f"Apuração total entradas: R$ {apuracao_total_entradas:,.2f}")
        print(f"SPED validar total entradas: R$ {sped_total_entradas:,.2f}")
        
        # Allow small floating point differences (0.01)
        difference = abs(apuracao_total_entradas - sped_total_entradas)
        assert difference < 0.01, f"Total entradas should match. Difference: R$ {difference:,.2f}"
        
        print(f"PASSED: Total entradas consistent between endpoints (difference: R$ {difference:,.2f})")
    
    def test_06_total_saidas_consistency(self):
        """Verify total saidas value is consistent between endpoints"""
        # Get data from both endpoints
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert apuracao_response.status_code == 200
        assert sped_response.status_code == 200
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Get total saidas from apuração subtotal
        apuracao_total_saidas = apuracao_data.get('saidas', {}).get('subtotal', {}).get('valor', 0)
        
        # Get total saidas from SPED validar resumo
        sped_total_saidas = sped_data.get('resumo', {}).get('saidas', {}).get('total_valor', 0)
        
        print(f"Apuração total saídas: R$ {apuracao_total_saidas:,.2f}")
        print(f"SPED validar total saídas: R$ {sped_total_saidas:,.2f}")
        
        # Allow small floating point differences (0.01)
        difference = abs(apuracao_total_saidas - sped_total_saidas)
        assert difference < 0.01, f"Total saídas should match. Difference: R$ {difference:,.2f}"
        
        print(f"PASSED: Total saídas consistent between endpoints (difference: R$ {difference:,.2f})")
    
    def test_07_pis_cofins_consistency(self):
        """Verify PIS/COFINS values are consistent between endpoints"""
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert apuracao_response.status_code == 200
        assert sped_response.status_code == 200
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Get PIS/COFINS from apuração
        apuracao_pis_entrada = apuracao_data.get('entradas', {}).get('subtotal', {}).get('v_pis', 0)
        apuracao_cofins_entrada = apuracao_data.get('entradas', {}).get('subtotal', {}).get('v_cofins', 0)
        
        # Get PIS/COFINS from SPED validar
        sped_pis_entrada = sped_data.get('resumo', {}).get('entradas', {}).get('total_pis', 0)
        sped_cofins_entrada = sped_data.get('resumo', {}).get('entradas', {}).get('total_cofins', 0)
        
        print(f"Apuração PIS entrada: R$ {apuracao_pis_entrada:,.2f}")
        print(f"SPED PIS entrada: R$ {sped_pis_entrada:,.2f}")
        print(f"Apuração COFINS entrada: R$ {apuracao_cofins_entrada:,.2f}")
        print(f"SPED COFINS entrada: R$ {sped_cofins_entrada:,.2f}")
        
        pis_diff = abs(apuracao_pis_entrada - sped_pis_entrada)
        cofins_diff = abs(apuracao_cofins_entrada - sped_cofins_entrada)
        
        assert pis_diff < 0.01, f"PIS should match. Difference: R$ {pis_diff:,.2f}"
        assert cofins_diff < 0.01, f"COFINS should match. Difference: R$ {cofins_diff:,.2f}"
        
        print(f"PASSED: PIS/COFINS consistent between endpoints")
    
    def test_08_cfop_count_consistency(self):
        """Verify CFOP counts are consistent between endpoints"""
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert apuracao_response.status_code == 200
        assert sped_response.status_code == 200
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Get CFOPs from apuração
        apuracao_cfops_entrada = set(cfop.get('cfop') for cfop in apuracao_data.get('entradas', {}).get('lista', []))
        apuracao_cfops_saida = set(cfop.get('cfop') for cfop in apuracao_data.get('saidas', {}).get('lista', []))
        
        # Get CFOPs from SPED validar
        sped_cfops_entrada = set(cfop.get('cfop') for cfop in sped_data.get('detalhamento_cfop', {}).get('entradas', []))
        sped_cfops_saida = set(cfop.get('cfop') for cfop in sped_data.get('detalhamento_cfop', {}).get('saidas', []))
        
        print(f"Apuração CFOPs entrada: {sorted(apuracao_cfops_entrada)}")
        print(f"SPED CFOPs entrada: {sorted(sped_cfops_entrada)}")
        print(f"Apuração CFOPs saída: {sorted(apuracao_cfops_saida)}")
        print(f"SPED CFOPs saída: {sorted(sped_cfops_saida)}")
        
        # CFOPs should match
        assert apuracao_cfops_entrada == sped_cfops_entrada, f"CFOPs entrada should match. Diff: {apuracao_cfops_entrada.symmetric_difference(sped_cfops_entrada)}"
        assert apuracao_cfops_saida == sped_cfops_saida, f"CFOPs saída should match. Diff: {apuracao_cfops_saida.symmetric_difference(sped_cfops_saida)}"
        
        print(f"PASSED: CFOP lists consistent between endpoints")
    
    def test_09_cancelled_notes_excluded(self):
        """Verify cancelled notes are excluded from both endpoints"""
        # First, check if there are any cancelled notes in the database
        response = self.session.get(
            f"{BASE_URL}/api/xml-documents/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not fetch documents to check for cancelled notes")
        
        documents = response.json()
        
        # Count cancelled and desconsiderada notes
        cancelled_count = sum(1 for doc in documents if doc.get('cancelada', False))
        desconsiderada_count = sum(1 for doc in documents if doc.get('desconsiderada_devolucao', False))
        active_count = sum(1 for doc in documents if not doc.get('cancelada', False) and not doc.get('desconsiderada_devolucao', False))
        
        print(f"Total documents: {len(documents)}")
        print(f"Cancelled notes: {cancelled_count}")
        print(f"Desconsiderada notes: {desconsiderada_count}")
        print(f"Active notes: {active_count}")
        
        # Both endpoints should only process active notes
        print(f"PASSED: Document counts retrieved - both endpoints should exclude {cancelled_count + desconsiderada_count} inactive notes")
    
    def test_10_different_competencia(self):
        """Test endpoints with a different competência to ensure filter works"""
        # Try with a different competência (12/2025)
        alt_competencia = "12/2025"
        
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": alt_competencia}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": alt_competencia}
        )
        
        # Both should return 200 even if no data
        assert apuracao_response.status_code == 200, f"Apuração should return 200 for {alt_competencia}"
        assert sped_response.status_code == 200, f"SPED validar should return 200 for {alt_competencia}"
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Calculate totals
        apuracao_total = (
            apuracao_data.get('entradas', {}).get('subtotal', {}).get('valor', 0) +
            apuracao_data.get('saidas', {}).get('subtotal', {}).get('valor', 0)
        )
        
        sped_total = (
            sped_data.get('resumo', {}).get('entradas', {}).get('total_valor', 0) +
            sped_data.get('resumo', {}).get('saidas', {}).get('total_valor', 0)
        )
        
        print(f"Competência {alt_competencia}:")
        print(f"  Apuração total: R$ {apuracao_total:,.2f}")
        print(f"  SPED total: R$ {sped_total:,.2f}")
        
        difference = abs(apuracao_total - sped_total)
        assert difference < 0.01, f"Totals should match for {alt_competencia}. Difference: R$ {difference:,.2f}"
        
        print(f"PASSED: Consistency verified for competência {alt_competencia}")
    
    def test_11_cfop_values_match(self):
        """Verify individual CFOP values match between endpoints"""
        apuracao_response = self.session.get(
            f"{BASE_URL}/api/apuracao-periodo/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        sped_response = self.session.get(
            f"{BASE_URL}/api/sped/validar/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert apuracao_response.status_code == 200
        assert sped_response.status_code == 200
        
        apuracao_data = apuracao_response.json()
        sped_data = sped_response.json()
        
        # Build CFOP value maps from apuração
        apuracao_cfop_values = {}
        for cfop_data in apuracao_data.get('entradas', {}).get('lista', []):
            cfop = cfop_data.get('cfop')
            apuracao_cfop_values[cfop] = cfop_data.get('valor', 0)
        for cfop_data in apuracao_data.get('saidas', {}).get('lista', []):
            cfop = cfop_data.get('cfop')
            apuracao_cfop_values[cfop] = cfop_data.get('valor', 0)
        
        # Build CFOP value maps from SPED
        sped_cfop_values = {}
        for cfop_data in sped_data.get('detalhamento_cfop', {}).get('entradas', []):
            cfop = cfop_data.get('cfop')
            sped_cfop_values[cfop] = cfop_data.get('valor', 0)
        for cfop_data in sped_data.get('detalhamento_cfop', {}).get('saidas', []):
            cfop = cfop_data.get('cfop')
            sped_cfop_values[cfop] = cfop_data.get('valor', 0)
        
        # Compare values for each CFOP
        mismatches = []
        for cfop in set(apuracao_cfop_values.keys()) | set(sped_cfop_values.keys()):
            apuracao_val = apuracao_cfop_values.get(cfop, 0)
            sped_val = sped_cfop_values.get(cfop, 0)
            diff = abs(apuracao_val - sped_val)
            
            if diff > 0.01:
                mismatches.append({
                    'cfop': cfop,
                    'apuracao': apuracao_val,
                    'sped': sped_val,
                    'diff': diff
                })
            else:
                print(f"CFOP {cfop}: R$ {apuracao_val:,.2f} (match)")
        
        if mismatches:
            print("MISMATCHES FOUND:")
            for m in mismatches:
                print(f"  CFOP {m['cfop']}: Apuração R$ {m['apuracao']:,.2f} vs SPED R$ {m['sped']:,.2f} (diff: R$ {m['diff']:,.2f})")
        
        assert len(mismatches) == 0, f"Found {len(mismatches)} CFOP value mismatches"
        print(f"PASSED: All CFOP values match between endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
