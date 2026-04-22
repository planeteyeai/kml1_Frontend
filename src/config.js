/**
 * Hosted URLs on Railway.
 * Health check: GET / → `{"status":"Backend is running successfully","timestamp":"..."}`.
 * @see https://kml-backend-production-501c.up.railway.app/
 */
export const HOSTED_KML_API_BASE =
  "https://kml-backend-production-501c.up.railway.app";
export const HOSTED_FRONTEND_BASE =
  "https://kml1frontend-production.up.railway.app";
export const HOSTED_DISTRESS_BATCH_URL =
  "https://distressanalyzerv2-0.up.railway.app/process-rotated-images-batch/";

function readInitialApiUrl() {
  if (typeof window !== "undefined" && window.__KML_API_URL__) {
    const w = String(window.__KML_API_URL__).trim();
    if (w) return w;
  }
  return (process.env.REACT_APP_API_URL || "").trim();
}

let apiUrl = readInitialApiUrl();

// Development: default to local backend directly (no proxy dependency).
if (!apiUrl) {
  apiUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:9008"
      : HOSTED_KML_API_BASE;
}

// Never call the frontend host as the API (bad Docker/build env). Do not rewrite intentional localhost API in dev.
if (new RegExp(HOSTED_FRONTEND_BASE.replace(/^https?:\/\//i, ""), "i").test(apiUrl)) {
  apiUrl = HOSTED_KML_API_BASE;
}
if (
  process.env.NODE_ENV === "production" &&
  (/^https?:\/\/localhost(?::\d+)?$/i.test(apiUrl) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(apiUrl))
) {
  apiUrl = HOSTED_KML_API_BASE;
}

// In dev, never let API URL point to the frontend dev server (causes /api self-loop).
if (
  process.env.NODE_ENV === "development" &&
  /^https?:\/\/localhost:3001$/i.test(apiUrl)
) {
  apiUrl = "http://localhost:9008";
}

export default apiUrl.replace(/\/+$/, "");
