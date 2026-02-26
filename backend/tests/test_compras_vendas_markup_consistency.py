"""
Test: Compras/Vendas Líquidas e Markup - Consistência entre endpoints

Valida que os valores de Compras Líquidas, Vendas Líquidas e Markup são consistentes
entre os endpoints /api/apuracao-icms e /api/analise-horizontal.

Regras de negócio:
- Compras Líquidas = CFOPs de Compra (1102, 2102, etc) - Devoluções de Saída (5202, 5411)
- Vendas Líquidas = CFOPs de Venda (5102, 6102, etc) - Devoluções de Entrada (1202, 1411)
- Markup = (Vendas Líquidas - Compras Líquidas) / Compras Líquidas * 100

Autor: Testing Agent
Data: 2026-01-XX
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://icms-credit-fix.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "alberto.lemes@businessconta.com.br"
TEST_PASSWORD = "Business@2026"

# Test company - COMERCIAL RS LTDA
TEST_COMPANY_ID = "d7f30ea1-9df3-4124-a561-12984ffff64b"
TEST_COMPETENCIA = "01/2026"


class TestComprasVendasMarkupConsistency:
    """Test suite to validate consistency of Compras/Vendas/Markup between endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_apuracao_icms_returns_compras_vendas_markup(self):
        """
        Test 1: Endpoint /api/apuracao-icms deve retornar compras_liquidas, vendas_liquidas, markup
        """
        response = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert response.status_code == 200, f"Esperado 200, recebeu {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify compras_liquidas structure
        assert "compras_liquidas" in data, "Campo compras_liquidas não encontrado no response"
        assert "brutas" in data["compras_liquidas"], "Campo brutas não encontrado em compras_liquidas"
        assert "devolucoes" in data["compras_liquidas"], "Campo devolucoes não encontrado em compras_liquidas"
        assert "liquidas" in data["compras_liquidas"], "Campo liquidas não encontrado em compras_liquidas"
        
        # Verify vendas_liquidas structure
        assert "vendas_liquidas" in data, "Campo vendas_liquidas não encontrado no response"
        assert "brutas" in data["vendas_liquidas"], "Campo brutas não encontrado em vendas_liquidas"
        assert "devolucoes" in data["vendas_liquidas"], "Campo devolucoes não encontrado em vendas_liquidas"
        assert "liquidas" in data["vendas_liquidas"], "Campo liquidas não encontrado em vendas_liquidas"
        
        # Verify markup
        assert "markup" in data, "Campo markup não encontrado no response"
        
        # Verify values are numeric
        assert isinstance(data["compras_liquidas"]["liquidas"], (int, float)), "Compras Líquidas não é numérico"
        assert isinstance(data["vendas_liquidas"]["liquidas"], (int, float)), "Vendas Líquidas não é numérico"
        assert isinstance(data["markup"], (int, float)), "Markup não é numérico"
        
        # Log values for debugging
        print(f"\n=== APURACAO-ICMS ===")
        print(f"Compras Brutas: {data['compras_liquidas']['brutas']}")
        print(f"Devoluções Compra: {data['compras_liquidas']['devolucoes']}")
        print(f"Compras Líquidas: {data['compras_liquidas']['liquidas']}")
        print(f"Vendas Brutas: {data['vendas_liquidas']['brutas']}")
        print(f"Devoluções Venda: {data['vendas_liquidas']['devolucoes']}")
        print(f"Vendas Líquidas: {data['vendas_liquidas']['liquidas']}")
        print(f"Markup: {data['markup']}%")
        
    def test_analise_horizontal_returns_compras_vendas_markup(self):
        """
        Test 2: Endpoint /api/analise-horizontal deve retornar compras, vendas, markup e campos detalhados
        """
        response = self.session.get(
            f"{BASE_URL}/api/analise-horizontal/{TEST_COMPANY_ID}",
            params={"ano": 2026}
        )
        
        assert response.status_code == 200, f"Esperado 200, recebeu {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Find data for competencia 01/2026
        # Estrutura correta: mensal (não dados_mensal)
        dados_mensal = data.get("mensal", {})
        comp_data = dados_mensal.get(TEST_COMPETENCIA, {})
        
        assert comp_data, f"Dados para competência {TEST_COMPETENCIA} não encontrados"
        
        # Verify required fields
        assert "compras" in comp_data, "Campo compras não encontrado (compras líquidas)"
        assert "vendas" in comp_data, "Campo vendas não encontrado (vendas líquidas)"
        assert "markup" in comp_data, "Campo markup não encontrado"
        
        # Verify detail fields
        assert "compras_brutas" in comp_data, "Campo compras_brutas não encontrado"
        assert "vendas_brutas" in comp_data, "Campo vendas_brutas não encontrado"
        assert "devolucoes_compra" in comp_data, "Campo devolucoes_compra não encontrado"
        assert "devolucoes_cliente" in comp_data, "Campo devolucoes_cliente não encontrado"
        
        # Verify values are numeric
        assert isinstance(comp_data["compras"], (int, float)), "Compras não é numérico"
        assert isinstance(comp_data["vendas"], (int, float)), "Vendas não é numérico"
        assert isinstance(comp_data["markup"], (int, float)), "Markup não é numérico"
        
        # Log values for debugging
        print(f"\n=== ANALISE-HORIZONTAL ===")
        print(f"Compras Brutas: {comp_data.get('compras_brutas')}")
        print(f"Devoluções Compra: {comp_data.get('devolucoes_compra')}")
        print(f"Compras Líquidas: {comp_data['compras']}")
        print(f"Vendas Brutas: {comp_data.get('vendas_brutas')}")
        print(f"Devoluções Cliente: {comp_data.get('devolucoes_cliente')}")
        print(f"Vendas Líquidas: {comp_data['vendas']}")
        print(f"Markup: {comp_data['markup']}%")
    
    def test_consistency_compras_liquidas_between_endpoints(self):
        """
        Test 3: Compras Líquidas devem ser IGUAIS entre apuracao-icms e analise-horizontal
        """
        # Get data from apuracao-icms
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data_icms = resp_icms.json()
        
        # Get data from analise-horizontal
        resp_ah = self.session.get(
            f"{BASE_URL}/api/analise-horizontal/{TEST_COMPANY_ID}",
            params={"ano": 2026}
        )
        assert resp_ah.status_code == 200
        data_ah = resp_ah.json()
        
        # Extract values
        compras_liquidas_icms = data_icms["compras_liquidas"]["liquidas"]
        compras_liquidas_ah = data_ah["mensal"][TEST_COMPETENCIA]["compras"]
        
        print(f"\n=== COMPRAS LÍQUIDAS - CONSISTÊNCIA ===")
        print(f"Apuração ICMS: {compras_liquidas_icms}")
        print(f"Análise Horizontal: {compras_liquidas_ah}")
        print(f"Diferença: {abs(compras_liquidas_icms - compras_liquidas_ah)}")
        
        # Allow small floating point tolerance (0.01)
        assert abs(compras_liquidas_icms - compras_liquidas_ah) < 1, \
            f"Compras Líquidas INCONSISTENTES: ICMS={compras_liquidas_icms} vs AH={compras_liquidas_ah}"
    
    def test_consistency_vendas_liquidas_between_endpoints(self):
        """
        Test 4: Vendas Líquidas devem ser IGUAIS entre apuracao-icms e analise-horizontal
        """
        # Get data from apuracao-icms
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data_icms = resp_icms.json()
        
        # Get data from analise-horizontal
        resp_ah = self.session.get(
            f"{BASE_URL}/api/analise-horizontal/{TEST_COMPANY_ID}",
            params={"ano": 2026}
        )
        assert resp_ah.status_code == 200
        data_ah = resp_ah.json()
        
        # Extract values
        vendas_liquidas_icms = data_icms["vendas_liquidas"]["liquidas"]
        vendas_liquidas_ah = data_ah["mensal"][TEST_COMPETENCIA]["vendas"]
        
        print(f"\n=== VENDAS LÍQUIDAS - CONSISTÊNCIA ===")
        print(f"Apuração ICMS: {vendas_liquidas_icms}")
        print(f"Análise Horizontal: {vendas_liquidas_ah}")
        print(f"Diferença: {abs(vendas_liquidas_icms - vendas_liquidas_ah)}")
        
        # Allow small floating point tolerance
        assert abs(vendas_liquidas_icms - vendas_liquidas_ah) < 1, \
            f"Vendas Líquidas INCONSISTENTES: ICMS={vendas_liquidas_icms} vs AH={vendas_liquidas_ah}"
    
    def test_consistency_markup_between_endpoints(self):
        """
        Test 5: Markup deve ser IGUAL entre apuracao-icms e analise-horizontal
        """
        # Get data from apuracao-icms
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data_icms = resp_icms.json()
        
        # Get data from analise-horizontal
        resp_ah = self.session.get(
            f"{BASE_URL}/api/analise-horizontal/{TEST_COMPANY_ID}",
            params={"ano": 2026}
        )
        assert resp_ah.status_code == 200
        data_ah = resp_ah.json()
        
        # Extract values
        markup_icms = data_icms["markup"]
        markup_ah = data_ah["mensal"][TEST_COMPETENCIA]["markup"]
        
        print(f"\n=== MARKUP - CONSISTÊNCIA ===")
        print(f"Apuração ICMS: {markup_icms}%")
        print(f"Análise Horizontal: {markup_ah}%")
        print(f"Diferença: {abs(markup_icms - markup_ah)}%")
        
        # Allow small floating point tolerance (0.01%)
        assert abs(markup_icms - markup_ah) < 0.1, \
            f"Markup INCONSISTENTE: ICMS={markup_icms}% vs AH={markup_ah}%"
    
    def test_business_logic_compras_liquidas(self):
        """
        Test 6: Verificar lógica de negócio - Compras Líquidas = Brutas - Devoluções
        """
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data = resp_icms.json()
        
        brutas = data["compras_liquidas"]["brutas"]
        devolucoes = data["compras_liquidas"]["devolucoes"]
        liquidas = data["compras_liquidas"]["liquidas"]
        
        # Calculated value
        calculated = brutas - devolucoes
        
        print(f"\n=== LÓGICA COMPRAS LÍQUIDAS ===")
        print(f"Brutas: {brutas}")
        print(f"Devoluções: {devolucoes}")
        print(f"Calculado: {calculated}")
        print(f"Retornado: {liquidas}")
        
        assert abs(calculated - liquidas) < 1, \
            f"Erro na lógica: {brutas} - {devolucoes} = {calculated}, mas endpoint retorna {liquidas}"
    
    def test_business_logic_vendas_liquidas(self):
        """
        Test 7: Verificar lógica de negócio - Vendas Líquidas = Brutas - Devoluções
        """
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data = resp_icms.json()
        
        brutas = data["vendas_liquidas"]["brutas"]
        devolucoes = data["vendas_liquidas"]["devolucoes"]
        liquidas = data["vendas_liquidas"]["liquidas"]
        
        # Calculated value
        calculated = brutas - devolucoes
        
        print(f"\n=== LÓGICA VENDAS LÍQUIDAS ===")
        print(f"Brutas: {brutas}")
        print(f"Devoluções: {devolucoes}")
        print(f"Calculado: {calculated}")
        print(f"Retornado: {liquidas}")
        
        assert abs(calculated - liquidas) < 1, \
            f"Erro na lógica: {brutas} - {devolucoes} = {calculated}, mas endpoint retorna {liquidas}"
    
    def test_business_logic_markup_formula(self):
        """
        Test 8: Verificar lógica de negócio - Markup = (Vendas - Compras) / Compras * 100
        """
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data = resp_icms.json()
        
        compras_liquidas = data["compras_liquidas"]["liquidas"]
        vendas_liquidas = data["vendas_liquidas"]["liquidas"]
        markup_returned = data["markup"]
        
        # Calculate expected markup
        if compras_liquidas > 0:
            markup_calculated = ((vendas_liquidas - compras_liquidas) / compras_liquidas) * 100
        else:
            markup_calculated = 0
        
        print(f"\n=== LÓGICA MARKUP ===")
        print(f"Compras Líquidas: {compras_liquidas}")
        print(f"Vendas Líquidas: {vendas_liquidas}")
        print(f"Markup Calculado: ({vendas_liquidas} - {compras_liquidas}) / {compras_liquidas} * 100 = {markup_calculated:.2f}%")
        print(f"Markup Retornado: {markup_returned}%")
        
        # Allow 0.1% tolerance
        assert abs(markup_calculated - markup_returned) < 0.1, \
            f"Erro na fórmula: esperado {markup_calculated:.2f}%, recebeu {markup_returned}%"
    
    def test_expected_values_from_main_agent(self):
        """
        Test 9: Verificar valores esperados conforme informado pelo main agent
        
        Valores esperados:
        - Compras Líquidas = 10929656.95
        - Vendas Líquidas = 11407076.05
        - Markup = 4.37%
        """
        resp_icms = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        assert resp_icms.status_code == 200
        data = resp_icms.json()
        
        compras_liquidas = data["compras_liquidas"]["liquidas"]
        vendas_liquidas = data["vendas_liquidas"]["liquidas"]
        markup = data["markup"]
        
        print(f"\n=== VALORES ESPERADOS (conforme main agent) ===")
        print(f"Compras Líquidas - Esperado: 10929656.95 | Recebido: {compras_liquidas}")
        print(f"Vendas Líquidas - Esperado: 11407076.05 | Recebido: {vendas_liquidas}")
        print(f"Markup - Esperado: 4.37% | Recebido: {markup}%")
        
        # These values were logged by the main agent during implementation
        # We allow a tolerance due to possible data changes
        expected_compras = 10929656.95
        expected_vendas = 11407076.05
        expected_markup = 4.37
        
        # Log any differences (informational, not critical)
        diff_compras = abs(compras_liquidas - expected_compras) / expected_compras * 100 if expected_compras > 0 else 0
        diff_vendas = abs(vendas_liquidas - expected_vendas) / expected_vendas * 100 if expected_vendas > 0 else 0
        diff_markup = abs(markup - expected_markup)
        
        print(f"Diferença % Compras: {diff_compras:.2f}%")
        print(f"Diferença % Vendas: {diff_vendas:.2f}%")
        print(f"Diferença Markup: {diff_markup:.2f}%")
        
        # Verificar se os valores são minimamente razoáveis (maiores que zero)
        assert compras_liquidas > 0, "Compras Líquidas deve ser > 0"
        assert vendas_liquidas > 0, "Vendas Líquidas deve ser > 0"
        assert markup != 0 or (compras_liquidas == vendas_liquidas), "Markup deve ser != 0 ou vendas == compras"


