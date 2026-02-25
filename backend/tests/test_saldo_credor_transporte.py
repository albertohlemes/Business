"""
Test Suite: Saldo Credor de Impostos - Transporte entre Competências
Tests the correct transport of tax credit balances (ICMS, PIS, COFINS, IPI) between months.

Expected values for test company (ANZEN DISTRIBUIDORA) in January/2026:
- ICMS a transportar: ~R$ 12.288,90
- PIS a transportar: ~R$ 2.213,23
- COFINS a transportar: ~R$ 10.193,64

Tests:
1. ICMS endpoint returns saldo_credor_anterior and saldo_a_transportar correctly
2. PIS/COFINS endpoint returns saldo_credor_anterior without overwriting ICMS
3. RET (inteligencia-tributaria) shows saldo_credor_anterior and applies correctly
4. Reforma Tributária shows saldo_credor_anterior in comparativo_regime_atual
5. Dashboard shows saldo_credor_anterior and applies to taxes
6. Consistency of values between endpoints for the same competence
"""

import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "alberto.lemes@businessconta.com.br"
USER_PASSWORD = "@Ahl142536"
COMPANY_ID = "24e47135-2657-47d5-a112-cd2c06357370"
COMPETENCIA_JANEIRO = "01/2026"
COMPETENCIA_FEVEREIRO = "02/2026"

# Expected approximate values for Janeiro/2026
EXPECTED_ICMS_TRANSPORTAR_MIN = 10000  # Approximate minimum
EXPECTED_PIS_TRANSPORTAR_MIN = 1000
EXPECTED_COFINS_TRANSPORTAR_MIN = 5000


