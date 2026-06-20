import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sentryCapture } from "@/lib/sentry";

interface Props {
  children: React.ReactNode;
  routeKey: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info);
    sentryCapture(error, { react: { componentStack: info.componentStack }, route: this.props.routeKey });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error when route changes so other tabs are not blocked
    if (prevProps.routeKey !== this.props.routeKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="text-4xl">🐝</div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              We hit a snag loading this page.
            </h2>
            <p className="text-sm text-muted-foreground">
              Your data is safe. Try again or head back to your dashboard.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.reset}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <RouteErrorBoundaryInner
      routeKey={location.pathname}
      onReset={() => navigate(location.pathname, { replace: true })}
    >
      {children}
    </RouteErrorBoundaryInner>
  );
}

export default RouteErrorBoundary;
