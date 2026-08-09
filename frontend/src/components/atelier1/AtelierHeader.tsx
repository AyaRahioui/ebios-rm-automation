import { Shield, ChevronRight, User } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface ActiviteStep {
  label: string;
  status: 'NON_DEMARRE' | 'EN_COURS' | 'TERMINE';
}

interface AtelierHeaderProps {
  atelierName: string;
  etudeNom: string;
  consultantNom: string;
  consultantRole: string;
  activites: ActiviteStep[];
  activeStepIndex: number;
  onStepClick?: (index: number) => void;
}

const BORDEAUX_COLOR = '#7a2333';

export default function AtelierHeader({
  atelierName,
  etudeNom,
  consultantNom,
  consultantRole,
  activites,
  activeStepIndex,
  onStepClick,
}: AtelierHeaderProps) {
  const completedSteps = activites.filter(a => a.status === 'TERMINE').length;
  const totalSteps = activites.length;

  return (
    <div className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Main header bar */}
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Left side: Logo + Text */}
        <div className="flex items-center gap-3">
          {/* Logo badge */}
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: BORDEAUX_COLOR }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          
          {/* Text block */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              EBIOS-RM · {atelierName}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {etudeNom}
            </span>
          </div>
        </div>

        {/* Right side: User badge + Progression */}
        <div className="flex items-center gap-4">
          {/* User badge */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <span className="text-sm text-slate-600">
              {consultantNom} — {consultantRole}
            </span>
          </div>

          {/* Progression text */}
          <span className="text-sm text-slate-600">
            Progression atelier : {completedSteps}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="px-6 py-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          {activites.map((activite, index) => (
            <div key={index} className="flex items-center">
              {/* Step badge */}
              <button
                onClick={() => onStepClick?.(index)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${index === activeStepIndex
                    ? 'text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
                style={
                  index === activeStepIndex
                    ? { backgroundColor: BORDEAUX_COLOR }
                    : {}
                }
                disabled={!onStepClick}
              >
                <span className="font-bold">{index + 1}</span>
                <span>{activite.label}</span>
              </button>

              {/* Chevron separator (not after last step) */}
              {index < activites.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
