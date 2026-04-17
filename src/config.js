let apiUrl = (process.env.REACT_APP_API_URL || "").trim();

// Default to Railway backend so login/register/save always hit server storage.
// Use REACT_APP_API_URL only when you intentionally want a different backend.
if (!apiUrl) {
  apiUrl = "https://kml-backend-production-501c.up.railway.app";
}

export default apiUrl.replace(/\/+$/, "");
