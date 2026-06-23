# Error Handling System

This app includes a comprehensive error handling system that provides detailed error messages, automatic status detection, and a beautiful error UI that matches the app's design.

## Components

### ErrorScreen
The main error display component that shows when an error occurs. Features:
- Detailed error messages categorized by type (network, proxy, auth, render, unknown)
- Real-time status indicators (client online/offline, backend online/offline, latency)
- Technical details section with full error report
- Quick action buttons (Retry, Report issue, Go back, etc.)
- Matches the app's design with Space Grotesk font and CSS variables

### ErrorBoundary
A React error boundary that catches component rendering errors and passes them to the error context.

## Hooks

### useErrorHandler()
Hook to interact with error state:

```typescript
import { useErrorHandler } from '@/lib/errorContext';

function MyComponent() {
  const { currentError, setError, clearError, retry } = useErrorHandler();
  
  // Handle an error
  try {
    // some operation
  } catch (error) {
    await setError(error, '/some/url');
  }
  
  // Retry the operation
  await retry();
  
  // Clear the error
  clearError();
}
```

### useFetch()
Hook for fetching data with automatic error handling, retries, and timeout:

```typescript
import { useFetch } from '@/hooks';

function MyComponent() {
  const { fetch } = useFetch();
  
  useEffect(() => {
    async function loadData() {
      const { data, error } = await fetch('/api/data', {
        timeout: 10000,      // 10 second timeout
        retries: 3,          // Retry 3 times
        baseDelay: 1000,     // Start with 1 second delay
      });
      
      if (data) {
        // Use data
      }
      // Error is automatically handled and shown
    }
    
    loadData();
  }, []);
}
```

### useNetworkStatus()
Hook to monitor network connectivity:

```typescript
import { useNetworkStatus } from '@/hooks';

function MyComponent() {
  const { online, lastOnlineTime, lastOfflineTime } = useNetworkStatus();
  
  if (!online) {
    return <p>You are offline. Last online: {lastOnlineTime.toLocaleTimeString()}</p>;
  }
}
```

## Error Categories

Errors are automatically categorized:

- **network**: Network connectivity issues, CORS errors, failed requests
- **proxy**: Proxy server errors, backend unavailable
- **auth**: Authentication failures, session expired
- **render**: Failed to parse response, invalid data format
- **unknown**: Other errors

## Error Details

Each error includes:
- **message**: User-friendly error message
- **category**: Type of error
- **statusCode**: HTTP status code (if applicable)
- **url**: URL that was requested
- **timestamp**: When the error occurred
- **userAgent**: Browser user agent
- **clientOnline**: Whether the client is connected to internet
- **backendStatus**: Whether the backend is online
- **latency**: Response time to backend health check
- **suggestion**: Helpful suggestion for fixing the error
- **originalError**: The original error object

## Automatic Features

The error system automatically:

1. **Detects network connectivity** - Checks if client is online/offline
2. **Checks backend health** - Pings `/api/health` to verify backend availability
3. **Measures latency** - Records response time to backend
4. **Categorizes errors** - Determines error type based on error message and status code
5. **Provides suggestions** - Offers helpful hints for common errors
6. **Generates reports** - Creates detailed error reports for debugging

## Custom Error Handling

To handle specific errors differently:

```typescript
import { useErrorHandler } from '@/lib/errorContext';
import { parseError, checkBackendStatus } from '@/lib/errorHandler';

function MyComponent() {
  const { currentError, setError } = useErrorHandler();
  
  async function handleCustomError() {
    try {
      // some operation
    } catch (error) {
      const errorDetails = parseError(error, '/api/endpoint');
      
      // Customize the error
      errorDetails.suggestion = 'Try again in a few moments';
      
      // Set the error
      await setError(errorDetails);
    }
  }
}
```

## Backend Health Endpoint

The error system expects a `/api/health` endpoint that returns quickly:

```javascript
// Express.js example
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fastify example
app.get('/api/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});
```

## Retry Logic

The `retryWithBackoff` function implements exponential backoff:

```typescript
import { retryWithBackoff } from '@/lib/errorHandler';

const data = await retryWithBackoff(
  () => fetch('/api/data').then(r => r.json()),
  3,      // max retries
  1000,   // base delay (1 second)
  10000   // max delay (10 seconds)
);

// Retries with delays: 1s, 2s, 4s (capped at 10s)
```

## UI Styling

The ErrorScreen uses CSS variables to match your theme:

- `--t-bg`: Background color
- `--t-text`: Text color
- `--t-text-secondary`: Secondary text color
- `--t-text-muted`: Muted text color
- `--t-border`: Border color
- `--rgb-bg-secondary`: RGB value for secondary background

These are automatically set based on your selected theme.

## Integration Example

Complete example integrating error handling into a component:

```typescript
import { useFetch } from '@/hooks';
import { useErrorHandler } from '@/lib/errorContext';
import { useState, useEffect } from 'react';

function DataComponent() {
  const { fetch } = useFetch();
  const { currentError } = useErrorHandler();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      const { data, error } = await fetch('/api/data', {
        timeout: 5000,
        retries: 2,
      });
      
      if (data) {
        setData(data);
      }
      setLoading(false);
    }
    
    loadData();
  }, []);
  
  if (currentError) {
    // ErrorScreen will automatically be shown
    return null;
  }
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return <div>{JSON.stringify(data)}</div>;
}
```

## Testing

To test error handling:

1. Disconnect from internet and try loading
2. Close the backend server and try an API call
3. Go to a URL that returns a 404 or 500
4. Clear browser cache while loading data
5. Simulate slow network in DevTools and watch timeout behavior

All these scenarios will trigger appropriate error messages and suggestions.
