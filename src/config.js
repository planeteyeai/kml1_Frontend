let apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  apiUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://kml-backend-production-501c.up.railway.app";
}

export default apiUrl.replace(/\/+$/, "");
