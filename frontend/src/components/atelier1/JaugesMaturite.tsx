import React from 'react';
import { DomaineMaturite, DOMAINE_LABELS, getJaugeColor, getMaturiteLabel, DOMAINE_COLORS } from '../../lib/domaines';

interface MaturiteDomaine {
  domaine: DomaineMaturite;
  niveau_moyen: number | null;
  pourcentage: number;
  nb_controles_evalues: number;
  nb_controles_total: number;
}

interface JaugesMaturiteProps {
  maturiteParDomaine: MaturiteDomaine[];
  onDomaineClick?: (domaine: DomaineMaturite) => void;
}

export default function JaugesMaturite({ maturiteParDomaine, onDomaineClick }: JaugesMaturiteProps) {
  const createGauge = (data: MaturiteDomaine) => {
    const color = getJaugeColor(data.pourcentage);
    const percentage = data.pourcentage || 0;
    const circumference = 2 * Math.PI * 42; // 2 * π * r
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <div 
        key={data.domaine} 
        className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onDomaineClick?.(data.domaine)}
      >
        <div className="relative w-32 h-32 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke="#E2E8F0" 
              strokeWidth="10" 
            />
            {/* Progress circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke={color} 
              strokeWidth="10"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{
                transition: 'stroke-dasharray 0.5s ease-in-out'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="font-bold text-2xl"
              style={{ color }}
            >
              {percentage > 0 ? `${Math.round(percentage)}%` : '—'}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-sm">{DOMAINE_LABELS[data.domaine]}</div>
          <div 
            className="text-xs font-medium"
            style={{ color }}
          >
            {getMaturiteLabel(percentage)}
          </div>
        </div>
        <div className="text-center text-xs text-slate-500">
          {data.nb_controles_evalues}/{data.nb_controles_total} contrôles évalués
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {maturiteParDomaine.map(createGauge)}
    </div>
  );
}