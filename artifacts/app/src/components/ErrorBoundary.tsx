import { Component, ReactNode } from 'react';
import { useErrorHandler } from '@/lib/errorContext';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function ErrorBoundaryInner({ children, fallback }: ErrorBoundaryProps) {
  const { setError } = useErrorHandler();

  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('Error caught by boundary:', error, errorInfo);
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
