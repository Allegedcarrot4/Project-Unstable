import { Component, ReactNode } from 'react';
import { useErrorHandler } from '@/lib/errorContext';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|ChunkLoadError|Importing a module script failed|error loading dynamically imported module|Outdated Optimize Dep/i;
const CHUNK_RELOAD_KEY = "unstable_chunk_reload_at";

/**
 * After a deploy, a cached index.html can reference chunk hashes that no longer
 * exist. That surfaces as a render error ("Error occurred / Rendering") even
 * though a reload fixes it. Reload once, guarded so a genuinely broken chunk
 * cannot loop forever.
 */
function reloadForStaleChunk(error: Error): boolean {
  if (!CHUNK_ERROR_RE.test(String(error?.message || error))) return false;
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch { /* storage unavailable: still reload once */ }
  window.location.reload();
  return true;
}

function ErrorBoundaryInner({ children, fallback }: ErrorBoundaryProps) {
  const { setError } = useErrorHandler();

  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('Error caught by boundary:', error, errorInfo);
    if (reloadForStaleChunk(error)) return;
    setError(error);
  };

  return (
    <ErrorBoundaryClass onError={handleError} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

interface ErrorBoundaryClassProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  fallback?: ReactNode;
}

interface ErrorBoundaryClassState {
  hasError: boolean;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryClassProps, ErrorBoundaryClassState> {
  constructor(props: ErrorBoundaryClassProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryInner {...props} />;
}
