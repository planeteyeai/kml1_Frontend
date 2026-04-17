let apiUrl = (process.env.REACT_APP_API_URL || "").trim();
const RAILWAY_BACKEND_URL = "https://kml-backend-production-501c.up.railway.app";

// Default to Railway backend so login/register/save always hit server storage.
// Use REACT_APP_API_URL only when you intentionally want a different backend.
if (!apiUrl) {
  apiUrl = RAILWAY_BACKEND_URL;
}

// Guard against accidental frontend/self URL configuration.
if (/kml1frontend-production\.up\.railway\.app/i.test(apiUrl)) {
  apiUrl = RAILWAY_BACKEND_URL;
}

export default apiUrl.replace(/\/+$/, "");
