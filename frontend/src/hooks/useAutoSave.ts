import { useState, useEffect, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  onSave: (data: T) => Promise<void> | void;
  delay?: number; // en millisecondes, défaut 5000ms (5s)
  enabled?: boolean;
}

export function useAutoSave<T>({
  key,
  data,
  onSave,
  delay = 5000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);

  useEffect(() => {
    if (!enabled) return;

    // Vérifier si les données ont changé
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    
    if (hasChanged) {
      setHasUnsavedChanges(true);
      
      // Annuler le timeout précédent
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Programmer le nouveau save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await onSave(data);
          
          // Sauvegarder dans localStorage comme backup
          localStorage.setItem(key, JSON.stringify({
            data,
            savedAt: new Date().toISOString(),
          }));
          
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          previousDataRef.current = data;
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, delay);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, key, onSave, delay, enabled]);

  // Charger les données sauvegardées au montage
  const loadSavedData = (): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.data;
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
    return null;
  };

  // Sauvegarde manuelle immédiate
  const saveNow = async () => {
    if (!enabled) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    try {
      setIsSaving(true);
      await onSave(data);
      localStorage.setItem(key, JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      previousDataRef.current = data;
    } catch (error) {
      console.error('Manual save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Effacer les données sauvegardées
  const clearSavedData = () => {
    localStorage.removeItem(key);
    setLastSaved(null);
  };

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
    loadSavedData,
    clearSavedData,
  };
}
