/**
 * Extrai mensagem de erro da resposta da API
 * Lida com diferentes formatos de erro (string, array de objetos Pydantic, etc.)
 */
export const getErrorMessage = (error, defaultMessage = 'Erro desconhecido') => {
  const detail = error?.response?.data?.detail;
  
  if (!detail) {
    return error?.message || defaultMessage;
  }
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail
      .map(e => e.msg || e.message || (typeof e === 'string' ? e : JSON.stringify(e)))
      .join(', ');
  }
  
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  
  return defaultMessage;
};
