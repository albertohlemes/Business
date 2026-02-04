#!/usr/bin/env python3
"""
AI Classification Fallback Logic Test

This script specifically tests the fallback logic when AI classification fails
or returns incomplete results, ensuring the system handles edge cases gracefully.
"""

import json
import uuid
from typing import List, Dict, Any

# Mock functions from server.py (same as before)
def get_cfop_from_category(categoria: str, cst: str, company_uf: str, cfop_original: str, emitente_uf: str = '') -> str:
    """Helper para converter categoria (IA) em CFOP"""
    is_st = cst in ['10', '30', '60', '70', '201', '202', '203', '500']
    
    # Prefixo Inteligente
    if emitente_uf and emitente_uf != company_uf:
        cfop_prefix = '2'
    else:
        cfop_prefix = '1'
    
    if categoria == 'combustivel':
        return cfop_prefix + '653'
    elif categoria == 'revenda':
        return (cfop_prefix + '403') if is_st else (cfop_prefix + '102')
    elif categoria == 'insumo':
        return (cfop_prefix + '401') if is_st else (cfop_prefix + '101')
    elif categoria == 'despesa':
        return (cfop_prefix + '407') if is_st else (cfop_prefix + '556')
    return None

def apply_classification(product, result, cfop_original, file_conversions):
    """Aplica o resultado da classificação ao produto"""
    product['cfop_sugerido'] = result['cfop_sugerido']
    product['cfop_original'] = cfop_original
    product['categoria_classificada'] = result['categoria']
    product['justificativa_ia'] = result.get('justificativa', '')
    
    # APLICAR AUTOMATICAMENTE O CFOP SUGERIDO
    product['cfop'] = result['cfop_sugerido']
    
    # Registrar conversão
    file_conversions.append({
        'produto': product.get('descricao', ''),
        'codigo': product.get('codigo', ''),
        'cfop_original': cfop_original,
        'cfop_convertido': result['cfop_sugerido'],
        'categoria': result['categoria'],
        'motivo': result.get('justificativa', f"Classificado como {result['categoria'].upper()}")
    })

# Mock LLM function that returns INCOMPLETE results (simulating AI failure)
async def mock_classify_products_batch_llm_with_failures(products: List[Dict[str, Any]], company_data: Dict[str, Any], batch_size: int = 20) -> Dict[str, Any]:
    """
    MOCK VERSION that simulates AI failures/incomplete results
    Only returns results for some products to test fallback logic
    """
    if not products:
        return {}
        
    classified_results = {}
    
    # Simulate AI only processing first 2 products successfully
    # Products 2 and 3 will have no AI results (testing fallback)
    for i, product in enumerate(products):
        if i >= 2:  # Skip products 2 and 3 to simulate AI failure
            continue
            
        p_id = product.get('_temp_id')
        descricao = product.get('descricao', '').lower()
        
        # Mock classification for first 2 products only
        if 'notebook' in descricao:
            categoria = 'revenda'
            justificativa = 'Produto eletrônico para comercialização'
        elif 'papel' in descricao:
            categoria = 'despesa'
            justificativa = 'Material de uso e consumo'
        else:
            categoria = 'revenda'
            justificativa = 'Produto presumido para revenda'
        
        classified_results[p_id] = {
            "categoria": categoria,
            "justificativa": justificativa
        }
    
    return classified_results

# Test data
def create_test_products():
    """Create test products for fallback testing"""
    return [
        {
            'codigo': 'LAPTOP001',
            'descricao': 'Notebook Dell Inspiron 15',
            'ncm': '84713012',
            'cfop': '5102',  # Will be processed by AI
            'cst': '00',
            'quantidade': 1.0,
            'valor_unitario': 2500.0,
            'valor_total': 2500.0,
            'unidade': 'UN'
        },
        {
            'codigo': 'PAPEL001',
            'descricao': 'Papel A4 Sulfite',
            'ncm': '48025599',
            'cfop': '5556',  # Will be processed by AI
            'cst': '00',
            'quantidade': 10.0,
            'valor_unitario': 25.0,
            'valor_total': 250.0,
            'unidade': 'PCT'
        },
        {
            'codigo': 'COMP001',
            'descricao': 'Componente Eletrônico',
            'ncm': '85369090',
            'cfop': '5101',  # Will NOT be processed by AI (fallback test)
            'cst': '00',
            'quantidade': 5.0,
            'valor_unitario': 100.0,
            'valor_total': 500.0,
            'unidade': 'UN'
        },
        {
            'codigo': 'UNKNOWN001',
            'descricao': 'Produto Desconhecido XYZ',
            'ncm': '99999999',
            'cfop': '5102',  # Will NOT be processed by AI (fallback test)
            'cst': '00',
            'quantidade': 1.0,
            'valor_unitario': 150.0,
            'valor_total': 150.0,
            'unidade': 'UN'
        }
    ]

