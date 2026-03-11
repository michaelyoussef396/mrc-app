import * as Sentry from "@sentry/react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-4">
        An unexpected error occurred. Please refresh the page.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
          style={{ minHeight: "48px" }}
        >
          Refresh Page
        </button>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700"
          style={{ minHeight: "48px" }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function ErrorBoundary({ children }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog={false}
      beforeCapture={(scope) => {
        scope.setTag("error.boundary", "app");
        scope.setExtra("url", window.location.href);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/**
 * Page-level error boundary for wrapping individual routes/components.
 * Shows inline recovery UI instead of full-page takeover.
 */
function PageErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
      <h2 className="text-xl font-semibold mb-2">This section encountered an error</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        The rest of the app is still working. You can try again or go back.
      </p>
      <div className="flex gap-3">
        <button
          onClick={resetError}
          className="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          style={{ minHeight: "48px" }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 text-sm"
          style={{ minHeight: "48px" }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export function PageErrorBoundary({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <PageErrorFallback resetError={resetError} />}
      showDialog={false}
      beforeCapture={(scope) => {
        scope.setTag("error.boundary", name || "page");
        scope.setExtra("url", window.location.href);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
