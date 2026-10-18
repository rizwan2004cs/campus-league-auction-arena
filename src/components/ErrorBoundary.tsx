import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-red-50 text-red-900 overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <div className="bg-raised p-4 rounded bg-red-100 text-left w-full max-w-3xl border border-red-300 mb-4 whitespace-pre-wrap font-mono text-sm">
            {this.state.error && this.state.error.toString()}
          </div>
          <details className="w-full max-w-3xl text-left bg-raised p-4 rounded border border-red-300 font-mono text-xs overflow-auto">
            <summary className="font-bold cursor-pointer mb-2">Component Stack</summary>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