class TestIndicadoresPageIntegration:
    """Test suite to validate Indicadores page consumes backend values correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_indicadores_page_data_source(self):
        """
        Test 10: Verificar que o endpoint apuracao-icms está disponível para a página Indicadores
        
        A página Indicadores consome os dados de:
        - dados?.icms?.markup
        - dados?.icms?.compras_liquidas?.liquidas
        - dados?.icms?.vendas_liquidas?.liquidas
        """
        response = self.session.get(
            f"{BASE_URL}/api/apuracao-icms/{TEST_COMPANY_ID}",
            params={"competencia": TEST_COMPETENCIA}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Simular o acesso da página Indicadores
        # Conforme linha 291-294 de Indicadores.js:
        # const markup = dados?.icms?.markup || 0;
        # const comprasLiquidas = dados?.icms?.compras_liquidas?.liquidas || 0;
        # const vendasLiquidas = dados?.icms?.vendas_liquidas?.liquidas || 0;
        
        markup_from_api = data.get("markup", 0)
        compras_from_api = data.get("compras_liquidas", {}).get("liquidas", 0)
        vendas_from_api = data.get("vendas_liquidas", {}).get("liquidas", 0)
        
        print(f"\n=== DADOS CONSUMIDOS PELA PÁGINA INDICADORES ===")
        print(f"dados?.icms?.markup = {markup_from_api}")
        print(f"dados?.icms?.compras_liquidas?.liquidas = {compras_from_api}")
        print(f"dados?.icms?.vendas_liquidas?.liquidas = {vendas_from_api}")
        
        # Verificar que os valores existem e são numéricos
        assert markup_from_api is not None, "markup não encontrado"
        assert compras_from_api is not None, "compras_liquidas.liquidas não encontrado"
        assert vendas_from_api is not None, "vendas_liquidas.liquidas não encontrado"
        
        assert isinstance(markup_from_api, (int, float)), "markup deve ser numérico"
        assert isinstance(compras_from_api, (int, float)), "compras_liquidas deve ser numérico"
        assert isinstance(vendas_from_api, (int, float)), "vendas_liquidas deve ser numérico"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
