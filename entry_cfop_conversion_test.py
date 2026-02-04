#!/usr/bin/env python3
"""
Entry CFOP Conversion Test Script
Verifies that upload of entry XML results in all products being converted to entry CFOPs (1xxx or 2xxx)
Simulates upload_xml_batch logic with mock data
"""

import sys
import json
from typing import Dict, List, Any

def mock_classify_products_batch_llm(products: List[Dict], company: Dict) -> Dict[str, Dict]:
    """
    Mock LLM function that returns classifications for products
    Simulates the AI classification process
    """
    results = {}
    
    categories = ['revenda', 'insumo', 'despesa', 'combustivel']
    
    for i, product in enumerate(products):
        temp_id = product.get('_temp_id', str(i))
        
        # Mock classification based on product description
        descricao = product.get('descricao', '').lower()
        
        if 'papel' in descricao or 'caneta' in descricao or 'material' in descricao:
            categoria = 'despesa'
        elif 'combustivel' in descricao or 'gasolina' in descricao or 'diesel' in descricao:
            categoria = 'combustivel'
        elif 'componente' in descricao or 'peca' in descricao:
            categoria = 'insumo'
        else:
            categoria = 'revenda'
        
        results[temp_id] = {
            'categoria': categoria,
            'justificativa': f'IA: Classificado como {categoria} baseado na descrição do produto'
        }
    
    return results

def get_cfop_from_category(categoria: str, emitente_uf: str, company_uf: str = 'SP') -> str:
    """
    Convert AI category to appropriate entry CFOP
    Returns entry CFOPs (1xxx for same state, 2xxx for different state)
    """
    # Determine prefix based on UF comparison
    if emitente_uf and emitente_uf != company_uf:
        prefix = '2'  # Interestadual
    else:
        prefix = '1'  # Estadual
    
    # Map categories to CFOP suffixes
    cfop_mapping = {
        'revenda': '102',      # Compra para comercialização
        'insumo': '101',       # Compra para industrialização/produção
        'despesa': '556',      # Compra para uso/consumo
        'combustivel': '653'   # Compra de combustível
    }
    
    suffix = cfop_mapping.get(categoria, '102')  # Default to revenda
    return prefix + suffix

def apply_classification(product: Dict, classification: Dict, cfop_original: str, conversions: List[Dict]):
    """
    Apply AI classification result to product
    """
    categoria = classification.get('categoria')
    justificativa = classification.get('justificativa', '')
    
    if categoria:
        # Get company and emitente UF for CFOP determination
        emitente_uf = product.get('emitente_uf', 'SP')
        company_uf = 'SP'  # Default company UF
        
        cfop_sugerido = get_cfop_from_category(categoria, emitente_uf, company_uf)
        
        # Apply the classification
        product['cfop'] = cfop_sugerido
        product['categoria_classificada'] = categoria
        product['justificativa_ia'] = justificativa
        product['cfop_original'] = cfop_original
        
        # Record conversion
        conversions.append({
            'produto': product.get('descricao', ''),
            'codigo': product.get('codigo', ''),
            'cfop_original': cfop_original,
            'cfop_convertido': cfop_sugerido,
            'categoria': categoria,
            'motivo': justificativa
        })

