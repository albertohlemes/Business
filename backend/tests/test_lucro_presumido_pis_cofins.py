"""
Testes para validar as correções de PIS/COFINS no Lucro Presumido:
1. Lucro Presumido NUNCA gera créditos de PIS/COFINS (gera_credito=False)
2. Alíquotas corretas são 0.65% PIS / 3.00% COFINS (não 1.65%/7.60%)
3. Filtro de CFOP funciona na API /api/xml/documents
"""
import pytest
import requests
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.pis_cofins_calculator import (
    calcular_pis_cofins_produto,
    ALIQUOTAS_PRESUMIDO,
    CST_ENTRADA
)
from decimal import Decimal

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLucroPresumidoPisCofins:
    """
    Testes da função calcular_pis_cofins_produto para Lucro Presumido.
    Valida que NÃO gera créditos e usa alíquotas corretas.
    """
    
    def test_lucro_presumido_entrada_nunca_gera_credito(self):
        """Teste que Lucro Presumido NUNCA gera crédito nas entradas"""
        # Produto normal (regra geral)
        resultado = calcular_pis_cofins_produto(
            valor_base=1000.00,
            ncm='12345678',  # NCM genérico
            cfop='1102',  # CFOP que normalmente geraria crédito no Lucro Real
            tipo_operacao='entrada',
            perfil_empresa='VAREJO',
            regime_tributario='LUCRO_PRESUMIDO'
        )
        
        assert resultado['gera_credito'] == False, "Lucro Presumido não deve gerar crédito"
        assert resultado['valor_pis'] == 0, "Valor PIS deve ser 0 para entradas no Lucro Presumido"
        assert resultado['valor_cofins'] == 0, "Valor COFINS deve ser 0 para entradas no Lucro Presumido"
        print(f"✅ Entrada Lucro Presumido: gera_credito={resultado['gera_credito']}, PIS={resultado['valor_pis']}, COFINS={resultado['valor_cofins']}")
    
    def test_lucro_presumido_entrada_monofasico_sem_credito(self):
        """Teste que produtos monofásicos no Lucro Presumido também não geram crédito"""
        # NCM de bebida (monofásico)
        resultado = calcular_pis_cofins_produto(
            valor_base=500.00,
            ncm='22021000',  # Refrigerante (monofásico)
            cfop='1102',
            tipo_operacao='entrada',
            perfil_empresa='VAREJO',
            regime_tributario='LUCRO_PRESUMIDO'
        )
        
        assert resultado['gera_credito'] == False, "Monofásico no Lucro Presumido não deve gerar crédito"
        assert resultado['valor_pis'] == 0, "Valor PIS deve ser 0"
        assert resultado['valor_cofins'] == 0, "Valor COFINS deve ser 0"
        print(f"✅ Monofásico no Lucro Presumido: gera_credito={resultado['gera_credito']}")
    
    def test_lucro_presumido_aliquotas_corretas_saida(self):
        """Teste que as alíquotas de saída são 0.65%/3.00% no Lucro Presumido"""
        resultado = calcular_pis_cofins_produto(
            valor_base=1000.00,
            ncm='12345678',  # NCM genérico (regra geral)
            cfop='5102',  # Venda
            tipo_operacao='saida',
            perfil_empresa='VAREJO',
            regime_tributario='LUCRO_PRESUMIDO'
        )
        
        # Verificar alíquotas corretas (0.65% PIS e 3.00% COFINS)
        assert resultado['aliquota_pis'] == 0.65, f"Alíquota PIS deve ser 0.65%, não {resultado['aliquota_pis']}%"
        assert resultado['aliquota_cofins'] == 3.00, f"Alíquota COFINS deve ser 3.00%, não {resultado['aliquota_cofins']}%"
        
        # Verificar valores calculados (1000 * 0.65% = 6.50, 1000 * 3% = 30.00)
        assert resultado['valor_pis'] == 6.50, f"Valor PIS deve ser 6.50, não {resultado['valor_pis']}"
        assert resultado['valor_cofins'] == 30.00, f"Valor COFINS deve ser 30.00, não {resultado['valor_cofins']}"
        
        print(f"✅ Saída Lucro Presumido: PIS={resultado['aliquota_pis']}% (R${resultado['valor_pis']}), COFINS={resultado['aliquota_cofins']}% (R${resultado['valor_cofins']})")
    
    def test_aliquotas_presumido_constantes(self):
        """Teste que as constantes ALIQUOTAS_PRESUMIDO estão corretas"""
        # Verificar constantes
        assert ALIQUOTAS_PRESUMIDO['COMERCIO']['pis'] == Decimal('0.65'), "Constante PIS deve ser 0.65"
        assert ALIQUOTAS_PRESUMIDO['COMERCIO']['cofins'] == Decimal('3.00'), "Constante COFINS deve ser 3.00"
        assert ALIQUOTAS_PRESUMIDO['SERVICOS']['pis'] == Decimal('0.65'), "Constante PIS serviços deve ser 0.65"
        assert ALIQUOTAS_PRESUMIDO['SERVICOS']['cofins'] == Decimal('3.00'), "Constante COFINS serviços deve ser 3.00"
        
        print(f"✅ Constantes ALIQUOTAS_PRESUMIDO: COMERCIO={ALIQUOTAS_PRESUMIDO['COMERCIO']}, SERVICOS={ALIQUOTAS_PRESUMIDO['SERVICOS']}")
    
    def test_comparar_lucro_real_vs_presumido(self):
        """Teste que Lucro Real gera crédito mas Lucro Presumido não"""
        # Lucro Real
        resultado_real = calcular_pis_cofins_produto(
            valor_base=1000.00,
            ncm='12345678',
            cfop='1102',
            tipo_operacao='entrada',
            perfil_empresa='VAREJO',
            regime_tributario='LUCRO_REAL'
        )
        
        # Lucro Presumido
        resultado_presumido = calcular_pis_cofins_produto(
            valor_base=1000.00,
            ncm='12345678',
            cfop='1102',
            tipo_operacao='entrada',
            perfil_empresa='VAREJO',
            regime_tributario='LUCRO_PRESUMIDO'
        )
        
        # Lucro Real deve gerar crédito
        assert resultado_real['gera_credito'] == True, "Lucro Real deve gerar crédito"
        assert resultado_real['valor_pis'] > 0, "Lucro Real deve ter valor de PIS"
        assert resultado_real['valor_cofins'] > 0, "Lucro Real deve ter valor de COFINS"
        
        # Lucro Presumido NÃO deve gerar crédito
        assert resultado_presumido['gera_credito'] == False, "Lucro Presumido não deve gerar crédito"
        assert resultado_presumido['valor_pis'] == 0, "Lucro Presumido não deve ter valor de PIS"
        assert resultado_presumido['valor_cofins'] == 0, "Lucro Presumido não deve ter valor de COFINS"
        
        print(f"✅ Lucro Real: gera_credito={resultado_real['gera_credito']}, PIS={resultado_real['valor_pis']}")
        print(f"✅ Lucro Presumido: gera_credito={resultado_presumido['gera_credito']}, PIS={resultado_presumido['valor_pis']}")


