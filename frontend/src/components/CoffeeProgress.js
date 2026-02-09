import React from 'react';

// Componente de animação do contador tomando café
// O nível do café diminui conforme o progresso aumenta
const CoffeeProgress = ({ progress = 0, message = "Processando...", showPercentage = true }) => {
  // Inverter o progresso para que o café diminua conforme o progresso aumenta
  const coffeeLevel = 100 - progress;
  const isComplete = progress >= 100;
  
  return (
    <div className="flex flex-col items-center justify-center py-4 px-6">
      {/* Contador com café */}
      <div className="relative w-32 h-32 mb-4">
        {/* Mesa/Base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 bg-[#8B4513] rounded-full shadow-md" />
        
        {/* Corpo do contador (pessoa) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          {/* Corpo */}
          <div className="w-12 h-16 bg-gradient-to-b from-[#4A90A4] to-[#357385] rounded-t-xl relative">
            {/* Gravata */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-6 bg-[#C8A951]" />
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-[#C8A951]" />
          </div>
          
          {/* Cabeça */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#FFDAB9] rounded-full">
            {/* Olhos */}
            <div className="absolute top-4 left-2 w-1.5 h-1.5 bg-[#333] rounded-full" />
            <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-[#333] rounded-full" />
            {/* Boca - sorrindo se completo */}
            {isComplete ? (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-2 border-b-2 border-[#333] rounded-b-full" />
            ) : (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#333] rounded-full" />
            )}
            {/* Cabelo */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-4 bg-[#3D2314] rounded-t-full" />
          </div>
          
          {/* Braços */}
          <div 
            className="absolute top-4 -right-6 w-6 h-3 bg-[#4A90A4] rounded-full origin-left transition-transform duration-500"
            style={{ transform: `rotate(${isComplete ? -20 : -45}deg)` }}
          />
          <div className="absolute top-4 -left-6 w-6 h-3 bg-[#4A90A4] rounded-full origin-right" style={{ transform: 'rotate(30deg)' }} />
        </div>
        
        {/* Xícara de café */}
        <div className="absolute bottom-2 right-2 transform transition-all duration-500" style={{ transform: isComplete ? 'translateY(-5px)' : 'translateY(0)' }}>
          {/* Corpo da xícara */}
          <div className="relative w-8 h-7 bg-white rounded-b-lg border-2 border-[#DDD] overflow-hidden">
            {/* Café dentro da xícara */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3D2314] to-[#6B4423] transition-all duration-300"
              style={{ height: `${coffeeLevel}%` }}
            />
            {/* Brilho da xícara */}
            <div className="absolute top-1 left-1 w-1 h-3 bg-white/30 rounded-full" />
          </div>
          {/* Alça da xícara */}
          <div className="absolute top-1 -right-2 w-3 h-4 border-2 border-[#DDD] rounded-r-full bg-transparent" />
          {/* Pires */}
          <div className="absolute -bottom-1 -left-1 w-10 h-2 bg-white rounded-full border border-[#DDD]" />
          
          {/* Vapor (apenas se ainda tem café) */}
          {!isComplete && coffeeLevel > 20 && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1 h-3 bg-white/40 rounded-full animate-vapor-1" />
              <div className="w-1 h-4 bg-white/30 rounded-full animate-vapor-2" />
              <div className="w-1 h-3 bg-white/40 rounded-full animate-vapor-3" />
            </div>
          )}
        </div>
        
        {/* Efeito de conclusão */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Mensagem */}
      <div className="text-center">
        <p className="text-white font-medium text-sm mb-1">
          {isComplete ? '✓ Concluído!' : message}
        </p>
        {showPercentage && (
          <p className={`text-lg font-bold ${isComplete ? 'text-green-400' : 'text-[#C8A951]'}`}>
            {Math.round(progress)}%
          </p>
        )}
        {!isComplete && (
          <p className="text-[#666] text-xs mt-1">
            Aguarde enquanto o contador toma seu café...
          </p>
        )}
      </div>
      
      {/* Estilos de animação inline */}
      <style>{`
        @keyframes vapor1 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-8px) scale(1.2); opacity: 0.1; }
        }
        @keyframes vapor2 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-10px) scale(1.3); opacity: 0.1; }
        }
        @keyframes vapor3 {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-6px) scale(1.1); opacity: 0.1; }
        }
        .animate-vapor-1 { animation: vapor1 2s ease-in-out infinite; }
        .animate-vapor-2 { animation: vapor2 2.5s ease-in-out infinite 0.3s; }
        .animate-vapor-3 { animation: vapor3 2s ease-in-out infinite 0.6s; }
      `}</style>
    </div>
  );
};

export default CoffeeProgress;
