import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export interface NiveauGravite {
  niveau: number;
  code: string;
  libelle: string;
  description: string;
  couleur: string;
}

export interface EchelleGravite {
  id: string;
  projetId: string;
  source: 'STANDARD_EBIOS' | 'IMPORT_EXCEL';
  niveaux: NiveauGravite[];
  dateImport?: string;
}

// Échelle standard EBIOS RM (G1-G5) - par défaut
const ECHELLE_STANDARD: NiveauGravite[] = [
  {
    niveau: 1,
    code: 'G1',
    libelle: 'Mineure',
    description: 'Impact négligeable, facilement récupérable',
    couleur: '#10B981', // vert
  },
  {
    niveau: 2,
    code: 'G2',
    libelle: 'Significative',
    description: 'Impact modéré, récupérable avec des efforts',
    couleur: '#FACC15', // jaune
  },
  {
    niveau: 3,
    code: 'G3',
    libelle: 'Grave',
    description: 'Impact important, nécessite une intervention significative',
    couleur: '#F97316', // orange
  },
  {
    niveau: 4,
    code: 'G4',
    libelle: 'Critique',
    description: 'Impact critique, menace la continuité de l\'activité',
    couleur: '#DC2626', // rouge
  },
  {
    niveau: 5,
    code: 'G5',
    libelle: 'Catastrophique',
    description: 'Impact catastrophique, menace la survie de l\'organisation',
    couleur: '#7F1D1D', // rouge bordeaux
  },
];

export function useEchelleGravite(projetId: string | undefined) {
  const [echelle, setEchelle] = useState<EchelleGravite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projetId) {
      setEchelle({
        id: 'standard',
        projetId: '',
        source: 'STANDARD_EBIOS',
        niveaux: ECHELLE_STANDARD,
      });
      return;
    }

    loadEchelle();
  }, [projetId]);

  const loadEchelle = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<EchelleGravite>(`/projects/${projetId}/atelier1/echelle-gravite`);
      setEchelle(response.data);
    } catch (err) {
      // Si l'endpoint n'existe pas ou échoue, utiliser l'échelle standard
      console.warn('Failed to load gravity scale, using standard:', err);
      setEchelle({
        id: 'standard',
        projetId: projetId,
        source: 'STANDARD_EBIOS',
        niveaux: ECHELLE_STANDARD,
      });
    } finally {
      setLoading(false);
    }
  };

  const getNiveauParCode = (code: string): NiveauGravite | undefined => {
    return echelle?.niveaux.find(n => n.code === code);
  };

  const getNiveauParNiveau = (niveau: number): NiveauGravite | undefined => {
    return echelle?.niveaux.find(n => n.niveau === niveau);
  };

  const getCouleur = (niveau: number): string => {
    const n = getNiveauParNiveau(niveau);
    return n?.couleur || '#94A3B8'; // gris par défaut
  };

  const getCouleurByCode = (code: string): string => {
    const n = getNiveauParCode(code);
    return n?.couleur || '#94A3B8'; // gris par défaut
  };

  const getLibelle = (niveau: number): string => {
    const n = getNiveauParNiveau(niveau);
    return n?.libelle || `Niveau ${niveau}`;
  };

  const getLibelleByCode = (code: string): string => {
    const n = getNiveauParCode(code);
    return n?.libelle || code;
  };

  return {
    echelle,
    niveaux: echelle?.niveaux || ECHELLE_STANDARD,
    loading,
    error,
    reload: loadEchelle,
    getNiveauParCode,
    getNiveauParNiveau,
    getCouleur,
    getCouleurByCode,
    getLibelle,
    getLibelleByCode,
  };
}
