import React from "react";
import { logClientError } from "@/lib/errorLogger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    void logClientError(error, {
      source: "ErrorBoundary",
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-5xl">🐝</div>
            <h1 className="font-display text-2xl font-semibold">Something went off-script.</h1>
            <p className="text-sm text-muted-foreground">
              The hive caught an unexpected error. Try again — your data is safe.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.reset}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full h-12 rounded-xl border border-border font-medium"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
