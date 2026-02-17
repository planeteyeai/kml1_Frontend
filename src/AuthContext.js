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
  const [token, setToken] = useState(null);
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

    let {
      token: savedToken,
      username: savedUsername,
      deviceId: savedDeviceId,
      remember: savedRemember,
    } = stored;

    if (!savedDeviceId) {
      savedDeviceId = generateDeviceId();
    }

    if (savedRemember && savedToken && savedUsername) {
      setToken(savedToken);
      setUser({ username: savedUsername });
    }

    setDeviceId(savedDeviceId);
    setRemember(!!savedRemember);

    const nextStored = {
      ...stored,
      deviceId: savedDeviceId,
      remember: !!savedRemember,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    setLoading(false);
  }, []);

  const login = (userData, userToken, shouldRemember) => {
    const ensuredDeviceId = deviceId || generateDeviceId();
    setUser(userData);
    setToken(userToken);
    setDeviceId(ensuredDeviceId);
    setRemember(!!shouldRemember);

    const stored = {
      deviceId: ensuredDeviceId,
      remember: !!shouldRemember,
    };

    if (shouldRemember) {
      stored.username = userData.username;
      stored.token = userToken;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRemember(false);
    const stored = {
      deviceId: deviceId || generateDeviceId(),
      remember: false,
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
