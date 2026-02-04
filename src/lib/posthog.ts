import posthog from "posthog-js";

export function initPostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey || import.meta.env.DEV) {
    console.log("[PostHog] Skipping initialization (no key or dev mode)");
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    // Capture pageviews automatically
    capture_pageview: true,
    // Respect Do Not Track
    respect_dnt: true,
    // Disable in local development
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        posthog.opt_out_capturing();
      }
    },
    // Session recording settings
    enable_recording_console_log: false,
    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
      element_allowlist: ["button", "a", "input", "select"],
    },
  });

  console.log("[PostHog] Initialized successfully");
}

// Identify user for analytics
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (import.meta.env.DEV) return;

  posthog.identify(userId, properties);
}

// Reset user on logout
export function resetUser() {
  if (import.meta.env.DEV) return;

  posthog.reset();
}

// Track custom events
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (import.meta.env.DEV) {
    console.log("[PostHog] Track:", eventName, properties);
    return;
  }

  posthog.capture(eventName, properties);
}

// Feature flags
export function isFeatureEnabled(featureKey: string): boolean {
  if (import.meta.env.DEV) return false;

  return posthog.isFeatureEnabled(featureKey) ?? false;
}

// Group analytics (for trips)
export function setTripGroup(tripId: string, tripProperties?: Record<string, unknown>) {
  if (import.meta.env.DEV) return;

  posthog.group("trip", tripId, tripProperties);
}

// Common event helpers
export const analytics = {
  // Trip events
  tripCreated: (tripId: string, destination?: string) =>
    trackEvent("trip_created", { trip_id: tripId, destination }),

  tripJoined: (tripId: string, method: "link" | "code") =>
    trackEvent("trip_joined", { trip_id: tripId, method }),

  proposalCreated: (tripId: string, proposalType: string) =>
    trackEvent("proposal_created", { trip_id: tripId, proposal_type: proposalType }),

  proposalVoted: (proposalId: string, vote: "up" | "down") =>
    trackEvent("proposal_voted", { proposal_id: proposalId, vote }),

  tripLocked: (tripId: string) =>
    trackEvent("trip_locked", { trip_id: tripId }),

  tripReady: (tripId: string) =>
    trackEvent("trip_ready", { trip_id: tripId }),

  // Chat events
  messageSent: (tripId: string, hasProposal: boolean) =>
    trackEvent("message_sent", { trip_id: tripId, has_proposal: hasProposal }),

  // Map events
  mapViewed: (tripId: string) =>
    trackEvent("map_viewed", { trip_id: tripId }),

  // PWA events
  pwaInstalled: () =>
    trackEvent("pwa_installed"),
};

export default posthog;
