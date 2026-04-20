import React, { createContext, useState, useContext, useEffect } from "react";

const STORAGE_KEY = "kml_auth";
const AuthContext = createContext(null);

function generateDeviceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState(null);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      stored = {};
    }

    let { username: savedUsername, deviceId: savedDeviceId, token: savedToken } = stored;

    if (!savedDeviceId) {
      savedDeviceId = generateDeviceId();
    }

    const tokenStr = typeof savedToken === "string" ? savedToken.trim() : "";
    const userStr =
      typeof savedUsername === "string" ? savedUsername.trim() : "";

    if (tokenStr && userStr) {
      setToken(tokenStr);
      setUser({ username: userStr });
    } else {
      setToken("");
      setUser(null);
    }

    setDeviceId(savedDeviceId);
    setRemember(true);

    const nextStored = {
      ...stored,
      deviceId: savedDeviceId,
      remember: true,
      username: userStr,
      token: tokenStr,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    const ensuredDeviceId = deviceId || generateDeviceId();
    const resolvedUsername =
      (userData && userData.username && String(userData.username).trim()) || "";
    const nextToken =
      typeof authToken === "string" && authToken.trim() ? authToken.trim() : "";
    if (!resolvedUsername || !nextToken) {
      return;
    }
    setUser({ username: resolvedUsername });
    setToken(nextToken);
    setDeviceId(ensuredDeviceId);
    setRemember(true);

    const stored = {
      deviceId: ensuredDeviceId,
      remember: true,
      username: resolvedUsername,
      token: nextToken,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setRemember(true);
    const stored = {
      deviceId: deviceId || generateDeviceId(),
      remember: true,
      username: "",
      token: "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, deviceId, remember, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
