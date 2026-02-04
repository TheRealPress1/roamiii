import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { trackEvent } from "./posthog";

export function initWebVitals() {
  // Only report in production
  if (import.meta.env.DEV) {
    console.log("[WebVitals] Skipping initialization (dev mode)");
    return;
  }

  const reportMetric = (metric: { name: string; value: number; rating: string }) => {
    trackEvent("web_vital", {
      metric_name: metric.name,
      metric_value: Math.round(metric.value),
      metric_rating: metric.rating,
    });

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.log(`[WebVitals] ${metric.name}:`, metric.value, `(${metric.rating})`);
    }
  };

  // Core Web Vitals
  onCLS(reportMetric);  // Cumulative Layout Shift
  onINP(reportMetric);  // Interaction to Next Paint
  onLCP(reportMetric);  // Largest Contentful Paint

  // Other metrics
  onFCP(reportMetric);  // First Contentful Paint
  onTTFB(reportMetric); // Time to First Byte

  console.log("[WebVitals] Initialized successfully");
}
