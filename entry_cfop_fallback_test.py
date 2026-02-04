#!/usr/bin/env python3
"""
Entry CFOP Fallback Test Script
Tests the fallback logic when AI classification fails or returns incomplete results
"""

import sys
from typing import Dict, List, Any

def mock_classify_products_batch_llm_incomplete(products: List[Dict], company: Dict) -> Dict[str, Dict]:
    """
    Mock LLM function that returns INCOMPLETE classifications (simulates AI failure)
    Only returns results for some products to test fallback logic
    """
    results = {}
    
    # Only classify first 2 products, leave others for fallback
    for i, product in enumerate(products[:2]):
        temp_id = product.get('_temp_id', str(i))
        
        descricao = product.get('descricao', '').lower()
        
        if 'papel' in descricao:
            categoria = 'despesa'
        else:
            categoria = 'revenda'
        
        results[temp_id] = {
            'categoria': categoria,
            'justificativa': f'IA: Classificado como {categoria} baseado na descrição do produto'
        }
    
    print(f"🤖 Mock AI returning incomplete results: {len(results)}/{len(products)} products classified")
    return results

def get_cfop_from_category(categoria: str, emitente_uf: str, company_uf: str = 'SP') -> str:
    """Convert AI category to appropriate entry CFOP"""
    if emitente_uf and company_uf and emitente_uf != company_uf:
        prefix = '2'
    else:
        prefix = '1'
    
    cfop_mapping = {
        'revenda': '102',
        'insumo': '101', 
        'despesa': '556',
        'combustivel': '653'
    }
    
    suffix = cfop_mapping.get(categoria, '102')
    return prefix + suffix

def apply_classification(product: Dict, classification: Dict, cfop_original: str, conversions: List[Dict]):
    """Apply AI classification result to product"""
    categoria = classification.get('categoria')
    justificativa = classification.get('justificativa', '')
    
    if categoria:
        emitente_uf = product.get('emitente_uf', 'SP')
        company_uf = 'SP'
        
        cfop_sugerido = get_cfop_from_category(categoria, emitente_uf, company_uf)
        
        product['cfop'] = cfop_sugerido
        product['categoria_classificada'] = categoria
        product['justificativa_ia'] = justificativa
        product['cfop_original'] = cfop_original
        
        conversions.append({
            'produto': product.get('descricao', ''),
            'codigo': product.get('codigo', ''),
            'cfop_original': cfop_original,
            'cfop_convertido': cfop_sugerido,
            'categoria': categoria,
            'motivo': justificativa
        })

def apply_fallback_cfop(product: Dict, cfop_original: str, conversions: List[Dict]):
    """
    Apply fallback CFOP conversion when AI classification fails
    Uses CFOP_SAIDA_PARA_ENTRADA mapping with interestadual adjustment
    """
    # CFOP mapping from saída to entrada (maintaining nature)
    CFOP_SAIDA_PARA_ENTRADA = {
        # Estadual (5xxx -> 1xxx)
        '5102': '1102',  # Venda -> Compra para comercialização
        '5101': '1101',  # Venda produção -> Compra para industrialização
        '5556': '1556',  # Uso/consumo -> Compra para uso/consumo
        '5653': '1653',  # Combustível -> Compra de combustível
        # Interestadual (6xxx -> 2xxx)
        '6102': '2102',
        '6101': '2101', 
        '6556': '2556',
        '6653': '2653',
    }
    
    emitente_uf = product.get('emitente_uf', 'SP')
    company_uf = 'SP'
    
    # Try direct mapping first
    cfop_convertido = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original)
    
    if not cfop_convertido:
        # If no direct mapping, apply prefix conversion logic
        if cfop_original.startswith('5'):
            # Convert 5xxx to 1xxx or 2xxx based on UF
            suffix = cfop_original[1:]
            prefix = '2' if emitente_uf != company_uf else '1'
            cfop_convertido = prefix + suffix
        elif cfop_original.startswith('6'):
            # Convert 6xxx to 2xxx (already interestadual)
            cfop_convertido = '2' + cfop_original[1:]
        else:
            # Default fallback
            prefix = '2' if emitente_uf != company_uf else '1'
            cfop_convertido = prefix + '102'  # Default to revenda
    
    # Apply interestadual adjustment if needed
    if emitente_uf != company_uf and cfop_convertido.startswith('1'):
        cfop_convertido = '2' + cfop_convertido[1:]
    
    product['cfop'] = cfop_convertido
    product['categoria_classificada'] = 'fallback'
    product['justificativa_ia'] = 'Fallback: Conversão automática por mapeamento CFOP'
    product['cfop_original'] = cfop_original
    
    conversions.append({
        'produto': product.get('descricao', ''),
        'codigo': product.get('codigo', ''),
        'cfop_original': cfop_original,
        'cfop_convertido': cfop_convertido,
        'categoria': 'fallback',
        'motivo': f'Fallback: Convertido de {cfop_original} para {cfop_convertido} (mapeamento automático)'
    })

