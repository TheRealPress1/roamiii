import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-destructive">Something went wrong</span>
          </CardTitle>
          <CardDescription>
            We've been notified and are working on a fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <div className="rounded-lg bg-muted p-3 text-sm font-mono overflow-auto max-h-32">
              {error.message}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={resetError} variant="default">
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
            >
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => {
        const FallbackComponent = fallback ?? ErrorFallback;
        return <FallbackComponent error={error} resetError={resetError} />;
      }}
      onError={(error, componentStack) => {
        console.error("[ErrorBoundary] Caught error:", error);
        console.error("[ErrorBoundary] Component stack:", componentStack);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

// Wrapper component for page-level error boundaries
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Page Error</CardTitle>
              <CardDescription>
                This page encountered an error. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && (
                <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-24">
                  {error.message}
                </pre>
              )}
              <Button onClick={resetError} size="sm">
                Reload page
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
