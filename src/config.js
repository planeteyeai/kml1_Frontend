let apiUrl = (process.env.REACT_APP_API_URL || "").trim();
const RAILWAY_BACKEND_URL = "https://kml-backend-production-501c.up.railway.app";

// Default to Railway backend so login/register/save always hit server storage.
// Use REACT_APP_API_URL only when you intentionally want a different backend.
if (!apiUrl) {
  apiUrl = RAILWAY_BACKEND_URL;
}

// Guard against accidental frontend/self URL configuration (Docker default was localhost:3001).
if (
  /kml1frontend-production\.up\.railway\.app/i.test(apiUrl) ||
  /^https?:\/\/localhost(?::\d+)?$/i.test(apiUrl) ||
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(apiUrl)
) {
  apiUrl = RAILWAY_BACKEND_URL;
}

export default apiUrl.replace(/\/+$/, "");
