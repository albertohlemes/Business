/**
 * Gera um código curto a partir do ID da empresa
 */
export const generateEmpresaCode = (id, codigoInterno = null) => {
  if (codigoInterno) return codigoInterno;
  if (!id) return '';
  return `#${id.slice(0, 4).toUpperCase()}`;
};

/**
 * Retorna o label formatado da empresa com código antes do nome
 */
export const getEmpresaLabel = (empresa) => {
  if (!empresa) return '';
  const codigo = generateEmpresaCode(empresa.id, empresa.codigo_interno);
  const nome = empresa.nome_fantasia || empresa.razao_social;
  return `${codigo} - ${nome}`;
};

/**
 * Ordena a lista de clientes priorizando a empresa selecionada
 */
export const sortClientesBySelection = (clientes, selectedId) => {
  if (!selectedId) return clientes;
  return [...clientes].sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    return 0;
  });
};
