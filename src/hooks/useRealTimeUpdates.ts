import { useEffect, useRef, useState } from 'react';

interface UseRealTimeUpdatesOptions {
  interval?: number; // Intervalo em milissegundos (padrão: 30 segundos)
  enabled?: boolean; // Se as atualizações estão habilitadas
  onUpdate?: () => void; // Callback quando uma atualização é executada
}

export function useRealTimeUpdates(
  updateFunction: () => Promise<void>,
  options: UseRealTimeUpdatesOptions = {}
) {
  const {
    interval = 30000, // 30 segundos por padrão
    enabled = true,
    onUpdate
  } = options;

  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const executeUpdate = async () => {
    if (!mountedRef.current || isUpdating) return;

    try {
      setIsUpdating(true);
      await updateFunction();
      setLastUpdate(new Date());
      onUpdate?.();
    } catch (error) {
      console.error('Erro na atualização em tempo real:', error);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  };

  const startUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(executeUpdate, interval);
  };

  const stopUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const forceUpdate = () => {
    executeUpdate();
  };

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      startUpdates();
    } else {
      stopUpdates();
    }

    return () => {
      mountedRef.current = false;
      stopUpdates();
    };
  }, [enabled, interval]);

  // Pausar atualizações quando a aba não está visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopUpdates();
      } else if (enabled) {
        startUpdates();
        // Atualizar imediatamente quando a aba volta a ficar visível
        executeUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return {
    isUpdating,
    lastUpdate,
    forceUpdate,
    startUpdates,
    stopUpdates
  };
}