def create_test_company():
    """Create test company data"""
    return {
        'id': 'test-company-123',
        'razao_social': 'Empresa Teste LTDA',
        'uf': 'SP',
        'tipo_atividade': 'comercio',
        'produtos_comercializados': ['Eletrônicos', 'Computadores'],
        'insumos_producao': ['Componentes', 'Peças'],
        'produtos_despesa': ['Material de Escritório', 'Limpeza']
    }

async def test_ai_classification_fallback_logic():
    """Test the AI classification fallback logic with incomplete AI results"""
    print("🧪 Testing AI Classification Fallback Logic")
    print("=" * 50)
    
    # Test setup
    products_for_ai = create_test_products()
    company = create_test_company()
    emitente_uf = 'RJ'  # Different from company UF (SP) to test interestadual logic
    uf_empresa = company.get('uf', 'SP')
    file_conversions = []
    
    # CFOP conversion mapping (from real code)
    CFOP_SAIDA_PARA_ENTRADA = {
        '5102': '1102', '5101': '1101', '5556': '1556', '5653': '1653',
        '5910': '1910', '5911': '1911', '5912': '1912', '5913': '1913',
        '5914': '1914', '5915': '1915', '5916': '1916', '5917': '1917',
        '5918': '1918', '5919': '1919', '5920': '1920', '5921': '1921',
        '5922': '1922', '5923': '1923', '5924': '1924', '5925': '1925',
        '5949': '1949', '5201': '1201', '5202': '1202', '5208': '1208',
        '5209': '1209', '5210': '1210', '5122': '1102', '5123': '1102',
        '6910': '2910', '6911': '2911', '6912': '2912', '6913': '2913',
        '6949': '2949', '6201': '2201', '6202': '2202', '6122': '2102',
    }
    
    # Step 1: Add temporary IDs to products
    print("\n📋 Step 1: Adding temporary IDs to products...")
    for idx, product in enumerate(products_for_ai):
        product['_temp_id'] = str(idx)
        print(f"   Product {idx}: {product['descricao']} -> ID: {product['_temp_id']}")
    
    # Step 2: Call mock AI classification (with failures)
    print("\n🤖 Step 2: Calling mock AI classification (with simulated failures)...")
    ai_results = await mock_classify_products_batch_llm_with_failures(products_for_ai, company)
    print(f"   AI returned {len(ai_results)} classifications out of {len(products_for_ai)} products")
    print(f"   Missing results for products: {set(str(i) for i in range(len(products_for_ai))) - set(ai_results.keys())}")
    
    # Step 3: Test the ID mapping and fallback logic
    print("\n🔄 Step 3: Testing ID mapping and fallback logic...")
    
    successful_mappings = 0
    fallback_cases = 0
    
    for product in products_for_ai:
        p_id = product.get('_temp_id')
        cfop_original = product.get('cfop', '')
        
        print(f"\n   Processing product: {product['descricao']}")
        print(f"   - Temp ID: {p_id}")
        print(f"   - Original CFOP: {cfop_original}")
        
        if p_id in ai_results:
            # Test successful ID mapping
            result = ai_results[p_id]
            print(f"   - AI Classification: {result['categoria']}")
            print(f"   - AI Justification: {result['justificativa']}")
            
            # Test CFOP conversion
            cfop_sugerido = get_cfop_from_category(
                result['categoria'], 
                product.get('cst', ''), 
                company.get('uf', 'SP'),
                product.get('cfop', ''),
                emitente_uf
            )
            
            print(f"   - Suggested CFOP: {cfop_sugerido}")
            
            if cfop_sugerido:
                classification_data = {
                    "cfop_sugerido": cfop_sugerido,
                    "categoria": result['categoria'],
                    "justificativa": f"IA ({result['categoria'].upper()}): {result['justificativa']}"
                }
                
                apply_classification(product, classification_data, cfop_original, file_conversions)
                print(f"   - ✅ Applied CFOP: {product['cfop']} (was {cfop_original})")
                successful_mappings += 1
            else:
                print(f"   - ❌ No CFOP suggested for category: {result['categoria']}")
        else:
            # Test fallback logic (this is the key test)
            print(f"   - ⚠️  No AI result found for ID {p_id} - TESTING FALLBACK LOGIC")
            
            # Simulate the exact fallback logic from the real code
            cfop_padrao = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original, cfop_original)
            
            # Adjust prefix if interestadual
            if emitente_uf and emitente_uf != uf_empresa:
                if cfop_padrao.startswith('1'):
                    cfop_padrao = '2' + cfop_padrao[1:]
            
            print(f"   - Fallback CFOP mapping: {cfop_original} -> {cfop_padrao}")
            print(f"   - Interestadual adjustment: {emitente_uf} != {uf_empresa} = {emitente_uf != uf_empresa}")
            
            if cfop_padrao != cfop_original:
                product['cfop'] = cfop_padrao
                file_conversions.append({
                    'produto': product.get('descricao', ''),
                    'codigo': product.get('codigo', ''),
                    'cfop_original': cfop_original,
                    'cfop_convertido': cfop_padrao,
                    'categoria': 'fallback',
                    'motivo': f"Fallback: Conversão padrão de {cfop_original} para {cfop_padrao}"
                })
                print(f"   - ✅ Fallback applied: {cfop_padrao} (was {cfop_original})")
                fallback_cases += 1
            else:
                print(f"   - ℹ️  No conversion needed: {cfop_original}")
    
    # Step 4: Verify fallback results
    print("\n📊 Step 4: Fallback Logic Verification")
    print(f"   - Total products processed: {len(products_for_ai)}")
    print(f"   - Successful AI mappings: {successful_mappings}")
    print(f"   - Fallback cases triggered: {fallback_cases}")
    print(f"   - Total conversions recorded: {len(file_conversions)}")
    
    # Verify that fallback was triggered for the expected products
    expected_fallback_products = ['Componente Eletrônico', 'Produto Desconhecido XYZ']
    actual_fallback_products = [conv['produto'] for conv in file_conversions if conv['categoria'] == 'fallback']
    
    print(f"\n   Expected fallback products: {expected_fallback_products}")
    print(f"   Actual fallback products: {actual_fallback_products}")
    
    fallback_test_passed = set(expected_fallback_products) == set(actual_fallback_products)
    if fallback_test_passed:
        print("   ✅ Fallback logic triggered for correct products")
    else:
        print("   ❌ Fallback logic not triggered correctly")
    
    # Step 5: Test edge cases
    print("\n🎯 Step 5: Testing Edge Cases")
    
    # Test with empty AI results
    empty_ai_results = {}
    edge_case_products = [{'_temp_id': '0', 'descricao': 'Test Product', 'cfop': '5102', 'cst': '00'}]
    
    edge_fallbacks = 0
    for product in edge_case_products:
        p_id = product.get('_temp_id')
        if p_id not in empty_ai_results:
            cfop_original = product.get('cfop', '')
            cfop_padrao = CFOP_SAIDA_PARA_ENTRADA.get(cfop_original, cfop_original)
            
            if emitente_uf and emitente_uf != uf_empresa:
                if cfop_padrao.startswith('1'):
                    cfop_padrao = '2' + cfop_padrao[1:]
            
            if cfop_padrao != cfop_original:
                edge_fallbacks += 1
    
    print(f"   Edge case test (empty AI results): {edge_fallbacks} fallbacks triggered")
    
    # Step 6: Display conversion report
    print("\n📋 Step 6: Conversion Report")
    ai_conversions = [c for c in file_conversions if c['categoria'] != 'fallback']
    fallback_conversions = [c for c in file_conversions if c['categoria'] == 'fallback']
    
    print(f"\n   AI-based conversions ({len(ai_conversions)}):")
    for i, conversion in enumerate(ai_conversions, 1):
        print(f"   {i}. {conversion['produto']}")
        print(f"      {conversion['cfop_original']} → {conversion['cfop_convertido']}")
        print(f"      Category: {conversion['categoria']}")
        print(f"      Reason: {conversion['motivo']}")
    
    print(f"\n   Fallback conversions ({len(fallback_conversions)}):")
    for i, conversion in enumerate(fallback_conversions, 1):
        print(f"   {i}. {conversion['produto']}")
        print(f"      {conversion['cfop_original']} → {conversion['cfop_convertido']}")
        print(f"      Category: {conversion['categoria']}")
        print(f"      Reason: {conversion['motivo']}")
    
    # Final assessment
    print("\n🏁 Final Assessment")
    print("=" * 50)
    
    all_tests_passed = (
        successful_mappings == 2 and  # First 2 products should have AI results
        fallback_cases == 2 and      # Last 2 products should use fallback
        fallback_test_passed and     # Correct products used fallback
        len(file_conversions) == 4   # All products should have conversions
    )
    
    if all_tests_passed:
        print("✅ ALL FALLBACK TESTS PASSED - Fallback Logic is Robust")
        print("\nKey Findings:")
        print("- Fallback logic activates when AI results are missing")
        print("- CFOP conversion mapping works correctly")
        print("- Interestadual prefix adjustment works")
        print("- All products get processed (AI or fallback)")
        print("- No products are left unprocessed")
    else:
        print("❌ SOME FALLBACK TESTS FAILED - Review the issues above")
    
    return all_tests_passed

if __name__ == "__main__":
    import asyncio
    
    print("AI Classification Fallback Logic Test")
    print("This script verifies the fallback logic when AI classification fails")
    print()
    
    # Run the test
    result = asyncio.run(test_ai_classification_fallback_logic())
    
    if result:
        print("\n🎉 SUCCESS: The AI classification fallback logic is working correctly!")
    else:
        print("\n⚠️  WARNING: Issues found in the AI classification fallback logic!")
    
    exit(0 if result else 1)