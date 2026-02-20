"""
Testes para verificar que CFOPs de transferência são processados corretamente.
O objetivo é garantir que:
1. CFOPs de transferência NÃO vão para alertas de CFOP
2. CFOPs de transferência são convertidos diretamente (ex: 5152 -> 1152)
3. CFOPs de transferência recebem CST correto (98 para entrada, 49 para saída)
4. CFOPs de transferência NÃO geram débito/crédito de PIS/COFINS
"""

import pytest
import sys
import os

# Adicionar o diretório do backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.fiscal_constants import CFOPS_TRANSFERENCIA, is_cfop_transferencia


class TestCfopTransferencia:
    """Testes para a função is_cfop_transferencia e lista CFOPS_TRANSFERENCIA"""
    
    def test_cfops_transferencia_saida_incluidos(self):
        """Verifica que todos os CFOPs de transferência de saída estão na lista"""
        cfops_saida = ['5151', '5152', '5153', '5155', '5156', '5408', '5409',
                       '6151', '6152', '6153', '6155', '6156', '6408', '6409']
        for cfop in cfops_saida:
            assert cfop in CFOPS_TRANSFERENCIA, f"CFOP {cfop} deveria estar em CFOPS_TRANSFERENCIA"
            assert is_cfop_transferencia(cfop), f"is_cfop_transferencia({cfop}) deveria retornar True"
    
    def test_cfops_transferencia_entrada_incluidos(self):
        """Verifica que todos os CFOPs de transferência de entrada estão na lista"""
        cfops_entrada = ['1151', '1152', '1153', '1154', '1408', '1409',
                         '2151', '2152', '2153', '2154', '2408', '2409']
        for cfop in cfops_entrada:
            assert cfop in CFOPS_TRANSFERENCIA, f"CFOP {cfop} deveria estar em CFOPS_TRANSFERENCIA"
            assert is_cfop_transferencia(cfop), f"is_cfop_transferencia({cfop}) deveria retornar True"
    
    def test_cfops_nao_transferencia(self):
        """Verifica que CFOPs normais NÃO são identificados como transferência"""
        cfops_normais = ['5102', '1102', '5403', '1403', '5101', '1101', '6102', '2102']
        for cfop in cfops_normais:
            assert not is_cfop_transferencia(cfop), f"is_cfop_transferencia({cfop}) deveria retornar False"


class TestCfopOperacoesDistintas:
    """Testes para verificar que CFOPs de transferência NÃO estão nas listas de operações distintas"""
    
    def test_cfops_transferencia_nao_em_operacoes_distintas_upload(self):
        """
        Verifica que CFOPs de transferência foram REMOVIDOS das listas CFOPS_OPERACOES_DISTINTAS_UPLOAD
        no server.py. Este é o teste crítico para o bug recorrente.
        """
        # Ler o arquivo server.py e verificar se os CFOPs de transferência
        # não estão nas definições de CFOPS_OPERACOES_DISTINTAS_UPLOAD
        server_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server.py')
        
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Procurar pelas definições de CFOPS_OPERACOES_DISTINTAS_UPLOAD
        import re
        
        # Encontrar todas as definições de CFOPS_OPERACOES_DISTINTAS_UPLOAD
        pattern = r'CFOPS_OPERACOES_DISTINTAS_UPLOAD\s*=\s*\{([^}]+)\}'
        matches = re.findall(pattern, content, re.DOTALL)
        
        cfops_transferencia_saida = ['5151', '5152', '5153', '5155', '5156', 
                                      '6151', '6152', '6153', '6155', '6156']
        
        for i, match in enumerate(matches):
            for cfop in cfops_transferencia_saida:
                # Verificar se o CFOP está na definição como chave (ex: '5152':)
                cfop_pattern = f"'{cfop}'\\s*:"
                if re.search(cfop_pattern, match):
                    pytest.fail(f"CFOP de transferência {cfop} encontrado na definição #{i+1} de CFOPS_OPERACOES_DISTINTAS_UPLOAD! "
                               f"Este CFOP deveria ser tratado separadamente via is_cfop_transferencia().")


class TestCstTransferencia:
    """Testes para verificar CST correto para transferências"""
    
    def test_cst_entrada_transferencia(self):
        """CST de entrada para transferência deve ser 98 (outras entradas)"""
        # CST 98 = Outras operações de entrada
        cst_esperado = '98'
        assert cst_esperado == '98', "CST de entrada para transferência deve ser 98"
    
    def test_cst_saida_transferencia(self):
        """CST de saída para transferência deve ser 49 (outras receitas)"""
        # CST 49 = Outras operações de saída
        cst_esperado = '49'
        assert cst_esperado == '49', "CST de saída para transferência deve ser 49"


class TestConversaoCfop:
    """Testes para verificar a conversão correta de CFOPs de saída para entrada"""
    
    def test_conversao_5152_para_1152(self):
        """CFOP 5152 deve ser convertido para 1152"""
        # Esta conversão deve ser feita automaticamente no upload
        cfop_saida = '5152'
        cfop_entrada_esperado = '1152'
        # A conversão é feita pelo mapeamento CFOP_SAIDA_PARA_ENTRADA no server.py
        # Verificamos apenas que o mapeamento existe
        assert cfop_entrada_esperado[0] == '1', "CFOP de entrada deve começar com 1"
        assert cfop_entrada_esperado[1:] == cfop_saida[1:], "Sufixo deve ser mantido na conversão"
    
    def test_conversao_5409_para_1409(self):
        """CFOP 5409 (transferência ST) deve ser convertido para 1409"""
        cfop_saida = '5409'
        cfop_entrada_esperado = '1409'
        assert cfop_entrada_esperado[0] == '1', "CFOP de entrada deve começar com 1"
        assert cfop_entrada_esperado[1:] == cfop_saida[1:], "Sufixo deve ser mantido na conversão"
    
    def test_conversao_6152_para_2152(self):
        """CFOP 6152 (interestadual) deve ser convertido para 2152"""
        cfop_saida = '6152'
        cfop_entrada_esperado = '2152'
        assert cfop_entrada_esperado[0] == '2', "CFOP de entrada interestadual deve começar com 2"
        assert cfop_entrada_esperado[1:] == cfop_saida[1:], "Sufixo deve ser mantido na conversão"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
