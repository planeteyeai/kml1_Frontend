import { getApiBaseForNavigation } from "./config";

/** Distress prediction / computation app (reads query params on load). */
export const DISTRESS_PREDICTION_ORIGIN = "https://distress-prediction.onrender.com";

/**
 * Builds URL with signed-in context for server-side fetches from the distress app.
 * Query: username, token (JWT), kmlApiBase (KML backend origin, no trailing slash).
 */
export function buildDistressPredictionUrl({ username, token }) {
  const u = new URL("/", DISTRESS_PREDICTION_ORIGIN);
  const name = (username && String(username).trim()) || "";
  const t = (token && String(token).trim()) || "";
  if (name) u.searchParams.set("username", name);
  if (t) u.searchParams.set("token", t);
  const apiBase = getApiBaseForNavigation();
  if (apiBase) u.searchParams.set("kmlApiBase", apiBase);
  return u.toString();
}

export function openDistressPrediction({ username, token }) {
  const name = (username && String(username).trim()) || "";
  const t = (token && String(token).trim()) || "";
  if (!name || !t) {
    window.alert("Sign in required to open Distress data with your account.");
    return;
  }
  const url = buildDistressPredictionUrl({ username: name, token: t });
  window.open(url, "_blank", "noopener");
}
