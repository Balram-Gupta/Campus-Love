import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../utils/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("campuslove_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    api("/api/auth/me", { token })
      .then((data) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  function login(nextToken, nextUser) {
    localStorage.setItem("campuslove_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("campuslove_token");
    setToken("");
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, loading, login, logout, updateUser }), [token, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
