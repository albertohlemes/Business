import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Componente de cabeçalho de coluna ordenável
 * Uso: <SortableHeader label="Nome" field="nome" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
 */
export const SortableHeader = ({ 
  label, 
  field, 
  sortField, 
  sortDirection, 
  onSort, 
  className = "",
  align = "left" 
}) => {
  const isActive = sortField === field;
  
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align] || 'text-left';
  
  return (
    <th 
      className={`px-3 py-2 text-xs font-medium text-[#A1A1AA] uppercase cursor-pointer hover:text-white hover:bg-white/5 transition-colors select-none ${alignClass} ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-[#C8A951]" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#C8A951]" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
};

/**
 * Hook para gerenciar ordenação de dados
 */
export const useSortableData = (initialData, initialField = '', initialDirection = 'asc') => {
  const [sortField, setSortField] = React.useState(initialField);
  const [sortDirection, setSortDirection] = React.useState(initialDirection);
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedData = React.useMemo(() => {
    if (!sortField || !Array.isArray(initialData)) return initialData;
    
    return [...initialData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle null/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal, 'pt-BR');
      }
      return bVal.localeCompare(aVal, 'pt-BR');
    });
  }, [initialData, sortField, sortDirection]);
  
  return {
    sortedData,
    sortField,
    sortDirection,
    handleSort
  };
};

/**
 * Função utilitária para ordenar arrays
 */
export const sortData = (data, field, direction = 'asc') => {
  if (!field || !Array.isArray(data)) return data;
  
  return [...data].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    
    if (direction === 'asc') {
      return aVal.localeCompare(bVal, 'pt-BR');
    }
    return bVal.localeCompare(aVal, 'pt-BR');
  });
};

export default SortableHeader;