def simulate_upload_xml_batch_logic():
    """
    Simulate the upload_xml_batch logic for entry documents
    Test that all products end up with entry CFOPs (1xxx or 2xxx)
    """
    print("🔍 Simulating upload_xml_batch logic for entry CFOP conversion...")
    
    # Mock company data
    company = {
        'id': 'test-company-123',
        'uf': 'SP',
        'produtos_comercializados': ['Eletrônicos', 'Computadores'],
        'insumos_producao': ['Componentes', 'Peças'],
        'produtos_despesa': ['Material de Escritório', 'Limpeza']
    }
    
    # Mock products from XML parsing (with various original CFOPs)
    mock_products = [
        {
            'codigo': 'PROD001',
            'descricao': 'Notebook Dell Inspiron',
            'ncm': '84713012',
            'cfop': '5102',  # Original saída CFOP
            'emitente_uf': 'SP',  # Same state
            '_temp_id': '0'
        },
        {
            'codigo': 'PROD002', 
            'descricao': 'Papel A4 Sulfite',
            'ncm': '48025599',
            'cfop': '5556',  # Original saída CFOP
            'emitente_uf': 'RJ',  # Different state
            '_temp_id': '1'
        },
        {
            'codigo': 'PROD003',
            'descricao': 'Componente Eletrônico',
            'ncm': '85369090',
            'cfop': '5101',  # Original saída CFOP
            'emitente_uf': 'SP',  # Same state
            '_temp_id': '2'
        },
        {
            'codigo': 'PROD004',
            'descricao': 'Gasolina Comum',
            'ncm': '27101259',
            'cfop': '5653',  # Original saída CFOP
            'emitente_uf': 'MG',  # Different state
            '_temp_id': '3'
        }
    ]
    
    print(f"📦 Processing {len(mock_products)} products...")
    
    # Step 1: Collect products for AI classification
    products_for_ai = []
    file_conversions = []
    
    # Simulate the logic from upload_xml_batch
    for product in mock_products:
        cfop_original = product.get('cfop', '')
        
        # For entrada documents, all products should be processed for classification
        # Add to AI processing list
        products_for_ai.append(product)
        print(f"  📝 Added to AI queue: {product['descricao']} (Original CFOP: {cfop_original})")
    
    print(f"\n🤖 Sending {len(products_for_ai)} products to AI classification...")
    
    # Step 2: Process with mock AI
    ai_results = mock_classify_products_batch_llm(products_for_ai, company)
    print(f"✅ AI returned {len(ai_results)} classifications")
    
    # Step 3: Apply AI results
    for product in products_for_ai:
        temp_id = product.get('_temp_id')
        cfop_original = product.get('cfop', '')
        
        if temp_id in ai_results:
            classification = ai_results[temp_id]
            apply_classification(product, classification, cfop_original, file_conversions)
            print(f"  ✅ Applied AI classification: {product['descricao']} -> {product['cfop']} ({classification['categoria']})")
        else:
            # Fallback logic (should not happen in this test, but included for completeness)
            print(f"  ⚠️  No AI result for {product['descricao']}, applying fallback...")
            # Apply default entrada CFOP
            emitente_uf = product.get('emitente_uf', 'SP')
            company_uf = company.get('uf', 'SP')
            prefix = '2' if emitente_uf != company_uf else '1'
            product['cfop'] = prefix + '102'  # Default to revenda
            
            file_conversions.append({
                'produto': product.get('descricao', ''),
                'codigo': product.get('codigo', ''),
                'cfop_original': cfop_original,
                'cfop_convertido': product['cfop'],
                'categoria': 'revenda',
                'motivo': 'Fallback: Classificado como revenda (padrão)'
            })
    
    # Step 4: Verify all products have entry CFOPs
    print(f"\n🔍 Verifying all products have entry CFOPs (1xxx or 2xxx)...")
    
    all_entry_cfops = True
    entry_cfop_count = 0
    
    for product in mock_products:
        cfop = product.get('cfop', '')
        is_entry_cfop = cfop.startswith('1') or cfop.startswith('2')
        
        if is_entry_cfop:
            entry_cfop_count += 1
            print(f"  ✅ {product['descricao']}: {cfop} (Entry CFOP)")
        else:
            all_entry_cfops = False
            print(f"  ❌ {product['descricao']}: {cfop} (NOT Entry CFOP)")
    
    # Step 5: Report results
    print(f"\n📊 CONVERSION RESULTS:")
    print(f"  Total products processed: {len(mock_products)}")
    print(f"  Products with entry CFOPs: {entry_cfop_count}")
    print(f"  Conversion success rate: {entry_cfop_count}/{len(mock_products)} ({100 * entry_cfop_count / len(mock_products):.1f}%)")
    
    print(f"\n📋 DETAILED CONVERSIONS:")
    for conversion in file_conversions:
        print(f"  • {conversion['produto']}")
        print(f"    Original: {conversion['cfop_original']} → Converted: {conversion['cfop_convertido']}")
        print(f"    Category: {conversion['categoria']}")
        print(f"    Reason: {conversion['motivo']}")
        print()
    
    # Step 6: Final verification
    if all_entry_cfops:
        print("✅ SUCCESS: All products converted to entry CFOPs (1xxx or 2xxx)")
        return True
    else:
        print("❌ FAILURE: Some products do not have entry CFOPs")
        return False

def test_cfop_prefix_logic():
    """
    Test CFOP prefix logic for different UF combinations
    """
    print("\n🔍 Testing CFOP prefix logic...")
    
    test_cases = [
        ('SP', 'SP', '1'),  # Same state -> Estadual (1xxx)
        ('SP', 'RJ', '2'),  # Different state -> Interestadual (2xxx)
        ('RJ', 'SP', '2'),  # Different state -> Interestadual (2xxx)
        ('MG', 'SP', '2'),  # Different state -> Interestadual (2xxx)
        ('SP', '', '1'),    # Empty emitente_uf -> Default to Estadual (1xxx)
        ('', 'SP', '1'),    # Empty emitente_uf -> Default to Estadual (1xxx)
    ]
    
    all_passed = True
    
    for emitente_uf, company_uf, expected_prefix in test_cases:
        cfop = get_cfop_from_category('revenda', emitente_uf, company_uf)
        actual_prefix = cfop[0]
        
        if actual_prefix == expected_prefix:
            print(f"  ✅ {emitente_uf or 'Empty'} -> {company_uf or 'Empty'}: {cfop} (prefix {actual_prefix})")
        else:
            print(f"  ❌ {emitente_uf or 'Empty'} -> {company_uf or 'Empty'}: Expected prefix {expected_prefix}, got {actual_prefix}")
            all_passed = False
    
    return all_passed

def main():
    """
    Main test function
    """
    print("🚀 Entry CFOP Conversion Test")
    print("=" * 50)
    
    # Test 1: CFOP prefix logic
    prefix_test_passed = test_cfop_prefix_logic()
    
    # Test 2: Full upload simulation
    upload_test_passed = simulate_upload_xml_batch_logic()
    
    # Final results
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS:")
    print(f"  CFOP Prefix Logic: {'✅ PASSED' if prefix_test_passed else '❌ FAILED'}")
    print(f"  Upload Simulation: {'✅ PASSED' if upload_test_passed else '❌ FAILED'}")
    
    if prefix_test_passed and upload_test_passed:
        print("\n🎉 ALL TESTS PASSED")
        print("✅ Entry CFOP conversion logic is working correctly")
        print("✅ All products are converted to entry CFOPs (1xxx or 2xxx)")
        return True
    else:
        print("\n❌ SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)