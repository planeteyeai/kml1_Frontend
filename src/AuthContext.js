import React, { createContext, useState, useContext, useMemo } from "react";

/**
 * Auth state lives only in memory (component state).
 * Nothing is persisted to localStorage / sessionStorage / cookies.
 * Refreshing the page returns the user to the login screen.
 */
const AuthContext = createContext(null);

function generateDeviceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [deviceId] = useState(generateDeviceId());

  const login = (userData, authToken) => {
    const resolvedUsername =
      (userData && userData.username && String(userData.username).trim()) || "";
    const nextToken =
      typeof authToken === "string" && authToken.trim() ? authToken.trim() : "";

    if (!resolvedUsername) return;

    setUser({ username: resolvedUsername });
    setToken(nextToken);
  };

  const logout = () => {
    setUser(null);
    setToken("");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      deviceId,
      remember: false,
      login,
      logout,
      loading: false,
    }),
    [user, token, deviceId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
