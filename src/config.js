let apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  apiUrl = "https://kml-backend-production.up.railway.app";
}

export default apiUrl;
