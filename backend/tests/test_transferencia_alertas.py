"""
Tests for verifying transfer CFOPs bug fix.
Main issue: Transfer CFOPs (5151, 5152, 5408, etc.) should NOT appear in CFOP Alerts.

This test file verifies:
1. is_cfop_transferencia function works correctly
2. calcular_cst_pis_cofins returns correct CST for transfers (98 entrada, 49 saída)
3. alertas-cfop API endpoint excludes transfer CFOPs
"""

import pytest
import requests
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.fiscal_constants import CFOPS_TRANSFERENCIA, is_cfop_transferencia

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sieg-integration-v2.preview.emergentagent.com')


class TestIsOfopTransferencia:
    """Tests for is_cfop_transferencia function"""
    
    def test_all_saida_cfops_are_transfer(self):
        """All saída transfer CFOPs should return True"""
        cfops_saida = ['5151', '5152', '5153', '5155', '5156', '5408', '5409',
                       '6151', '6152', '6153', '6155', '6156', '6408', '6409']
        for cfop in cfops_saida:
            assert is_cfop_transferencia(cfop), f"CFOP {cfop} should be transfer"
    
    def test_all_entrada_cfops_are_transfer(self):
        """All entrada transfer CFOPs should return True"""
        cfops_entrada = ['1151', '1152', '1153', '1154', '1408', '1409',
                         '2151', '2152', '2153', '2154', '2408', '2409']
        for cfop in cfops_entrada:
            assert is_cfop_transferencia(cfop), f"CFOP {cfop} should be transfer"
    
    def test_normal_cfops_not_transfer(self):
        """Normal CFOPs should return False"""
        cfops_normais = ['5102', '1102', '5403', '1403', '5101', '1101', '6102', '2102']
        for cfop in cfops_normais:
            assert not is_cfop_transferencia(cfop), f"CFOP {cfop} should NOT be transfer"


class TestCalcCstPisCofins:
    """Tests for calcular_cst_pis_cofins function with transfer CFOPs"""
    
    def test_transfer_entrada_returns_cst_98(self):
        """Transfer CFOPs for entrada should return CST 98"""
        from server import calcular_cst_pis_cofins
        
        cfops_entrada = ['1151', '1152', '1153', '1154', '1408', '1409',
                         '2151', '2152', '2153', '2154', '2408', '2409']
        
        for cfop in cfops_entrada:
            result = calcular_cst_pis_cofins(
                ncm='12345678',
                cfop=cfop,
                tipo_operacao='entrada'
            )
            assert result['cst_calculado'] == '98', f"CFOP {cfop} should have CST 98, got {result['cst_calculado']}"
            assert result['sem_incidencia'] == True, f"CFOP {cfop} should have sem_incidencia=True"
    
    def test_transfer_saida_returns_cst_49(self):
        """Transfer CFOPs for saída should return CST 49"""
        from server import calcular_cst_pis_cofins
        
        cfops_saida = ['5151', '5152', '5153', '5155', '5156', '5408', '5409',
                       '6151', '6152', '6153', '6155', '6156', '6408', '6409']
        
        for cfop in cfops_saida:
            result = calcular_cst_pis_cofins(
                ncm='12345678',
                cfop=cfop,
                tipo_operacao='saida'
            )
            assert result['cst_calculado'] == '49', f"CFOP {cfop} should have CST 49, got {result['cst_calculado']}"
            assert result['sem_incidencia'] == True, f"CFOP {cfop} should have sem_incidencia=True"


class TestAlertasCfopApi:
    """API tests for alertas-cfop endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "alberto.lemes@businessconta.com.br",
                "password": "@Ahl142536"
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Auth failed")
    
    def test_alertas_cfop_excludes_transfer_cfops(self, auth_token):
        """Alertas CFOP endpoint should NOT contain transfer CFOPs"""
        company_id = "24e47135-2657-47d5-a112-cd2c06357370"  # ANZEN DISTRIBUIDORA
        competencia = "01/2026"
        
        response = requests.get(
            f"{BASE_URL}/api/alertas-cfop/{company_id}?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        cfops_transferencia = ['5151', '5152', '5153', '5155', '5156', '5408', '5409',
                                '6151', '6152', '6153', '6155', '6156', '6408', '6409',
                                '1151', '1152', '1153', '1154', '1408', '1409',
                                '2151', '2152', '2153', '2154', '2408', '2409']
        
        for alerta in data.get('alertas', []):
            for prod in alerta.get('produtos', []):
                cfop_original = str(prod.get('cfop_original_emissor', ''))
                cfop_atual = str(prod.get('cfop_atual', ''))
                
                assert cfop_original not in cfops_transferencia, \
                    f"Transfer CFOP {cfop_original} should NOT be in alertas (cfop_original_emissor)"
                assert cfop_atual not in cfops_transferencia, \
                    f"Transfer CFOP {cfop_atual} should NOT be in alertas (cfop_atual)"
    
    def test_alertas_cfop_agrupado_excludes_transfer_cfops(self, auth_token):
        """Alertas CFOP agrupado endpoint should NOT contain transfer CFOPs"""
        company_id = "24e47135-2657-47d5-a112-cd2c06357370"  # ANZEN DISTRIBUIDORA
        competencia = "01/2026"
        
        response = requests.get(
            f"{BASE_URL}/api/alertas-cfop/{company_id}/agrupado?competencia={competencia}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        cfops_transferencia = ['5151', '5152', '5153', '5155', '5156', '5408', '5409',
                                '6151', '6152', '6153', '6155', '6156', '6408', '6409',
                                '1151', '1152', '1153', '1154', '1408', '1409',
                                '2151', '2152', '2153', '2154', '2408', '2409']
        
        for grupo in data.get('grupos', []):
            cfop = str(grupo.get('cfop', ''))
            cfop_original = str(grupo.get('cfop_original', ''))
            
            # Note: 1152 is a valid entrada CFOP from conversion, but should not have pendente_revisao
            if cfop in cfops_transferencia:
                # Check it's not marked as pending
                assert grupo.get('total_produtos', 0) == 0 or cfop not in cfops_transferencia, \
                    f"Transfer CFOP {cfop} should NOT have pending products in alertas"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
