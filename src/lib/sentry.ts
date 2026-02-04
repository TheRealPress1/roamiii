import * as Sentry from "@sentry/react";

export function initSentry() {
  // Only initialize in production with a valid DSN
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || import.meta.env.DEV) {
    console.log("[Sentry] Skipping initialization (no DSN or dev mode)");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out common non-actionable errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ignore network errors that users can't control
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        return null;
      }

      // Ignore cancelled requests
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      return event;
    },
  });

  console.log("[Sentry] Initialized successfully");
}

// Helper to capture user context
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

// Helper to add trip context for debugging
export function setSentryTripContext(trip: { id: string; name: string; phase?: string } | null) {
  if (trip) {
    Sentry.setContext("trip", {
      id: trip.id,
      name: trip.name,
      phase: trip.phase,
    });
  } else {
    Sentry.setContext("trip", null);
  }
}

// Re-export Sentry for direct use
export { Sentry };
