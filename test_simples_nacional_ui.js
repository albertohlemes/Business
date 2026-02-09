// Test script to verify Simples Nacional UI components
// This script checks if the new Simples Nacional section is properly integrated

const fs = require('fs');
const path = require('path');

// Read the Companies.js file
const companiesFilePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Companies.js');
const companiesContent = fs.readFileSync(companiesFilePath, 'utf8');

console.log('🔍 Testing Simples Nacional UI Integration...\n');

// Test 1: Check if Simples Nacional configuration section exists
const hasSimplesSectionRegex = /Configuração Simples Nacional/;
const hasSimplesSectionTest = hasSimplesSectionRegex.test(companiesContent);
console.log(`✅ Test 1 - Simples Nacional section exists: ${hasSimplesSectionTest ? 'PASS' : 'FAIL'}`);

// Test 2: Check if anexos selection is implemented
const hasAnexosSelectionRegex = /Anexos do Simples Nacional/;
const hasAnexosSelectionTest = hasAnexosSelectionRegex.test(companiesContent);
console.log(`✅ Test 2 - Anexos selection implemented: ${hasAnexosSelectionTest ? 'PASS' : 'FAIL'}`);

// Test 3: Check if Fator R control is implemented
const hasFatorRRegex = /Controla Fator R/;
const hasFatorRTest = hasFatorRRegex.test(companiesContent);
console.log(`✅ Test 3 - Fator R control implemented: ${hasFatorRTest ? 'PASS' : 'FAIL'}`);

// Test 4: Check if anexo confirmation modal exists
const hasConfirmModalRegex = /Modal de Confirmação de Alteração de Anexo/;
const hasConfirmModalTest = hasConfirmModalRegex.test(companiesContent);
console.log(`✅ Test 4 - Anexo confirmation modal exists: ${hasConfirmModalTest ? 'PASS' : 'FAIL'}`);

// Test 5: Check if anexos are automatically suggested based on CNAEs
const hasAnexoSuggestionRegex = /sugerirAnexosPorCnaes/;
const hasAnexoSuggestionTest = hasAnexoSuggestionRegex.test(companiesContent);
console.log(`✅ Test 5 - Anexo suggestion logic exists: ${hasAnexoSuggestionTest ? 'PASS' : 'FAIL'}`);

// Test 6: Check if form data includes new Simples Nacional fields
const hasAnexosFieldRegex = /anexos_simples:/;
const hasAnexosFieldTest = hasAnexosFieldRegex.test(companiesContent);
console.log(`✅ Test 6 - Form includes anexos_simples field: ${hasAnexosFieldTest ? 'PASS' : 'FAIL'}`);

const hasAnexosConfirmadosFieldRegex = /anexos_confirmados:/;
const hasAnexosConfirmadosFieldTest = hasAnexosConfirmadosFieldRegex.test(companiesContent);
console.log(`✅ Test 7 - Form includes anexos_confirmados field: ${hasAnexosConfirmadosFieldTest ? 'PASS' : 'FAIL'}`);

const hasControlaFatorRFieldRegex = /controla_fator_r:/;
const hasControlaFatorRFieldTest = hasControlaFatorRFieldRegex.test(companiesContent);
console.log(`✅ Test 8 - Form includes controla_fator_r field: ${hasControlaFatorRFieldTest ? 'PASS' : 'FAIL'}`);

const hasFolhaPagamentoFieldRegex = /folha_pagamento_12m:/;
const hasFolhaPagamentoFieldTest = hasFolhaPagamentoFieldRegex.test(companiesContent);
console.log(`✅ Test 9 - Form includes folha_pagamento_12m field: ${hasFolhaPagamentoFieldTest ? 'PASS' : 'FAIL'}`);

// Test 10: Check if handleSubmit marks anexos as confirmed
const hasAutoConfirmRegex = /anexos_confirmados = true/;
const hasAutoConfirmTest = hasAutoConfirmRegex.test(companiesContent);
console.log(`✅ Test 10 - Auto-confirm anexos on save: ${hasAutoConfirmTest ? 'PASS' : 'FAIL'}`);

// Summary
const allTests = [
  hasSimplesSectionTest,
  hasAnexosSelectionTest,
  hasFatorRTest,
  hasConfirmModalTest,
  hasAnexoSuggestionTest,
  hasAnexosFieldTest,
  hasAnexosConfirmadosFieldTest,
  hasControlaFatorRFieldTest,
  hasFolhaPagamentoFieldTest,
  hasAutoConfirmTest
];

const passedTests = allTests.filter(test => test).length;
const totalTests = allTests.length;

console.log(`\n📊 Summary: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Simples Nacional UI integration is complete.');
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
}