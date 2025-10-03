import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlState<T extends Record<string, any>>(
  defaultValues: T,
  serializers?: Partial<Record<keyof T, {
    serialize: (value: any) => string;
    deserialize: (value: string) => any;
  }>>
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = { ...defaultValues };
    
    for (const key in defaultValues) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const serializer = serializers?.[key];
        if (serializer) {
          try {
            result[key] = serializer.deserialize(urlValue);
          } catch {
            result[key] = defaultValues[key];
          }
        } else {
          // Auto-detect type based on default value
          const defaultValue = defaultValues[key];
          if (typeof defaultValue === 'number') {
            const parsed = Number(urlValue);
            result[key] = (isNaN(parsed) ? defaultValue : parsed) as T[Extract<keyof T, string>];
          } else if (typeof defaultValue === 'boolean') {
            result[key] = (urlValue === 'true') as T[Extract<keyof T, string>];
          } else {
            result[key] = urlValue as T[Extract<keyof T, string>];
          }
        }
      }
    }
    
    return result;
  }, [searchParams, defaultValues, serializers]);

  const setState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const newUpdates = typeof updates === 'function' ? updates(state) : updates;
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      
      for (const [key, value] of Object.entries(newUpdates)) {
        if (value === defaultValues[key] || value === null || value === undefined || value === '') {
          // Remove parameter if it's the default value or empty
          newParams.delete(key);
        } else {
          const serializer = serializers?.[key as keyof T];
          if (serializer) {
            newParams.set(key, serializer.serialize(value));
          } else {
            newParams.set(key, String(value));
          }
        }
      }
      
      return newParams;
    });
  }, [state, defaultValues, serializers, setSearchParams]);

  const resetState = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return [state, setState, resetState] as const;
}