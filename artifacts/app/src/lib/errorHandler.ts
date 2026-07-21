/**
 * Comprehensive error handling utility with detailed error messages
 */

export interface ErrorDetails {
  message: string;
  category: 'network' | 'proxy' | 'auth' | 'render' | 'unknown';
  statusCode?: number;
  url?: string;
  timestamp: Date;
  userAgent: string;
  clientOnline: boolean;
  backendStatus: 'online' | 'offline' | 'unknown';
  latency?: number;
  originalError?: Error;
  suggestion?: string;
}

/**
 * Categorize and enhance error information
 */
export function parseError(error: unknown, url?: string): ErrorDetails {
  const clientOnline = navigator.onLine;
  const timestamp = new Date();
  const userAgent = navigator.userAgent;
  
  let message = 'An unexpected error occurred';
  let category: ErrorDetails['category'] = 'unknown';
  let statusCode: number | undefined;
  let suggestion: string | undefined;

  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      message = 'Failed to connect to the server';
      category = 'network';
      suggestion = 'Check your internet connection and try again';
    } else if (error.message.includes('Cannot read properties')) {
      message = 'Failed to process server response';
      category = 'render';
      suggestion = 'The server returned an unexpected format. Try refreshing.';
    } else {
      message = error.message;
      category = 'unknown';
    }
  } else if (error instanceof SyntaxError) {
    message = 'Failed to parse server response (invalid JSON)';
    category = 'render';
    suggestion = 'The server returned invalid data. Clear cache and retry.';
  } else if (error instanceof Response) {
    statusCode = error.status;
    category = 'network';
    
    if (error.status === 401) {
      message = 'Authentication failed';
      suggestion = 'Your session expired. Please log in again.';
    } else if (error.status === 403) {
      message = 'Access denied';
      suggestion = 'You do not have permission to access this resource.';
    } else if (error.status === 404) {
      message = 'Resource not found';
      suggestion = 'The page or resource you are looking for does not exist.';
    } else if (error.status === 408 || error.status === 504) {
      message = 'Request timeout';
      suggestion = 'The server is taking too long to respond. Try again.';
    } else if (error.status >= 500) {
      message = 'Server error';
      category = 'proxy';
      suggestion = 'The server is experiencing issues. Please try again later.';
    } else if (error.status >= 400) {
      message = `Request failed (${error.status})`;
      suggestion = 'An error occurred while processing your request.';
    }
  } else if (error instanceof Error) {
    if (error.name === 'AbortError') {
      message = 'Request cancelled';
      suggestion = 'The operation was cancelled. Please try again.';
    } else if (error.message.toLowerCase().includes('cors')) {
      message = 'Cross-origin request blocked';
      category = 'network';
      suggestion = 'The server blocked this request. Check CORS configuration.';
    } else if (error.message.toLowerCase().includes('network')) {
      message = 'Network error';
      category = 'network';
      suggestion = !clientOnline
        ? 'You are offline. Check your internet connection.'
        : 'Network connectivity issue. Check your connection and try again.';
    } else {
      message = error.message || 'An error occurred';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message,
    category,
    statusCode,
    url,
    timestamp,
    userAgent,
    clientOnline,
    backendStatus: 'unknown',
    suggestion,
  };
}

/**
 * Generate a detailed error report
 */
export function generateErrorReport(errorDetails: ErrorDetails): string {
  return `
Error Report - ${errorDetails.timestamp.toISOString()}

Message: ${errorDetails.message}
Category: ${errorDetails.category}
${errorDetails.statusCode ? `Status Code: ${errorDetails.statusCode}` : ''}
${errorDetails.url ? `URL: ${errorDetails.url}` : ''}
${errorDetails.suggestion ? `Suggestion: ${errorDetails.suggestion}` : ''}

Client Status:
- Online: ${errorDetails.clientOnline ? 'Yes' : 'No'}
- Backend: ${errorDetails.backendStatus}
- Latency: ${errorDetails.latency ? `${errorDetails.latency}ms` : 'Unknown'}

User Agent: ${errorDetails.userAgent}

Original Error: ${errorDetails.originalError?.message || 'N/A'}
  `.trim();
}

/**
 * Check if backend is online
 */
export async function checkBackendStatus(): Promise<{
  online: boolean;
  latency: number;
}> {
  const startTime = performance.now();
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const latency = Math.round(performance.now() - startTime);
    return {
      online: response.ok,
      latency,
    };
  } catch {
    return {
      online: false,
      latency: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Check internet connectivity
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
      mode: 'no-cors',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
