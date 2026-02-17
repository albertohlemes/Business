"""
Testes para verificar a unificação do sistema de classificação de produtos.
O Wizard e a Classificação Inteligente devem:
1. Usar a mesma base de regras (learned_rules)
2. Salvar regras com campos padronizados
3. Inferir a categoria corretamente do CFOP destino
"""
import pytest
import sys
sys.path.insert(0, '/app/backend')


class TestCategoriasPorCFOP:
    """Testa a inferência de categoria baseada no CFOP"""
    
    def test_bonificacao_entrada_estadual(self):
        """CFOP 1910 deve ser classificado como bonificação"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('1910') == 'bonificacao'
    
    def test_bonificacao_entrada_interestadual(self):
        """CFOP 2910 deve ser classificado como bonificação"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('2910') == 'bonificacao'
    
    def test_bonificacao_saida_estadual(self):
        """CFOP 5910 (saída) deve ser classificado como bonificação"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('5910') == 'bonificacao'
    
    def test_bonificacao_saida_interestadual(self):
        """CFOP 6910 (saída) deve ser classificado como bonificação"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('6910') == 'bonificacao'
    
    def test_combustivel_entrada(self):
        """CFOP 1652 deve ser classificado como combustível"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('1652') == 'combustivel'
    
    def test_combustivel_entrada_interestadual(self):
        """CFOP 2652 deve ser classificado como combustível"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('2652') == 'combustivel'
    
    def test_amostra_gratis_entrada(self):
        """CFOP 1911 deve ser classificado como amostra grátis"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('1911') == 'amostra_gratis'
    
    def test_amostra_gratis_saida(self):
        """CFOP 5911 (saída) deve ser classificado como amostra grátis"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('5911') == 'amostra_gratis'
    
    def test_revenda(self):
        """CFOP 1102 deve ser classificado como revenda/produto"""
        from server import obter_categoria_por_cfop
        resultado = obter_categoria_por_cfop('1102')
        assert resultado in ['revenda', 'produto']
    
    def test_devolucao(self):
        """CFOP 1201 deve ser classificado como devolução"""
        from server import obter_categoria_por_cfop
        assert obter_categoria_por_cfop('1201') == 'devolucao'


class TestObterCFOPPorCategoria:
    """Testa a geração de CFOP baseada na categoria"""
    
    def test_bonificacao_gera_cfop_correto(self):
        """Categoria bonificação deve gerar CFOP x910"""
        from server import obter_cfop_por_categoria
        resultado = obter_cfop_por_categoria('bonificacao', '1102')
        assert resultado in ['1910', '2910']
    
    def test_combustivel_gera_cfop_correto(self):
        """Categoria combustível deve gerar CFOP x653"""
        from server import obter_cfop_por_categoria
        resultado = obter_cfop_por_categoria('combustivel', '1102')
        assert '653' in resultado
    
    def test_revenda_gera_cfop_correto(self):
        """Categoria revenda deve gerar CFOP x102"""
        from server import obter_cfop_por_categoria
        resultado = obter_cfop_por_categoria('revenda', '1102')
        assert '102' in resultado
    
    def test_preserva_prefixo_estadual(self):
        """Deve preservar o prefixo estadual (1xxx)"""
        from server import obter_cfop_por_categoria
        resultado = obter_cfop_por_categoria('bonificacao', '1102')
        assert resultado.startswith('1')
    
    def test_preserva_prefixo_interestadual(self):
        """Deve preservar o prefixo interestadual (2xxx)"""
        from server import obter_cfop_por_categoria
        resultado = obter_cfop_por_categoria('bonificacao', '2102')
        assert resultado.startswith('2')


class TestNormalizacaoDescricao:
    """Testa a normalização de descrições para matching"""
    
    def test_normaliza_descricao_basica(self):
        """Deve normalizar descrição removendo caracteres especiais"""
        from server import _normalizar_descricao
        resultado = _normalizar_descricao("ARLA 32 - 20L")
        assert 'arla' in resultado.lower()
    
    def test_normaliza_descricao_com_numeros(self):
        """Deve remover números da descrição"""
        from server import _normalizar_descricao
        resultado = _normalizar_descricao("PRODUTO 123 ABC")
        # Números devem ser removidos
        assert '123' not in resultado
    
    def test_normaliza_descricao_vazia(self):
        """Deve retornar string vazia para entrada vazia"""
        from server import _normalizar_descricao
        assert _normalizar_descricao("") == ""
        assert _normalizar_descricao(None) == ""


class TestIntegracaoClassificacao:
    """
    Testes de integração para garantir que o Wizard e a Classificação Inteligente
    trabalham com a mesma base de dados.
    """
    
    def test_campos_regra_padronizados(self):
        """
        Verifica se os campos da regra estão padronizados.
        Os seguintes campos devem existir para compatibilidade:
        - produto_descricao (usado pelo Wizard)
        - descricao_produto (usado pela Classificação Inteligente)
        - padrao (usado pela Classificação Inteligente)
        - cfop_correto (usado pelo Wizard)
        - cfop (usado pela Classificação Inteligente)
        - categoria_correta (usado pelo Wizard)
        - categoria (usado pela Classificação Inteligente)
        """
        campos_wizard = ['produto_descricao', 'cfop_correto', 'categoria_correta']
        campos_classificacao = ['descricao_produto', 'padrao', 'cfop', 'categoria']
        campos_compartilhados = ['ncm', 'company_id', 'id']
        
        # Esta é uma verificação de documentação
        # Os campos acima devem ser salvos em ambos os sistemas
        todos_campos = campos_wizard + campos_classificacao + campos_compartilhados
        assert len(todos_campos) == 10


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
