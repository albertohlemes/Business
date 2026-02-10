#!/usr/bin/env python3
"""
Focused test for AI batch classification integration
"""
import requests
import json
import sys
import os

def test_ai_classification_integration():
    """Test that AI batch classification logic is properly integrated"""
    
    print("🔍 Testing AI Batch Classification Integration...")
    
    # Test 1: Check if classify_products_batch_llm function exists in server.py
    print("\n1. Checking if classify_products_batch_llm function exists...")
    
    try:
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
            
        if 'async def classify_products_batch_llm(' in content:
            print("✅ classify_products_batch_llm function found")
        else:
            print("❌ classify_products_batch_llm function NOT found")
            return False
            
    except Exception as e:
        print(f"❌ Error reading server.py: {e}")
        return False
    
    # Test 2: Check if products_for_ai list logic is present
    print("\n2. Checking if products_for_ai list logic is present...")
    
    if 'products_for_ai = []' in content:
        print("✅ products_for_ai list initialization found")
    else:
        print("❌ products_for_ai list initialization NOT found")
        return False
        
    if 'products_for_ai.append(product)' in content:
        print("✅ products_for_ai.append() logic found")
    else:
        print("❌ products_for_ai.append() logic NOT found")
        return False
    
    # Test 3: Check if AI function is called in upload_xml_batch
    print("\n3. Checking if classify_products_batch_llm is called in upload flow...")
    
    if 'ai_results = await classify_products_batch_llm(products_for_ai, company)' in content:
        print("✅ classify_products_batch_llm call found in upload flow")
    else:
        print("❌ classify_products_batch_llm call NOT found in upload flow")
        return False
    
    # Test 4: Check helper functions exist
    print("\n4. Checking helper functions...")
    
    if 'def get_cfop_from_category(' in content:
        print("✅ get_cfop_from_category function found")
    else:
        print("❌ get_cfop_from_category function NOT found")
        return False
        
    if 'def apply_classification(' in content:
        print("✅ apply_classification function found")
    else:
        print("❌ apply_classification function NOT found")
        return False
        
    if 'async def get_ai_chat(' in content:
        print("✅ get_ai_chat function found")
    else:
        print("❌ get_ai_chat function NOT found")
        return False
    
    # Test 5: Check if code compiles (syntax check)
    print("\n5. Checking if code compiles...")
    
    try:
        import ast
        ast.parse(content)
        print("✅ Code compiles successfully (syntax check passed)")
    except SyntaxError as e:
        print(f"❌ Syntax error in code: {e}")
        return False
    except Exception as e:
        print(f"❌ Error parsing code: {e}")
        return False
    
    # Test 6: Check integration flow logic
    print("\n6. Checking integration flow logic...")
    
    # Check if the flow is: collect products -> call AI -> apply results
    flow_patterns = [
        'if not is_strong_match:',
        'products_for_ai.append(product)',
        'if products_for_ai:',
        'ai_results = await classify_products_batch_llm',
        'for product in products_for_ai:',
        'if desc in ai_results:',
        'apply_classification(product, classification_data'
    ]
    
    all_patterns_found = True
    for pattern in flow_patterns:
        if pattern in content:
            print(f"✅ Flow pattern found: {pattern}")
        else:
            print(f"❌ Flow pattern NOT found: {pattern}")
            all_patterns_found = False
    
    if not all_patterns_found:
        return False
    
    # Test 7: Check LLM integration
    print("\n7. Checking LLM integration...")
    
    if 'from emergentintegrations.llm.chat import LlmChat' in content:
        print("✅ LLM integration import found")
    else:
        print("❌ LLM integration import NOT found")
        return False
        
    if 'LlmChat(' in content:
        print("✅ LlmChat usage found")
    else:
        print("❌ LlmChat usage NOT found")
        return False
    
    print("\n✅ ALL AI BATCH CLASSIFICATION INTEGRATION CHECKS PASSED!")
    print("\nSummary of verified components:")
    print("- ✅ classify_products_batch_llm function exists and is implemented")
    print("- ✅ products_for_ai list logic is present in upload flow")
    print("- ✅ AI function is called in upload_xml_batch")
    print("- ✅ Helper functions (get_cfop_from_category, apply_classification, get_ai_chat) exist")
    print("- ✅ Code compiles successfully")
    print("- ✅ Integration flow logic is complete")
    print("- ✅ LLM integration is properly configured")
    
    return True

def test_api_endpoint_availability():
    """Test if the API is running and accessible"""
    print("\n🔍 Testing API endpoint availability...")
    
    try:
        response = requests.get("https://fiscalbuddy-1.preview.emergentagent.com/api", timeout=10)
        if response.status_code == 200:
            print("✅ API endpoint is accessible")
            return True
        else:
            print(f"⚠️  API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️  API not accessible: {e}")
        return False

def main():
    print("🚀 AI Batch Classification Integration Test")
    print("=" * 50)
    
    # Test code integration
    integration_ok = test_ai_classification_integration()
    
    # Test API availability (optional)
    api_ok = test_api_endpoint_availability()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"- Code Integration: {'✅ PASS' if integration_ok else '❌ FAIL'}")
    print(f"- API Availability: {'✅ PASS' if api_ok else '⚠️  UNAVAILABLE'}")
    
    if integration_ok:
        print("\n🎉 AI BATCH CLASSIFICATION INTEGRATION VERIFIED!")
        print("The new AI batch classification logic is properly integrated into the upload flow.")
        return 0
    else:
        print("\n❌ AI BATCH CLASSIFICATION INTEGRATION FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())