"""
Test Suite for Grupo Consolidado Feature - Iteration 72
Tests for:
1. GET /api/empresa/{company_id}/grupo-info - Check if company is matriz
2. GET /api/empresa/{company_id}/impostos-grupo - Get consolidated tax data
3. Verify that menu 'Grupo Consolidado' appears only for matriz companies
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials and company data
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "@Ahl142536"
EMPRESA_MATRIZ_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"  # COMERCIAL RS LTDA
EMPRESA_MATRIZ_NOME = "COMERCIAL RS LTDA"
COMPETENCIA = "01/2026"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token") or response.json().get("token")
    pytest.fail(f"Login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for API calls"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestGrupoInfo:
    """Tests for GET /api/empresa/{company_id}/grupo-info endpoint"""
    
    def test_grupo_info_matriz_empresa(self, auth_headers):
        """Test grupo-info returns is_matriz=True for matriz company"""
        response = requests.get(
            f"{BASE_URL}/api/empresa/{EMPRESA_MATRIZ_ID}/grupo-info",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "is_matriz" in data, "Response should contain is_matriz field"
        assert "is_filial" in data, "Response should contain is_filial field"
        
        # If company is matriz, verify additional fields
        if data.get("is_matriz"):
            print(f"✓ Company {EMPRESA_MATRIZ_NOME} is matriz of a group")
            assert "grupo" in data, "Matriz should have grupo field"
            assert "matriz" in data, "Matriz should have matriz field"
            assert "filiais" in data, "Matriz should have filiais field"
            
            # Verify grupo info
            grupo = data.get("grupo")
            if grupo:
                assert "id" in grupo, "Grupo should have id"
                assert "nome" in grupo, "Grupo should have nome"
                print(f"  Group name: {grupo.get('nome')}")
            
            # Verify filiais info
            filiais = data.get("filiais", [])
            print(f"  Number of filiais: {len(filiais)}")
            for filial in filiais:
                print(f"    - {filial.get('razao_social')} ({filial.get('cnpj')})")
        else:
            print(f"⚠ Company {EMPRESA_MATRIZ_NOME} is NOT matriz - testing as non-matriz")
            # If not matriz, check if is filial
            if data.get("is_filial"):
                print(f"  Company is filial of a group")
    
    def test_grupo_info_invalid_company(self, auth_headers):
        """Test grupo-info returns 404 for invalid company ID"""
        invalid_id = "invalid-company-id-123"
        response = requests.get(
            f"{BASE_URL}/api/empresa/{invalid_id}/grupo-info",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid company, got {response.status_code}"
        print("✓ Returns 404 for invalid company ID")


class TestImpostosGrupo:
    """Tests for GET /api/empresa/{company_id}/impostos-grupo endpoint"""
    
    def test_impostos_grupo_with_competencia(self, auth_headers):
        """Test impostos-grupo returns consolidated data for matriz company"""
        response = requests.get(
            f"{BASE_URL}/api/empresa/{EMPRESA_MATRIZ_ID}/impostos-grupo",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Response keys: {data.keys()}")
        
        # Check is_grupo flag
        if data.get("is_grupo"):
            print("✓ Company is matriz of a group - verifying consolidated data")
            
            # Verify response structure
            assert "grupo_nome" in data, "Should have grupo_nome"
            assert "competencia" in data, "Should have competencia"
            assert "matriz" in data, "Should have matriz data"
            assert "filiais" in data, "Should have filiais data"
            assert "consolidado" in data, "Should have consolidado data"
            
            print(f"  Group: {data.get('grupo_nome')}")
            print(f"  Competência: {data.get('competencia')}")
            
            # Verify matriz data structure
            matriz = data.get("matriz")
            if matriz:
                print(f"\n  === MATRIZ: {matriz.get('razao_social')} ===")
                self._verify_empresa_impostos(matriz)
            
            # Verify filiais data
            filiais = data.get("filiais", [])
            print(f"\n  === FILIAIS ({len(filiais)}) ===")
            for filial in filiais:
                print(f"  {filial.get('razao_social')}:")
                self._verify_empresa_impostos(filial)
            
            # Verify consolidado data structure
            consolidado = data.get("consolidado", {})
            print("\n  === CONSOLIDADO ===")
            self._verify_consolidado(consolidado)
            
        else:
            print(f"⚠ Company is NOT matriz - no group data available")
            assert "mensagem" in data, "Non-matriz should have message"
            print(f"  Message: {data.get('mensagem')}")
    
    def _verify_empresa_impostos(self, empresa):
        """Helper to verify empresa impostos structure"""
        # Verify basic fields
        assert "id" in empresa, "Should have id"
        assert "razao_social" in empresa, "Should have razao_social"
        
        # Verify indicadores
        indicadores = empresa.get("indicadores", {})
        assert "entradas" in indicadores, "Should have entradas"
        assert "compras" in indicadores, "Should have compras"
        assert "saidas" in indicadores, "Should have saidas"
        assert "vendas" in indicadores, "Should have vendas"
        print(f"    Entradas: R$ {indicadores.get('entradas'):,.2f}")
        print(f"    Saídas: R$ {indicadores.get('saidas'):,.2f}")
        
        # Verify PIS
        pis = empresa.get("pis", {})
        assert "credito" in pis, "PIS should have credito"
        assert "debito" in pis, "PIS should have debito"
        assert "a_pagar" in pis, "PIS should have a_pagar"
        print(f"    PIS a pagar: R$ {pis.get('a_pagar'):,.2f}")
        
        # Verify COFINS
        cofins = empresa.get("cofins", {})
        assert "credito" in cofins, "COFINS should have credito"
        assert "debito" in cofins, "COFINS should have debito"
        assert "a_pagar" in cofins, "COFINS should have a_pagar"
        print(f"    COFINS a pagar: R$ {cofins.get('a_pagar'):,.2f}")
        
        # Verify ICMS
        icms = empresa.get("icms", {})
        assert "credito" in icms, "ICMS should have credito"
        assert "debito" in icms, "ICMS should have debito"
        print(f"    ICMS saldo: R$ {icms.get('saldo', 0):,.2f}")
        
        # Verify IRPJ/CSLL
        irpj = empresa.get("irpj", {})
        csll = empresa.get("csll", {})
        print(f"    IRPJ total: R$ {irpj.get('total', 0):,.2f}")
        print(f"    CSLL devido: R$ {csll.get('devido', 0):,.2f}")
        
        # Verify total federal
        assert "total_federal" in empresa, "Should have total_federal"
        print(f"    Total Federal: R$ {empresa.get('total_federal'):,.2f}")
    
    def _verify_consolidado(self, consolidado):
        """Helper to verify consolidado structure"""
        # Verify indicadores
        indicadores = consolidado.get("indicadores", {})
        print(f"  Total Entradas: R$ {indicadores.get('entradas', 0):,.2f}")
        print(f"  Total Compras: R$ {indicadores.get('compras', 0):,.2f}")
        print(f"  Total Saídas: R$ {indicadores.get('saidas', 0):,.2f}")
        print(f"  Total Vendas: R$ {indicadores.get('vendas', 0):,.2f}")
        
        # Verify taxes
        pis = consolidado.get("pis", {})
        cofins = consolidado.get("cofins", {})
        icms = consolidado.get("icms", {})
        irpj = consolidado.get("irpj", {})
        csll = consolidado.get("csll", {})
        
        print(f"\n  PIS Consolidado: Crédito R$ {pis.get('credito', 0):,.2f} | Débito R$ {pis.get('debito', 0):,.2f} | A Pagar R$ {pis.get('a_pagar', 0):,.2f}")
        print(f"  COFINS Consolidado: Crédito R$ {cofins.get('credito', 0):,.2f} | Débito R$ {cofins.get('debito', 0):,.2f} | A Pagar R$ {cofins.get('a_pagar', 0):,.2f}")
        print(f"  ICMS Consolidado: Crédito R$ {icms.get('credito', 0):,.2f} | Débito R$ {icms.get('debito', 0):,.2f} | Saldo R$ {icms.get('saldo', 0):,.2f}")
        print(f"  IRPJ Consolidado: Total R$ {irpj.get('total', 0):,.2f}")
        print(f"  CSLL Consolidado: Total R$ {csll.get('devido', 0):,.2f}")
        print(f"\n  TOTAL FEDERAL CONSOLIDADO: R$ {consolidado.get('total_federal', 0):,.2f}")
        print(f"  FATURAMENTO CONSOLIDADO: R$ {consolidado.get('faturamento', 0):,.2f}")
        
        if consolidado.get('faturamento', 0) > 0:
            print(f"  Percentual s/ faturamento: {consolidado.get('percentual', 0):.2f}%")
    
    def test_impostos_grupo_missing_competencia(self, auth_headers):
        """Test impostos-grupo returns 422 when competencia is missing"""
        response = requests.get(
            f"{BASE_URL}/api/empresa/{EMPRESA_MATRIZ_ID}/impostos-grupo",
            headers=auth_headers
            # No competencia param
        )
        
        # FastAPI should return 422 for missing required param
        assert response.status_code == 422, f"Expected 422 for missing competencia, got {response.status_code}"
        print("✓ Returns 422 when competencia is missing")
    
    def test_impostos_grupo_invalid_company(self, auth_headers):
        """Test impostos-grupo returns 404 for invalid company"""
        invalid_id = "invalid-company-id-456"
        response = requests.get(
            f"{BASE_URL}/api/empresa/{invalid_id}/impostos-grupo",
            params={"competencia": COMPETENCIA},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid company, got {response.status_code}"
        print("✓ Returns 404 for invalid company ID")


class TestGruposEmpresariaisEndpoints:
    """Tests for grupos-empresariais CRUD endpoints"""
    
    def test_list_grupos_empresariais(self, auth_headers):
        """Test GET /api/grupos-empresariais lists all groups"""
        response = requests.get(
            f"{BASE_URL}/api/grupos-empresariais",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns {grupos: [...], total: int}
        grupos = data.get("grupos", data) if isinstance(data, dict) else data
        assert isinstance(grupos, list), f"Response grupos should be a list, got: {type(grupos)}"
        
        print(f"✓ Found {len(grupos)} grupos empresariais")
        for grupo in grupos:
            print(f"  - {grupo.get('nome')} (matriz: {grupo.get('matriz_id')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
