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

    let { username: savedUsername, deviceId: savedDeviceId } = stored;

    if (!savedDeviceId) {
      savedDeviceId = generateDeviceId();
    }

    setToken("");
    setUser({ username: savedUsername || "local-user" });

    setDeviceId(savedDeviceId);
    setRemember(!!savedRemember);

    const nextStored = {
      ...stored,
      deviceId: savedDeviceId,
      remember: true,
      username: savedUsername || "local-user",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    setLoading(false);
  }, []);

  const login = (userData) => {
    const ensuredDeviceId = deviceId || generateDeviceId();
    const resolvedUsername =
      (userData && userData.username && String(userData.username).trim()) ||
      "local-user";
    setUser({ username: resolvedUsername });
    setToken("");
    setDeviceId(ensuredDeviceId);
    setRemember(true);

    const stored = {
      deviceId: ensuredDeviceId,
      remember: true,
      username: resolvedUsername,
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
