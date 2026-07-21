import { useCallback } from 'react';
import { useErrorHandler } from './errorContext';
import { retryWithBackoff } from './errorHandler';

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  baseDelay?: number;
}

/**
 * Hook for fetching data with automatic error handling
 */
export function useFetch() {
  const { setError } = useErrorHandler();

  const fetchWithErrorHandling = useCallback(
    async <T,>(
      url: string,
      options: FetchOptions = {}
    ): Promise<{ data: T | null; error: Error | null }> => {
      const {
        timeout = 10000,
        retries = 3,
        baseDelay = 1000,
        ...fetchOptions
      } = options;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fn = async () => {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          });

          if (!response.ok) {
            throw response;
          }

          return response.json() as Promise<T>;
        };

        try {
          const data = await retryWithBackoff(fn, retries, baseDelay);
          clearTimeout(timeoutId);
          return { data, error: null };
        } catch (error) {
          clearTimeout(timeoutId);
          await setError(error, url);
          return { data: null, error: error as Error };
        }
      } catch (error) {
        await setError(error, url);
        return { data: null, error: error as Error };
      }
    },
    [setError]
  );

  return { fetch: fetchWithErrorHandling };
}
