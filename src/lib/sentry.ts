import * as Sentry from "@sentry/react";

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
    release: __APP_VERSION__,

    // Performance: 20% in prod, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Distributed tracing: propagate to localhost (dev) and Supabase REST API
    // NOTE: Edge Functions excluded — their CORS headers don't allow baggage/sentry-trace
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/ecyivrxjpsmjmexqatym\.supabase\.co\/rest/,
    ],

    // Session Replay: 10% of sessions, 100% of error sessions
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    integrations: [
      Sentry.browserTracingIntegration(),
      // Send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
        networkDetailAllowUrls: [
          import.meta.env.VITE_SUPABASE_URL,
        ],
        networkCaptureBodies: true,
      }),
    ],

    ignoreErrors: [
      "top.GLOBALS",
      "ResizeObserver loop",
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "AuthRetryableFetchError",
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],

    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data?.url) {
            try {
              const url = new URL(bc.data.url as string);
              url.searchParams.delete("token");
              url.searchParams.delete("access_token");
              url.searchParams.delete("refresh_token");
              bc.data.url = url.toString();
            } catch {
              // Not a valid URL, leave as-is
            }
          }
          return bc;
        });
      }
      return event;
    },

    beforeSendTransaction(event) {
      if (event.transaction?.includes("/auth/v1/token")) return null;
      return event;
    },
  });
}

export function setInspectionContext(inspectionId: string, leadId?: string) {
  Sentry.setTag("inspection.id", inspectionId);
  if (leadId) Sentry.setTag("lead.id", leadId);
  Sentry.setContext("inspection", { inspectionId, leadId });
}

export function clearInspectionContext() {
  Sentry.setTag("inspection.id", undefined);
  Sentry.setTag("lead.id", undefined);
  Sentry.setContext("inspection", null);
}

export function captureBusinessError(
  message: string,
  context: Record<string, unknown>
) {
  Sentry.captureException(new Error(message), {
    contexts: { business: context },
    level: "error",
  });
}

export function addBusinessBreadcrumb(
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: "business",
    message,
    data,
    level: "info",
  });
}
