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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      stored = {};
    }

    let { token: savedToken, username: savedUsername, deviceId: savedDeviceId } =
      stored;

    if (!savedDeviceId) {
      savedDeviceId = generateDeviceId();
    }

    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUser({ username: savedUsername });
    }

    setDeviceId(savedDeviceId);

    const nextStored = {
      ...stored,
      deviceId: savedDeviceId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
    setLoading(false);
  }, []);

  const login = (userData, userToken) => {
    const ensuredDeviceId = deviceId || generateDeviceId();
    setUser(userData);
    setToken(userToken);
    setDeviceId(ensuredDeviceId);
    const stored = {
      username: userData.username,
      token: userToken,
      deviceId: ensuredDeviceId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    const stored = {
      deviceId: deviceId || generateDeviceId(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, deviceId, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
