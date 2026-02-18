"""
Funções utilitárias para consultas ao banco de dados MongoDB
Compartilhadas entre os módulos de validação
"""


def get_filtro_notas_ativas():
    """
    Retorna o filtro MongoDB para excluir notas canceladas e desconsideradas.
    Usar em todos os endpoints de apuração/cálculo.
    """
    return {
        "$and": [
            {"$or": [{"cancelada": {"$exists": False}}, {"cancelada": False}]},
            {"$or": [{"desconsiderada_devolucao": {"$exists": False}}, {"desconsiderada_devolucao": False}]}
        ]
    }


def get_filtro_notas_ativas_sem_locacao():
    """
    Retorna o filtro MongoDB para excluir notas canceladas, desconsideradas E recibos de locação.
    Usar em apurações de ICMS e ISS onde locação NÃO deve ser incluída.
    """
    return {
        "$and": [
            {"$or": [{"cancelada": {"$exists": False}}, {"cancelada": False}]},
            {"$or": [{"desconsiderada_devolucao": {"$exists": False}}, {"desconsiderada_devolucao": False}]},
            {"modelo": {"$ne": "fatura_recibo"}}  # Excluir recibos de locação
        ]
    }


def is_documento_entrada(doc_or_tipo, cfop=None):
    """
    Determina se um documento/tipo é de entrada de forma robusta.
    Suporta múltiplos formatos: tipo string, tipo_operacao, ou derivar do CFOP.
    
    Args:
        doc_or_tipo: Pode ser dict (documento), str (tipo), ou None
        cfop: CFOP para derivar o tipo quando não disponível diretamente
    
    Returns:
        bool: True se for entrada, False se for saída
    """
    # Se for string, comparar diretamente
    if isinstance(doc_or_tipo, str):
        tipo = doc_or_tipo.lower()
        if tipo in ['entrada', 'recebido', 'input', 'in']:
            return True
        if tipo in ['saida', 'saída', 'prestado', 'output', 'out']:
            return False
    
    # Se for dict, tentar extrair o tipo
    elif isinstance(doc_or_tipo, dict):
        tipo = doc_or_tipo.get('tipo') or doc_or_tipo.get('tipo_operacao') or ''
        if tipo:
            tipo_lower = tipo.lower()
            if tipo_lower in ['entrada', 'recebido']:
                return True
            if tipo_lower in ['saida', 'saída', 'prestado']:
                return False
        
        # Tentar derivar do CFOP do primeiro produto
        if not cfop:
            produtos = doc_or_tipo.get('produtos', [])
            if produtos and len(produtos) > 0:
                cfop = str(produtos[0].get('cfop', ''))
    
    # Derivar do CFOP se disponível
    if cfop:
        cfop_str = str(cfop)
        if cfop_str and len(cfop_str) >= 1:
            primeiro_digito = cfop_str[0]
            # CFOPs 1, 2, 3 = Entradas
            if primeiro_digito in ['1', '2', '3']:
                return True
            # CFOPs 5, 6, 7 = Saídas
            if primeiro_digito in ['5', '6', '7']:
                return False
    
    # Default: considerar como saída se não conseguir determinar
    return False