class TestCfopFilterDocuments:
    """
    Testes do filtro de CFOP no endpoint /api/xml/documents
    """
    
    @pytest.fixture
    def auth_token(self):
        """Obtém token de autenticação"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "@Ahl142536"
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        pytest.skip("Autenticação falhou")
    
    def test_cfop_filter_parameter_accepted(self, auth_token):
        """Teste que o parâmetro cfop é aceito na API"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Fazer requisição com parâmetro cfop
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?cfop=5102",
            headers=headers
        )
        
        # Deve retornar 200 (mesmo sem resultados)
        assert response.status_code == 200, f"API deve aceitar parâmetro cfop. Status: {response.status_code}"
        print(f"✅ Parâmetro cfop aceito na API, status={response.status_code}")
    
    def test_cfop_filter_with_company(self, auth_token):
        """Teste filtro CFOP com company_id"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Primeiro, buscar uma empresa
        companies_response = requests.get(
            f"{BASE_URL}/api/companies",
            headers=headers
        )
        
        if companies_response.status_code != 200 or not companies_response.json():
            pytest.skip("Nenhuma empresa disponível para teste")
        
        company_id = companies_response.json()[0].get('id')
        
        # Fazer requisição com cfop e company_id
        response = requests.get(
            f"{BASE_URL}/api/xml/documents?company_id={company_id}&cfop=5102",
            headers=headers
        )
        
        assert response.status_code == 200, f"Filtro CFOP com company deve funcionar. Status: {response.status_code}"
        
        data = response.json()
        print(f"✅ Filtro CFOP com company_id: {len(data.get('documents', data) if isinstance(data, dict) else data)} documentos")


class TestApiEndpoints:
    """
    Testes de endpoints da API
    """
    
    @pytest.fixture
    def auth_token(self):
        """Obtém token de autenticação"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "@Ahl142536"
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        pytest.skip("Autenticação falhou")
    
    def test_backend_status(self):
        """Teste que o backend está respondendo"""
        # Use POST login endpoint to check backend is alive
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test"
        })
        # Even with wrong credentials, we should get 401 (not 500 or connection error)
        assert response.status_code in [200, 401, 403, 404, 405, 422], f"Backend deve estar respondendo. Status: {response.status_code}"
        print(f"✅ Backend status check: status={response.status_code}")
    
    def test_login_endpoint(self):
        """Teste de login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "alberto.lemes@businessconta.com.br",
            "password": "@Ahl142536"
        })
        assert response.status_code == 200, f"Login deve funcionar. Status: {response.status_code}"
        data = response.json()
        assert 'token' in data or 'access_token' in data, "Resposta deve conter token"
        print(f"✅ Login: status={response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
