import { createContext, useState, useCallback, ReactNode, useContext } from 'react';
import type { ErrorDetails } from './errorHandler';
import { parseError, checkBackendStatus, checkInternetConnectivity } from './errorHandler';

export interface ErrorContextOptions {
  url?: string;
  transport?: string;
  encoding?: string;
  transportEncryption?: boolean;
}

interface ErrorContextType {
  currentError: ErrorDetails | null;
  setError: (error: unknown, urlOrOpts?: string | ErrorContextOptions) => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
  onRetry?: () => Promise<void>;
}

export const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const [onRetryCallback, setOnRetryCallback] = useState<(() => Promise<void>) | undefined>();

  const setError = useCallback(
    async (error: unknown, urlOrOpts?: string | ErrorContextOptions) => {
      const opts = typeof urlOrOpts === 'string' ? { url: urlOrOpts } : urlOrOpts;
      const errorDetails = parseError(error, opts?.url);
      
      // Check backend and internet status
      const [{ online: backendOnline, latency }, isOnline] = await Promise.all([
        checkBackendStatus(),
        checkInternetConnectivity(),
      ]);

      errorDetails.clientOnline = isOnline;
      errorDetails.backendStatus = backendOnline ? 'online' : 'offline';
      errorDetails.latency = latency;
      errorDetails.transport = opts?.transport;
      errorDetails.encoding = opts?.encoding;
      errorDetails.transportEncryption = opts?.transportEncryption;

      if (error instanceof Error) {
        errorDetails.originalError = error;
      }

      setCurrentError(errorDetails);
    },
    []
  );

  const clearError = useCallback(() => {
    setCurrentError(null);
    setOnRetryCallback(undefined);
  }, []);

  const retry = useCallback(async () => {
    if (onRetryCallback) {
      try {
        await onRetryCallback();
        clearError();
      } catch (error) {
        await setError(error);
      }
    }
  }, [onRetryCallback, setError, clearError]);

  return (
    <ErrorContext.Provider
      value={{
        currentError,
        setError,
        clearError,
        retry,
        onRetry: onRetryCallback,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}
