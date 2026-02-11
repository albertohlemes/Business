import React from 'react';

// Componente de Loading com animação elegante
export const LoadingSpinner = ({ size = 'md', color = 'gold', text = '' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colors = {
    gold: 'border-[#C8A951]',
    white: 'border-white',
    blue: 'border-blue-500',
    green: 'border-green-500'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`${sizes[size]} border-2 border-t-transparent ${colors[color]} rounded-full animate-spin`}
      />
      {text && <p className="text-[#A1A1AA] text-sm animate-pulse">{text}</p>}
    </div>
  );
};

// Skeleton para cards
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-[#141414] rounded-xl p-4 border border-[#2A2A2A] animate-pulse ${className}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#2A2A2A] rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#2A2A2A] rounded w-1/3" />
        <div className="h-5 bg-[#2A2A2A] rounded w-1/2" />
      </div>
    </div>
  </div>
);

// Skeleton para tabelas
export const SkeletonTable = ({ rows = 5 }) => (
  <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden animate-pulse">
    <div className="bg-[#0C0C0C] px-4 py-3 flex gap-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-4 bg-[#2A2A2A] rounded flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="px-4 py-3 flex gap-4 border-t border-[#2A2A2A]">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-4 bg-[#1A1A1A] rounded flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Skeleton para página inteira
export const SkeletonPage = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="h-8 bg-[#2A2A2A] rounded w-48" />
        <div className="h-4 bg-[#1A1A1A] rounded w-64" />
      </div>
      <div className="h-10 bg-[#2A2A2A] rounded w-32" />
    </div>
    
    {/* Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
    </div>
    
    {/* Table */}
    <SkeletonTable rows={5} />
  </div>
);

// Toast/Notification component
export const Toast = ({ type = 'info', message, onClose }) => {
  const types = {
    success: 'bg-green-900/90 border-green-700 text-green-300',
    error: 'bg-red-900/90 border-red-700 text-red-300',
    warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-300',
    info: 'bg-blue-900/90 border-blue-700 text-blue-300'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border ${types[type]} 
        flex items-center gap-3 shadow-lg animate-slide-in-right z-50`}
    >
      <span className="text-lg">{icons[type]}</span>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
      )}
    </div>
  );
};

// Badge component
export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-[#2A2A2A] text-white',
    success: 'bg-green-900/50 text-green-400 border border-green-700',
    error: 'bg-red-900/50 text-red-400 border border-red-700',
    warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-700',
    gold: 'bg-[#C8A951]/20 text-[#C8A951] border border-[#C8A951]/50'
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

// Empty State component
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {Icon && (
      <div className="p-4 bg-[#1A1A1A] rounded-full mb-4">
        <Icon className="w-12 h-12 text-[#A1A1AA] opacity-50" />
      </div>
    )}
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    {description && <p className="text-[#A1A1AA] mb-4 max-w-md">{description}</p>}
    {action && actionLabel && (
      <button
        onClick={action}
        className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#b39642] transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// Stat Card component melhorado
export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendValue,
  color = 'gold',
  loading = false 
}) => {
  const colors = {
    gold: 'bg-[#C8A951]/20 text-[#C8A951]',
    blue: 'bg-blue-900/30 text-blue-400',
    green: 'bg-green-900/30 text-green-400',
    red: 'bg-red-900/30 text-red-400',
    purple: 'bg-purple-900/30 text-purple-400'
  };

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <p className="text-sm text-[#A1A1AA]">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
        {trend && (
          <div className={`text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  LoadingSpinner,
  SkeletonCard,
  SkeletonTable,
  SkeletonPage,
  Toast,
  Badge,
  EmptyState,
  StatCard
};
