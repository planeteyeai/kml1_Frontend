/**
 * Hosted KML backend on Railway (canonical base URL, no trailing slash).
 * Health check: GET / → `{"status":"Backend is running successfully","timestamp":"..."}`.
 * @see https://kml-backend-production-501c.up.railway.app/
 */
export const HOSTED_KML_API_BASE =
  "https://kml-backend-production-501c.up.railway.app";

function readInitialApiUrl() {
  if (typeof window !== "undefined" && window.__KML_API_URL__) {
    const w = String(window.__KML_API_URL__).trim();
    if (w) return w;
  }
  return (process.env.REACT_APP_API_URL || "").trim();
}

let apiUrl = readInitialApiUrl();

// Development: use same-origin URLs so Create React App's "proxy" forwards to the backend (no browser CORS).
// Set REACT_APP_API_URL in .env.local if you run the API on your machine (e.g. http://localhost:3001).
if (!apiUrl) {
  apiUrl =
    process.env.NODE_ENV === "development"
      ? ""
      : HOSTED_KML_API_BASE;
}

// Never call the frontend host as the API (bad Docker/build env). Do not rewrite intentional localhost API in dev.
if (/kml1frontend-production\.up\.railway\.app/i.test(apiUrl)) {
  apiUrl = HOSTED_KML_API_BASE;
}
if (
  process.env.NODE_ENV === "production" &&
  (/^https?:\/\/localhost(?::\d+)?$/i.test(apiUrl) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(apiUrl))
) {
  apiUrl = HOSTED_KML_API_BASE;
}

export default apiUrl.replace(/\/+$/, "");
