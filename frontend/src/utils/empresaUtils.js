// Utilitários para formatação de empresa

/**
 * Gera o código da empresa a partir do ID
 * @param {string} id - ID da empresa
 * @param {string} codigoInterno - Código interno opcional
 * @returns {string} - Código formatado (#XXXX)
 */
export const getEmpresaCodigo = (id, codigoInterno = null) => {
  if (codigoInterno) return `#${codigoInterno}`;
  if (!id) return '';
  return `#${id.slice(0, 4).toUpperCase()}`;
};

/**
 * Retorna o nome da empresa com código na frente
 * @param {object} empresa - Objeto da empresa
 * @returns {string} - Nome formatado (#XXXX Nome Fantasia)
 */
export const getEmpresaNomeCompleto = (empresa) => {
  if (!empresa) return '';
  const codigo = getEmpresaCodigo(empresa.id, empresa.codigo_interno);
  const nome = empresa.nome_fantasia || empresa.razao_social;
  return `${codigo} ${nome}`;
};

/**
 * Retorna apenas o nome da empresa (fantasia ou razão social)
 * @param {object} empresa - Objeto da empresa
 * @returns {string} - Nome da empresa
 */
export const getEmpresaNome = (empresa) => {
  if (!empresa) return '';
  return empresa.nome_fantasia || empresa.razao_social || '';
};

/**
 * Formata competência garantindo o formato MM/AAAA
 * @param {string} comp - Competência em qualquer formato
 * @returns {string} - Competência formatada (MM/AAAA)
 */
export const formatCompetencia = (comp) => {
  if (!comp) return '';
  // Se já tem barra, retorna como está
  if (comp.includes('/')) return comp;
  // Se não tem, formata
  if (comp.length >= 6) {
    return `${comp.slice(0, 2)}/${comp.slice(2, 6)}`;
  }
  return comp;
};
