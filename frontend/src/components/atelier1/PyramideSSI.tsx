import React from 'react';

interface PyramideSSIProps {
  maturiteCadre?: number;
  maturiteSocle?: number;
}

export default function PyramideSSI({ maturiteCadre = 0, maturiteSocle = 0 }: PyramideSSIProps) {
  return (
    <div className="relative flex flex-col items-center space-y-4">
      {/* Pyramide SSI */}
      <div className="relative">
        {/* Niveau 1 - Appréciation des risques (sommet) */}
        <div 
          className="mx-auto flex flex-col items-center justify-center text-center py-2 px-4 border-2 border-slate-300 bg-slate-100"
          style={{ 
            width: '140px',
            minHeight: '50px',
            clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)'
          }}
        >
          <span className="text-xs font-semibold text-slate-700">△ Appréciation des risques</span>
          <span className="text-xs text-slate-500 font-mono">—</span>
        </div>

        {/* Niveau 2 - Cadre réglementaire (milieu) */}
        <div 
          className="mx-auto flex flex-col items-center justify-center text-center py-3 px-6 -mt-1 border-2 border-blue-900 bg-blue-900 text-white"
          style={{ 
            width: '230px',
            minHeight: '60px',
            clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0% 100%)'
          }}
        >
          <span className="text-sm font-semibold">⬢ Cadre réglementaire</span>
          <span className="text-sm font-mono">B {maturiteCadre}%</span>
        </div>

        {/* Niveau 3 - Principes de base & Hygiène (base) */}
        <div 
          className="mx-auto flex flex-col items-center justify-center text-center py-4 px-8 -mt-1 border-2 border-emerald-900 bg-emerald-900 text-white"
          style={{ 
            width: '330px',
            minHeight: '70px',
            clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)'
          }}
        >
          <span className="text-base font-semibold">⬢ Principes de base & Hygiène</span>
          <span className="text-base font-mono">A {maturiteSocle}%</span>
        </div>
      </div>

      {/* Légende */}
      <div className="text-center space-y-2 mt-4">
        <p className="text-xs text-slate-600 max-w-md">
          <span className="font-semibold">Le socle (vert) est la base de la sécurité.</span> Sans lui, les niveaux supérieurs ne tiennent pas.
        </p>
        <div className="flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-slate-100 border border-slate-300"></div>
            <span className="text-slate-600">Appréciation</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-900"></div>
            <span className="text-slate-600">Cadre</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-emerald-900"></div>
            <span className="text-slate-600">Socle</span>
          </div>
        </div>
      </div>
    </div>
  );
}