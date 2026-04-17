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
  const [user, setUser] = useState({ username: "local-user" });
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

    setToken(typeof savedToken === "string" ? savedToken : "");
    setUser({ username: savedUsername || "local-user" });

    setDeviceId(savedDeviceId);
    setRemember(true);

    const nextStored = {
      ...stored,
      deviceId: savedDeviceId,
      remember: true,
      username: savedUsername || "local-user",
      token: typeof savedToken === "string" ? savedToken : "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    const ensuredDeviceId = deviceId || generateDeviceId();
    const resolvedUsername =
      (userData && userData.username && String(userData.username).trim()) ||
      "local-user";
    const nextToken =
      typeof authToken === "string" && authToken.trim() ? authToken.trim() : "";
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
    // Keep no-login flow active; reset to a default local user.
    setUser({ username: "local-user" });
    setToken("");
    setRemember(true);
    const stored = {
      deviceId: deviceId || generateDeviceId(),
      remember: true,
      username: "local-user",
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
