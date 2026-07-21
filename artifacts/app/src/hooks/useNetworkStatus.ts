import { useEffect, useState } from 'react';

interface NetworkStatus {
  online: boolean;
  lastOnlineTime: Date;
  lastOfflineTime: Date;
}

/**
 * Hook to monitor network connectivity
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    lastOnlineTime: new Date(),
    lastOfflineTime: new Date(0),
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        online: true,
        lastOnlineTime: new Date(),
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        online: false,
        lastOfflineTime: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
