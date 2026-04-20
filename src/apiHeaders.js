/**
 * Backend resolves the user from JWT (optional), x-username, body.username, or query.username.
 * Always send x-username so pipeline/save hit the correct user folder when the JWT middleware is permissive.
 */
export function apiHeaders(token, username) {
  const headers = {
    "x-username": (username && String(username).trim()) || "local-user",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** For window.open / navigation where headers are not available */
export function usernameQuery(username) {
  const u = (username && String(username).trim()) || "local-user";
  return `username=${encodeURIComponent(u)}`;
}
