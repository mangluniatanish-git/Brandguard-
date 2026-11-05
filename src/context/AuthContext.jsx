import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  getDemoUsers,
  getAuthToken,
} from '../api';

const AuthContext = createContext(null);

export const ROLE_PERMISSIONS = {
  creator: ['/dashboard', '/new-content', '/my-content', '/review'],
  reviewer: ['/dashboard', '/review-queue', '/review'],
  manager: ['/dashboard', '/insights', '/review'],
  admin: [
    '/dashboard',
    '/new-content',
    '/my-content',
    '/review-queue',
    '/insights',
    '/brand-library',
    '/settings',
    '/review',
  ],
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize session and demo users on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        setLoading(true);
        setError(null);

        // Fetch available demo personas from backend
        let fetchedUsers = [];
        try {
          fetchedUsers = await getDemoUsers();
          if (isMounted) setDemoUsers(fetchedUsers);
        } catch (e) {
          console.warn('Failed to fetch demo users list:', e.message);
        }

        // Check if an existing session token exists
        const token = getAuthToken();
        if (token) {
          try {
            const user = await getMe();
            if (isMounted) {
              setCurrentUser({ ...user, token });
              setLoading(false);
              return;
            }
          } catch (err) {
            // Token expired or invalid, clear it
            apiLogout();
          }
        }

        // If no token or token expired, auto-initialize demo session as creator
        try {
          const user = await apiLogin('creator');
          if (isMounted) {
            setCurrentUser(user);
          }
        } catch (loginErr) {
          if (isMounted) {
            setError(loginErr.message || 'Unable to connect to authentication server');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginAs = async (roleOrCredentials) => {
    try {
      setLoading(true);
      setError(null);
      const user = await apiLogin(roleOrCredentials);
      setCurrentUser(user);
      return user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiLogout();
    setCurrentUser(null);
  };

  const canAccess = (path) => {
    if (!currentUser) return false;
    const allowed = ROLE_PERMISSIONS[currentUser.role] || [];
    return allowed.some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoUsers,
        loading,
        error,
        loginAs,
        logout,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