def test_fallback_logic():
    """
    Test the fallback logic when AI classification fails
    """
    print("🔍 Testing Entry CFOP Fallback Logic...")
    
    # Mock company data
    company = {
        'id': 'test-company-123',
        'uf': 'SP',
        'produtos_comercializados': ['Eletrônicos'],
        'insumos_producao': ['Componentes'],
        'produtos_despesa': ['Material de Escritório']
    }
    
    # Mock products with various CFOPs
    mock_products = [
        {
            'codigo': 'PROD001',
            'descricao': 'Notebook Dell',
            'cfop': '5102',
            'emitente_uf': 'SP',
            '_temp_id': '0'
        },
        {
            'codigo': 'PROD002',
            'descricao': 'Papel A4',
            'cfop': '5556', 
            'emitente_uf': 'RJ',
            '_temp_id': '1'
        },
        {
            'codigo': 'PROD003',
            'descricao': 'Componente XYZ',
            'cfop': '5101',
            'emitente_uf': 'MG',
            '_temp_id': '2'
        },
        {
            'codigo': 'PROD004',
            'descricao': 'Gasolina',
            'cfop': '5653',
            'emitente_uf': 'SP',
            '_temp_id': '3'
        }
    ]
    
    print(f"📦 Processing {len(mock_products)} products with incomplete AI results...")
    
    products_for_ai = mock_products.copy()
    file_conversions = []
    
    # Step 1: Get incomplete AI results (simulates AI failure)
    ai_results = mock_classify_products_batch_llm_incomplete(products_for_ai, company)
    
    # Step 2: Process products with AI results and fallback
    for product in products_for_ai:
        temp_id = product.get('_temp_id')
        cfop_original = product.get('cfop', '')
        
        if temp_id in ai_results:
            # Apply AI classification
            classification = ai_results[temp_id]
            apply_classification(product, classification, cfop_original, file_conversions)
            print(f"  ✅ AI Classification: {product['descricao']} -> {product['cfop']} ({classification['categoria']})")
        else:
            # Apply fallback logic
            apply_fallback_cfop(product, cfop_original, file_conversions)
            print(f"  🔄 Fallback Applied: {product['descricao']} -> {product['cfop']} (fallback)")
    
    # Step 3: Verify all products have entry CFOPs
    print(f"\n🔍 Verifying all products have entry CFOPs...")
    
    all_entry_cfops = True
    entry_cfop_count = 0
    ai_count = 0
    fallback_count = 0
    
    for product in mock_products:
        cfop = product.get('cfop', '')
        is_entry_cfop = cfop.startswith('1') or cfop.startswith('2')
        categoria = product.get('categoria_classificada', '')
        
        if is_entry_cfop:
            entry_cfop_count += 1
            if categoria == 'fallback':
                fallback_count += 1
            else:
                ai_count += 1
            print(f"  ✅ {product['descricao']}: {cfop} ({'AI' if categoria != 'fallback' else 'Fallback'})")
        else:
            all_entry_cfops = False
            print(f"  ❌ {product['descricao']}: {cfop} (NOT Entry CFOP)")
    
    # Step 4: Report results
    print(f"\n📊 FALLBACK TEST RESULTS:")
    print(f"  Total products: {len(mock_products)}")
    print(f"  AI classified: {ai_count}")
    print(f"  Fallback applied: {fallback_count}")
    print(f"  Entry CFOPs: {entry_cfop_count}/{len(mock_products)}")
    print(f"  Success rate: {100 * entry_cfop_count / len(mock_products):.1f}%")
    
    print(f"\n📋 DETAILED CONVERSIONS:")
    for conversion in file_conversions:
        print(f"  • {conversion['produto']}")
        print(f"    {conversion['cfop_original']} → {conversion['cfop_convertido']} ({conversion['categoria']})")
        print(f"    {conversion['motivo']}")
        print()
    
    if all_entry_cfops:
        print("✅ SUCCESS: All products converted to entry CFOPs with AI + Fallback")
        return True
    else:
        print("❌ FAILURE: Some products do not have entry CFOPs")
        return False

def main():
    """Main test function"""
    print("🚀 Entry CFOP Fallback Logic Test")
    print("=" * 50)
    
    success = test_fallback_logic()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 FALLBACK TEST PASSED")
        print("✅ Fallback logic ensures all products get entry CFOPs")
        print("✅ System handles AI failures gracefully")
    else:
        print("❌ FALLBACK TEST FAILED")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)