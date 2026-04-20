/**
 * Backend identifies the signed-in user from JWT (Authorization or ?token=).
 * x-username is optional metadata only; authorization is enforced via the token.
 */
export function apiHeaders(token, username) {
  const headers = {};
  const u = (username && String(username).trim()) || "";
  if (u) {
    headers["x-username"] = u;
  }
  if (token && String(token).trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

/** For window.open / navigation where Authorization header is not sent */
export function authQuery(token, username) {
  const p = new URLSearchParams();
  const u = (username && String(username).trim()) || "";
  if (u) p.set("username", u);
  if (token && String(token).trim()) p.set("token", token.trim());
  return p.toString();
}
