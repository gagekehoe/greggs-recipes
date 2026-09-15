"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { sanitizeTelemetryEvent } from "@/lib/seo/analytics";

/** Client wrapper so `beforeSend` can run in the root layout (server component). */
export function SiteTelemetry() {
  return (
    <>
      <Analytics beforeSend={sanitizeTelemetryEvent} />
      <SpeedInsights beforeSend={sanitizeTelemetryEvent} />
    </>
  );
}
