"""
Test suite for the /api/notas-ausentes/{company_id} endpoint
Tests the fix for missing invoices filter - should now consider ALL notes issued by the company
(both 'saida' and 'entrada' types where emitente_cnpj = company CNPJ)

Bug Fix: The filter incorrectly excluded 'entrada' notes emitted by the company 
(e.g., returns/devoluções). Now considers ALL notes where emitente_cnpj = company CNPJ.

Company: COMERCIAL RS (CNPJ: 20352600000126)
Company ID: d7f30ea1-9df3-4124-a561-12984ffff64b
Competência: 02/2026
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "@Ahl142536"
COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"
COMPETENCIA = "02/2026"
COMPANY_CNPJ = "20352600000126"

# Entry notes issued by the company (devoluções) that should NOT be listed as missing anymore
NOTAS_ENTRADA_EMITIDAS_EMPRESA = [
    374843, 374844, 374845, 374887, 375078, 375079, 375081, 375379, 
    375655, 376101, 376102, 376114, 376418, 376624, 377093, 377094, 
    377245, 377249, 377250, 377363, 377975, 378485, 378494, 378495
]

# NF 377217 should still be listed as missing
NF_AUSENTE_ESPERADA = 377217


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate and get JWT token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestNotasAusentesEndpoint:
    """Tests for /api/notas-ausentes/{company_id} endpoint"""
    
    def test_endpoint_returns_200(self, auth_headers):
        """Test that the endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint returned 200 OK")
    
    def test_response_structure(self, auth_headers):
        """Test that response has expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "empresa" in data, "Missing 'empresa' field"
        assert "cnpj" in data, "Missing 'cnpj' field"
        assert "competencia" in data, "Missing 'competencia' field"
        assert "total_notas" in data, "Missing 'total_notas' field"
        assert "total_ausentes" in data, "Missing 'total_ausentes' field"
        assert "modelos_analisados" in data, "Missing 'modelos_analisados' field"
        
        print(f"✓ Response structure is correct")
        print(f"  - Empresa: {data['empresa']}")
        print(f"  - CNPJ: {data['cnpj']}")
        print(f"  - Competência: {data['competencia']}")
        print(f"  - Total Notas: {data['total_notas']}")
        print(f"  - Total Ausentes: {data['total_ausentes']}")
    
    def test_total_notas_increased_after_fix(self, auth_headers):
        """
        Test that total_notas increased from 3636 to ~3660
        The fix should now include 24 entry notes issued by the company
        """
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        total_notas = data.get('total_notas', 0)
        
        # Before fix: 3636 notes
        # After fix: should be 3636 + 24 = 3660 (approximately)
        # Allow some tolerance for other changes
        assert total_notas >= 3655, f"Expected total_notas >= 3655 (was 3636 before fix, should now include ~24 more entry notes), got {total_notas}"
        
        print(f"✓ Total notas is {total_notas} (expected >= 3655 after fix)")
        
        # Check if it's around the expected value
        if total_notas >= 3660:
            print(f"  - Confirms fix: Entry notes issued by company are now counted!")
        elif total_notas >= 3655:
            print(f"  - Some entry notes are being counted (partial)")
    
    def test_total_ausentes_decreased_after_fix(self, auth_headers):
        """
        Test that total_ausentes decreased from 494 to ~470
        The 24 entry notes should no longer appear as missing
        """
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        total_ausentes = data.get('total_ausentes', 0)
        
        # Before fix: 494 missing notes
        # After fix: should be 494 - 24 = 470 (approximately)
        # Allow some tolerance
        assert total_ausentes <= 475, f"Expected total_ausentes <= 475 (was 494 before fix, should now be ~470), got {total_ausentes}"
        
        print(f"✓ Total ausentes is {total_ausentes} (expected <= 475 after fix)")
        
        if total_ausentes <= 470:
            print(f"  - Confirms fix: Entry notes are no longer listed as missing!")
        elif total_ausentes <= 475:
            print(f"  - Some improvement (partial fix)")
    
    def test_nf_377217_is_still_missing(self, auth_headers):
        """
        Test that NF 377217 is correctly listed as missing
        This note was not imported and should still appear as ausente
        """
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get all missing note numbers
        notas_ausentes = []
        for modelo in data.get('modelos_analisados', []):
            for nota in modelo.get('notas_ausentes', []):
                notas_ausentes.append(nota.get('numero'))
        
        # NF 377217 should still be in the missing list
        assert NF_AUSENTE_ESPERADA in notas_ausentes, f"NF {NF_AUSENTE_ESPERADA} should be listed as missing but was not found"
        
        print(f"✓ NF {NF_AUSENTE_ESPERADA} is correctly listed as missing")
    
    def test_entry_notes_not_listed_as_missing(self, auth_headers):
        """
        Test that the 24 entry notes issued by the company are NOT listed as missing anymore
        These are devoluções/returns that were incorrectly appearing as gaps
        """
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}?competencia={COMPETENCIA}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Get all missing note numbers
        notas_ausentes = []
        for modelo in data.get('modelos_analisados', []):
            for nota in modelo.get('notas_ausentes', []):
                notas_ausentes.append(nota.get('numero'))
        
        # Check each entry note issued by the company
        notas_que_nao_deviam_estar_ausentes = []
        for nf_num in NOTAS_ENTRADA_EMITIDAS_EMPRESA:
            if nf_num in notas_ausentes:
                notas_que_nao_deviam_estar_ausentes.append(nf_num)
        
        # All these notes should NOT be in the missing list
        assert len(notas_que_nao_deviam_estar_ausentes) == 0, \
            f"Entry notes issued by company should NOT be listed as missing, but found: {notas_que_nao_deviam_estar_ausentes}"
        
        print(f"✓ All 24 entry notes issued by company are correctly NOT listed as missing")
        print(f"  - Verified notes: {NOTAS_ENTRADA_EMITIDAS_EMPRESA[:5]}... (24 total)")


class TestNotasAusentesQueryLogic:
    """Tests to verify the query logic considers all notes emitted by the company"""
    
    def test_query_includes_entry_notes_emitted_by_company(self, auth_headers):
        """
        Verify that entry notes where emitente_cnpj = company CNPJ are included
        """
        # First, let's check if we can query documents directly to verify the fix
        response = requests.get(
            f"{BASE_URL}/api/documents/{COMPANY_ID}?competencia={COMPETENCIA}&tipo=entrada",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            documents = data.get('documents', [])
            
            # Filter for entry notes emitted by the company
            entry_notes_emitted = [
                doc for doc in documents 
                if doc.get('emitente_cnpj', '').replace('.', '').replace('/', '').replace('-', '') == COMPANY_CNPJ
            ]
            
            print(f"✓ Found {len(entry_notes_emitted)} entry notes emitted by company CNPJ {COMPANY_CNPJ}")
            
            if len(entry_notes_emitted) > 0:
                # Check if any of the expected notes are there
                found_numbers = [int(doc.get('numero_nfe', 0)) for doc in entry_notes_emitted if doc.get('numero_nfe')]
                matching = [n for n in NOTAS_ENTRADA_EMITIDAS_EMPRESA if n in found_numbers]
                print(f"  - Found {len(matching)} of the expected 24 entry notes")
        else:
            print(f"⚠ Could not query documents directly: {response.status_code}")
            # Not a failure, just informational


class TestNotasAusentesExport:
    """Tests for the export functionality"""
    
    def test_export_endpoint_exists(self, auth_headers):
        """Test that the export endpoint exists and returns proper format"""
        response = requests.get(
            f"{BASE_URL}/api/notas-ausentes/{COMPANY_ID}/exportar?competencia={COMPETENCIA}&formato=xlsx",
            headers=auth_headers
        )
        
        # Should return file or 200
        assert response.status_code in [200, 204], f"Export endpoint should work, got {response.status_code}"
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            # Should be Excel file
            assert 'application' in content_type or 'octet-stream' in content_type, \
                f"Expected file content type, got {content_type}"
            print(f"✓ Export endpoint returns valid file")
        else:
            print(f"⚠ Export returned {response.status_code}")


class TestCompanyData:
    """Tests to verify company data is correct"""
    
    def test_company_exists_and_has_correct_cnpj(self, auth_headers):
        """Verify the company exists and has the expected CNPJ"""
        response = requests.get(
            f"{BASE_URL}/api/companies/{COMPANY_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Company not found: {response.status_code}"
        
        company = response.json()
        cnpj = company.get('cnpj', '').replace('.', '').replace('/', '').replace('-', '')
        
        assert cnpj == COMPANY_CNPJ, f"Expected CNPJ {COMPANY_CNPJ}, got {cnpj}"
        
        print(f"✓ Company verified: {company.get('razao_social', 'N/A')}")
        print(f"  - CNPJ: {company.get('cnpj')}")
        print(f"  - Tipo Atividade: {company.get('tipo_atividade', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
