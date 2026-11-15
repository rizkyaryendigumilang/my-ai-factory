'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const ECO_STORAGE_KEY = 'factory_eco_mode_enabled';

let currentEcoMode = false;
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

/**
 * Initializes eco-mode based on localStorage or low-spec hardware detection.
 */
function initEcoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(ECO_STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    // Auto-detect low-spec hardware: <= 4 logical CPU cores or reduced motion preference
    const cores = navigator.hardwareConcurrency || 8;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return cores <= 4 || reducedMotion;
  } catch {
    return false;
  }
}

export function setHardwareEcoMode(enabled: boolean) {
  currentEcoMode = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ECO_STORAGE_KEY, String(enabled));
      if (enabled) {
        document.documentElement.classList.add('eco-mode');
      } else {
        document.documentElement.classList.remove('eco-mode');
      }
    } catch {}
  }
  notifyListeners();
}

export function isHardwareEcoModeActive(): boolean {
  return currentEcoMode;
}

export function useHardwareEcoMode() {
  const [isEco, setIsEco] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    currentEcoMode = initEcoMode();
    setIsEco(currentEcoMode);
    if (currentEcoMode) {
      document.documentElement.classList.add('eco-mode');
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ECO_STORAGE_KEY) {
        const val = e.newValue === 'true';
        currentEcoMode = val;
        setIsEco(val);
        if (val) document.documentElement.classList.add('eco-mode');
        else document.documentElement.classList.remove('eco-mode');
      }
    };

    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };

    const unsubscribe = () => {
      listeners = listeners.filter((l) => l !== update);
    };

    const update = () => setIsEco(currentEcoMode);
    listeners.push(update);

    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return {
    isEcoMode: isEco,
    setEcoMode: setHardwareEcoMode,
    isTabVisible,
  };
}
