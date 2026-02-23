import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalToken, setOriginalToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("rankflow_token");
    const savedUser = localStorage.getItem("rankflow_user");
    const savedOriginalToken = localStorage.getItem("rankflow_original_token");
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      if (savedOriginalToken) {
        setIsImpersonating(true);
        setOriginalToken(savedOriginalToken);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem("rankflow_token", access_token);
    localStorage.setItem("rankflow_user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    setUser(userData);
    setIsImpersonating(false);
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", { name, email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem("rankflow_token", access_token);
    localStorage.setItem("rankflow_user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    setUser(userData);
    setIsImpersonating(false);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("rankflow_token");
    localStorage.removeItem("rankflow_user");
    localStorage.removeItem("rankflow_original_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setIsImpersonating(false);
    setOriginalToken(null);
  };

  const impersonate = async (userId) => {
    // Save current token before impersonating
    const currentToken = localStorage.getItem("rankflow_token");
    localStorage.setItem("rankflow_original_token", currentToken);
    
    const response = await api.post(`/admin/impersonate/${userId}`);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem("rankflow_token", access_token);
    localStorage.setItem("rankflow_user", JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    setUser(userData);
    setIsImpersonating(true);
    setOriginalToken(currentToken);
    return userData;
  };

  const exitImpersonate = async () => {
    const response = await api.post("/admin/exit-impersonate");
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem("rankflow_token", access_token);
    localStorage.setItem("rankflow_user", JSON.stringify(userData));
    localStorage.removeItem("rankflow_original_token");
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    setUser(userData);
    setIsImpersonating(false);
    setOriginalToken(null);
    return userData;
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      isAdmin,
      isSuperAdmin,
      isImpersonating,
      login,
      register,
      logout,
      impersonate,
      exitImpersonate
    }}>
      {children}
    </AuthContext.Provider>
  );
};