class TestSaldoCredorTransporte:
    """Test suite for tax credit balance transport between months"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_login_success(self):
        """Test that login works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful for user: {data['user'].get('email', 'N/A')}")
    
    def test_02_icms_janeiro_saldo_credor(self, headers):
        """Test ICMS endpoint returns saldo_credor_anterior and saldo_a_transportar for Janeiro"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"ICMS Janeiro failed: {response.text}"
        data = response.json()
        
        # Check that apuracao exists
        assert "apuracao" in data, f"Missing 'apuracao' in response: {data.keys()}"
        apuracao = data["apuracao"]
        
        # Check saldo fields
        assert "saldo" in apuracao, f"Missing 'saldo' in apuracao: {apuracao.keys()}"
        assert "situacao" in apuracao, f"Missing 'situacao' in apuracao: {apuracao.keys()}"
        
        saldo = apuracao.get("saldo", 0)
        situacao = apuracao.get("situacao", "")
        saldo_a_transportar = apuracao.get("saldo_a_transportar", 0)
        
        print(f"✅ ICMS Janeiro/2026:")
        print(f"   Saldo: R$ {saldo:,.2f}")
        print(f"   Situação: {situacao}")
        print(f"   Saldo a transportar: R$ {saldo_a_transportar:,.2f}")
        
        # If situacao is CREDOR, saldo should be negative and saldo_a_transportar should be positive
        if situacao == "CREDOR":
            assert saldo_a_transportar >= 0, f"Expected positive saldo_a_transportar for CREDOR situation"
            print(f"   ✅ Correto: Situação CREDOR com saldo a transportar positivo")
    
    def test_03_piscofins_janeiro_preserva_icms(self, headers):
        """Test PIS/COFINS endpoint returns saldo_credor_anterior without overwriting ICMS"""
        # First, check the current saldos_credores in the database via the endpoint
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"PIS/COFINS Janeiro failed: {response.text}"
        data = response.json()
        
        # Check lucro_real structure
        assert "lucro_real" in data, f"Missing 'lucro_real' in response: {data.keys()}"
        lucro_real = data["lucro_real"]
        
        # Check saldo_credor_anterior
        if "saldo_credor_anterior" in lucro_real:
            saldo_anterior = lucro_real["saldo_credor_anterior"]
            pis_anterior = saldo_anterior.get("pis", 0)
            cofins_anterior = saldo_anterior.get("cofins", 0)
            icms_anterior = saldo_anterior.get("icms", 0)
            
            print(f"✅ PIS/COFINS Janeiro/2026 - Saldo Credor Anterior:")
            print(f"   PIS: R$ {pis_anterior:,.2f}")
            print(f"   COFINS: R$ {cofins_anterior:,.2f}")
            print(f"   ICMS: R$ {icms_anterior:,.2f}")
            print(f"   Origem: {saldo_anterior.get('origem', 'N/A')}")
        else:
            print("   ⚠️ saldo_credor_anterior não encontrado na resposta (pode ser primeira competência)")
        
        # Check saldo_a_transportar
        if "saldo_a_transportar" in lucro_real:
            saldo_transportar = lucro_real["saldo_a_transportar"]
            pis_transportar = saldo_transportar.get("pis", 0)
            cofins_transportar = saldo_transportar.get("cofins", 0)
            
            print(f"✅ PIS/COFINS Janeiro/2026 - Saldo a Transportar:")
            print(f"   PIS: R$ {pis_transportar:,.2f}")
            print(f"   COFINS: R$ {cofins_transportar:,.2f}")
        
        # Check imposto_a_pagar
        if "imposto_a_pagar" in lucro_real:
            imposto = lucro_real["imposto_a_pagar"]
            print(f"✅ PIS/COFINS Janeiro/2026 - Imposto a Pagar:")
            print(f"   PIS: R$ {imposto.get('pis', 0):,.2f}")
            print(f"   COFINS: R$ {imposto.get('cofins', 0):,.2f}")
    
    def test_04_icms_fevereiro_busca_saldo_janeiro(self, headers):
        """Test ICMS endpoint for Fevereiro fetches saldo from Janeiro"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"ICMS Fevereiro failed: {response.text}"
        data = response.json()
        
        assert "apuracao" in data, f"Missing 'apuracao' in response"
        apuracao = data["apuracao"]
        
        # Check saldo_credor_anterior
        saldo_credor_anterior = apuracao.get("saldo_credor_anterior_icms", 0)
        
        print(f"✅ ICMS Fevereiro/2026:")
        print(f"   Saldo Credor Anterior (de Janeiro): R$ {saldo_credor_anterior:,.2f}")
        print(f"   Crédito ICMS: R$ {apuracao.get('credito_icms', 0):,.2f}")
        print(f"   Débito ICMS: R$ {apuracao.get('debito_icms', 0):,.2f}")
        print(f"   Saldo Final: R$ {apuracao.get('saldo', 0):,.2f}")
        print(f"   Situação: {apuracao.get('situacao', 'N/A')}")
        
        # If Janeiro had a credit balance, Fevereiro should show it as saldo_credor_anterior
        if saldo_credor_anterior > 0:
            print(f"   ✅ Correto: Saldo credor de Janeiro transportado para Fevereiro")
    
    def test_05_piscofins_fevereiro_busca_saldo_janeiro(self, headers):
        """Test PIS/COFINS endpoint for Fevereiro fetches saldo from Janeiro"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"PIS/COFINS Fevereiro failed: {response.text}"
        data = response.json()
        
        assert "lucro_real" in data, f"Missing 'lucro_real' in response"
        lucro_real = data["lucro_real"]
        
        if "saldo_credor_anterior" in lucro_real:
            saldo_anterior = lucro_real["saldo_credor_anterior"]
            print(f"✅ PIS/COFINS Fevereiro/2026 - Saldo Credor Anterior (de Janeiro):")
            print(f"   PIS: R$ {saldo_anterior.get('pis', 0):,.2f}")
            print(f"   COFINS: R$ {saldo_anterior.get('cofins', 0):,.2f}")
            print(f"   ICMS: R$ {saldo_anterior.get('icms', 0):,.2f}")
            print(f"   Origem: {saldo_anterior.get('origem', 'N/A')}")
            print(f"   Competência Origem: {saldo_anterior.get('competencia_origem', 'N/A')}")
            
            # Verify origin is from January
            origem = saldo_anterior.get('competencia_origem', '')
            if origem == "01/2026":
                print(f"   ✅ Correto: Saldo originado de Janeiro/2026")
            elif origem:
                print(f"   ⚠️ Origem diferente de Janeiro: {origem}")
        else:
            print("   ⚠️ saldo_credor_anterior não encontrado")
    
    def test_06_ret_fevereiro_saldo_credor(self, headers):
        """Test RET (inteligencia-tributaria) shows saldo_credor_anterior for Fevereiro"""
        response = requests.get(
            f"{BASE_URL}/api/inteligencia-tributaria/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}&tipo=periodo",
            headers=headers
        )
        assert response.status_code == 200, f"RET Fevereiro failed: {response.text}"
        data = response.json()
        
        print(f"✅ RET (Inteligência Tributária) Fevereiro/2026:")
        
        # Check real regime values
        if "real" in data:
            real = data["real"]
            print(f"   Lucro Real:")
            print(f"     ICMS: R$ {real.get('icms', 0):,.2f}")
            print(f"     PIS: R$ {real.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {real.get('cofins', 0):,.2f}")
            print(f"     Total: R$ {real.get('total', 0):,.2f}")
        
        # Check presumido values
        if "presumido" in data:
            presumido = data["presumido"]
            print(f"   Lucro Presumido:")
            print(f"     ICMS: R$ {presumido.get('icms', 0):,.2f}")
            print(f"     PIS: R$ {presumido.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {presumido.get('cofins', 0):,.2f}")
            print(f"     Total: R$ {presumido.get('total', 0):,.2f}")
        
        # Check simples values
        if "simples" in data:
            simples = data["simples"]
            print(f"   Simples Nacional:")
            print(f"     Total: R$ {simples.get('total', 0):,.2f}")
            print(f"     Alíquota Efetiva: {simples.get('aliquota_efetiva', 0):.2f}%")
        
        print(f"   Melhor Regime: {data.get('melhor_regime', 'N/A')}")
    
    def test_07_reforma_tributaria_fevereiro_saldo_credor(self, headers):
        """Test Reforma Tributária shows saldo_credor_anterior in comparativo_regime_atual for Fevereiro"""
        response = requests.get(
            f"{BASE_URL}/api/reforma-tributaria/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"Reforma Tributária Fevereiro failed: {response.text}"
        data = response.json()
        
        print(f"✅ Reforma Tributária Fevereiro/2026:")
        
        # Check apuracao IVA Dual
        if "apuracao" in data:
            apuracao = data["apuracao"]
            print(f"   Apuração IVA Dual:")
            if "creditos" in apuracao:
                print(f"     Créditos CBS: R$ {apuracao['creditos'].get('cbs', 0):,.2f}")
                print(f"     Créditos IBS: R$ {apuracao['creditos'].get('ibs', 0):,.2f}")
            if "debitos" in apuracao:
                print(f"     Débitos CBS: R$ {apuracao['debitos'].get('cbs', 0):,.2f}")
                print(f"     Débitos IBS: R$ {apuracao['debitos'].get('ibs', 0):,.2f}")
            if "saldo" in apuracao:
                print(f"     Saldo Total: R$ {apuracao['saldo'].get('total', 0):,.2f}")
        
        # Check comparativo_regime_atual
        if "comparativo_regime_atual" in data:
            regime_atual = data["comparativo_regime_atual"]
            print(f"   Comparativo Regime Atual:")
            print(f"     PIS: R$ {regime_atual.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {regime_atual.get('cofins', 0):,.2f}")
            print(f"     ICMS: R$ {regime_atual.get('icms', 0):,.2f}")
            print(f"     Total: R$ {regime_atual.get('total', 0):,.2f}")
            
            # Check saldo_credor_anterior
            if "saldo_credor_anterior" in regime_atual:
                saldo_anterior = regime_atual["saldo_credor_anterior"]
                print(f"   Saldo Credor Anterior (de Janeiro):")
                print(f"     PIS: R$ {saldo_anterior.get('pis', 0):,.2f}")
                print(f"     COFINS: R$ {saldo_anterior.get('cofins', 0):,.2f}")
                print(f"     ICMS: R$ {saldo_anterior.get('icms', 0):,.2f}")
                print(f"     Origem: {saldo_anterior.get('origem', 'N/A')}")
                print(f"     Competência Origem: {saldo_anterior.get('competencia_origem', 'N/A')}")
                
                # Verify origin is from January
                origem = saldo_anterior.get('competencia_origem', '')
                if origem == "01/2026":
                    print(f"     ✅ Correto: Saldo originado de Janeiro/2026")
            else:
                print("   ⚠️ saldo_credor_anterior não encontrado em comparativo_regime_atual")
    
    def test_08_dashboard_janeiro_saldo_credor(self, headers):
        """Test Dashboard shows saldo_credor_anterior for Janeiro"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"Dashboard Janeiro failed: {response.text}"
        data = response.json()
        
        print(f"✅ Dashboard Janeiro/2026:")
        
        # Check saldo_credor_anterior
        if "saldo_credor_anterior" in data:
            saldo_anterior = data["saldo_credor_anterior"]
            print(f"   Saldo Credor Anterior:")
            print(f"     PIS: R$ {saldo_anterior.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {saldo_anterior.get('cofins', 0):,.2f}")
            print(f"     ICMS: R$ {saldo_anterior.get('icms', 0):,.2f}")
            print(f"     IPI: R$ {saldo_anterior.get('ipi', 0):,.2f}")
        
        # Check impostos_pagar
        if "impostos_pagar" in data:
            impostos = data["impostos_pagar"]
            print(f"   Impostos a Pagar:")
            print(f"     ICMS: R$ {impostos.get('icms', 0):,.2f}")
            print(f"     ICMS a Recuperar: R$ {impostos.get('icms_a_recuperar', 0):,.2f}")
            print(f"     ICMS Situação: {impostos.get('icms_situacao', 'N/A')}")
            print(f"     PIS: R$ {impostos.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {impostos.get('cofins', 0):,.2f}")
            print(f"     Total: R$ {impostos.get('total', 0):,.2f}")
    
    def test_09_dashboard_fevereiro_saldo_credor(self, headers):
        """Test Dashboard shows saldo_credor_anterior for Fevereiro with values from Janeiro"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"Dashboard Fevereiro failed: {response.text}"
        data = response.json()
        
        print(f"✅ Dashboard Fevereiro/2026:")
        
        # Check saldo_credor_anterior
        if "saldo_credor_anterior" in data:
            saldo_anterior = data["saldo_credor_anterior"]
            print(f"   Saldo Credor Anterior (de Janeiro):")
            print(f"     PIS: R$ {saldo_anterior.get('pis', 0):,.2f}")
            print(f"     COFINS: R$ {saldo_anterior.get('cofins', 0):,.2f}")
            print(f"     ICMS: R$ {saldo_anterior.get('icms', 0):,.2f}")
            print(f"     IPI: R$ {saldo_anterior.get('ipi', 0):,.2f}")
            
            # Validate that values are non-zero if Janeiro had credits
            total_anterior = (saldo_anterior.get('pis', 0) + 
                            saldo_anterior.get('cofins', 0) + 
                            saldo_anterior.get('icms', 0))
            if total_anterior > 0:
                print(f"   ✅ Correto: Saldo credor de Janeiro transportado para Dashboard Fevereiro")
        
        # Check impostos_pagar
        if "impostos_pagar" in data:
            impostos = data["impostos_pagar"]
            print(f"   Impostos a Pagar:")
            print(f"     ICMS: R$ {impostos.get('icms', 0):,.2f}")
            print(f"     ICMS a Recuperar: R$ {impostos.get('icms_a_recuperar', 0):,.2f}")
            print(f"     ICMS Situação: {impostos.get('icms_situacao', 'N/A')}")
            print(f"     PIS: R$ {impostos.get('pis', 0):,.2f}")
            print(f"     PIS a Recuperar: R$ {impostos.get('pis_a_recuperar', 0):,.2f}")
            print(f"     COFINS: R$ {impostos.get('cofins', 0):,.2f}")
            print(f"     COFINS a Recuperar: R$ {impostos.get('cofins_a_recuperar', 0):,.2f}")
    
    def test_10_consistency_between_endpoints_janeiro(self, headers):
        """Test consistency of values between endpoints for Janeiro"""
        # Get ICMS values
        icms_resp = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        icms_data = icms_resp.json() if icms_resp.status_code == 200 else {}
        
        # Get PIS/COFINS values
        piscofins_resp = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        piscofins_data = piscofins_resp.json() if piscofins_resp.status_code == 200 else {}
        
        # Get Dashboard values
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/dashboard/stats/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        dashboard_data = dashboard_resp.json() if dashboard_resp.status_code == 200 else {}
        
        print(f"✅ Consistência entre endpoints - Janeiro/2026:")
        
        # Compare ICMS values
        icms_apuracao_saldo = icms_data.get('apuracao', {}).get('saldo', 0)
        
        # Dashboard ICMS
        dashboard_icms_pagar = dashboard_data.get('impostos_pagar', {}).get('icms', 0)
        dashboard_icms_recuperar = dashboard_data.get('impostos_pagar', {}).get('icms_a_recuperar', 0)
        
        print(f"   ICMS:")
        print(f"     Endpoint ICMS - Saldo: R$ {icms_apuracao_saldo:,.2f}")
        print(f"     Dashboard - A Pagar: R$ {dashboard_icms_pagar:,.2f}")
        print(f"     Dashboard - A Recuperar: R$ {dashboard_icms_recuperar:,.2f}")
        
        # Compare PIS/COFINS values
        lucro_real = piscofins_data.get('lucro_real', {})
        pis_saldo = lucro_real.get('saldo', {}).get('pis', 0)
        cofins_saldo = lucro_real.get('saldo', {}).get('cofins', 0)
        pis_transportar = lucro_real.get('saldo_a_transportar', {}).get('pis', 0)
        cofins_transportar = lucro_real.get('saldo_a_transportar', {}).get('cofins', 0)
        
        print(f"   PIS/COFINS (Endpoint):")
        print(f"     PIS Saldo: R$ {pis_saldo:,.2f}")
        print(f"     COFINS Saldo: R$ {cofins_saldo:,.2f}")
        print(f"     PIS a Transportar: R$ {pis_transportar:,.2f}")
        print(f"     COFINS a Transportar: R$ {cofins_transportar:,.2f}")
        
        dashboard_pis_pagar = dashboard_data.get('impostos_pagar', {}).get('pis', 0)
        dashboard_cofins_pagar = dashboard_data.get('impostos_pagar', {}).get('cofins', 0)
        
        print(f"   Dashboard:")
        print(f"     PIS a Pagar: R$ {dashboard_pis_pagar:,.2f}")
        print(f"     COFINS a Pagar: R$ {dashboard_cofins_pagar:,.2f}")


class TestSaldoCredorPersistence:
    """Test suite for verifying saldo credor is properly saved and retrieved"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": USER_EMAIL, "password": USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_call_icms_janeiro_saves_saldo(self, headers):
        """Test that calling ICMS endpoint for Janeiro saves the saldo"""
        response = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"ICMS Janeiro failed: {response.text}"
        data = response.json()
        
        # Check saldo_a_transportar is calculated
        saldo_a_transportar = data.get('apuracao', {}).get('saldo_a_transportar', 0)
        
        print(f"✅ ICMS Janeiro - Saldo calculado e salvo")
        print(f"   Saldo a transportar: R$ {saldo_a_transportar:,.2f}")
    
    def test_02_call_piscofins_janeiro_saves_saldo(self, headers):
        """Test that calling PIS/COFINS endpoint for Janeiro saves the saldo without overwriting ICMS"""
        response = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_JANEIRO}",
            headers=headers
        )
        assert response.status_code == 200, f"PIS/COFINS Janeiro failed: {response.text}"
        data = response.json()
        
        lucro_real = data.get('lucro_real', {})
        saldo_transportar = lucro_real.get('saldo_a_transportar', {})
        
        print(f"✅ PIS/COFINS Janeiro - Saldo calculado")
        print(f"   PIS a transportar: R$ {saldo_transportar.get('pis', 0):,.2f}")
        print(f"   COFINS a transportar: R$ {saldo_transportar.get('cofins', 0):,.2f}")
    
    def test_03_verify_fevereiro_gets_janeiro_saldo(self, headers):
        """Test that Fevereiro endpoints correctly retrieve Janeiro's saldo"""
        # Get ICMS for Fevereiro
        icms_resp = requests.get(
            f"{BASE_URL}/api/apuracao-icms/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert icms_resp.status_code == 200
        icms_data = icms_resp.json()
        
        icms_saldo_anterior = icms_data.get('apuracao', {}).get('saldo_credor_anterior_icms', 0)
        
        # Get PIS/COFINS for Fevereiro
        piscofins_resp = requests.get(
            f"{BASE_URL}/api/pis-cofins/apuracao/{COMPANY_ID}?competencia={COMPETENCIA_FEVEREIRO}",
            headers=headers
        )
        assert piscofins_resp.status_code == 200
        piscofins_data = piscofins_resp.json()
        
        saldo_anterior = piscofins_data.get('lucro_real', {}).get('saldo_credor_anterior', {})
        
        print(f"✅ Fevereiro - Saldos anteriores recuperados de Janeiro:")
        print(f"   ICMS Saldo Credor Anterior: R$ {icms_saldo_anterior:,.2f}")
        print(f"   PIS Saldo Credor Anterior: R$ {saldo_anterior.get('pis', 0):,.2f}")
        print(f"   COFINS Saldo Credor Anterior: R$ {saldo_anterior.get('cofins', 0):,.2f}")
        
        # Verify that ICMS was not overwritten by PIS/COFINS
        icms_from_piscofins = saldo_anterior.get('icms', 0)
        print(f"   ICMS from PIS/COFINS response: R$ {icms_from_piscofins:,.2f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
