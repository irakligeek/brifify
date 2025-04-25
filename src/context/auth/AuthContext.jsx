import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import axios from 'axios';

// Create the context
const AuthContext = createContext();

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const oidcAuth = useOidcAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to save user data to the backend
  const saveUser = async (userData) => {
    try {
      const response = await axios.post(
        'https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/save-user',
        userData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      // console.log('User data saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving user data:', error);
      return null;
    }
  };

  // Save anonymous user on initial load
  useEffect(() => {
    
    const saveAnonymousUser = async () => {
      if (!oidcAuth.isAuthenticated && !oidcAuth.isLoading) {
        // Get anonymous user data from local Storage if available
        const anonymousUser = JSON.parse(localStorage.getItem('brifify_anonymous_user') || '{}');
        
        if (anonymousUser?.id) {
          // Save anonymous user data
          await saveUser({ userId: anonymousUser.id });
        }
      }
    };
    
    saveAnonymousUser();
  }, [oidcAuth.isLoading, oidcAuth.isAuthenticated]);

  // Update user data when auth state changes
  useEffect(() => {
    if (oidcAuth.isLoading) {
      setIsLoading(true);
      return;
    }

    if (oidcAuth.isAuthenticated && oidcAuth.user) {
      const authenticatedUser = {
        ...oidcAuth.user.profile,
        accessToken: oidcAuth.user.id_token, // Changed from access_token to id_token
        idToken: oidcAuth.user.id_token, // Add explicit idToken field for clarity
        isAuthenticated: true,
      };
      
      setUser(authenticatedUser);
      
      // Save authenticated user data to backend
      saveUser({
        userId: authenticatedUser.sub,
        sub: authenticatedUser.sub,
        email: authenticatedUser.email,
        cognito_groups: authenticatedUser['cognito:groups'],
        email_verified: authenticatedUser.email_verified,
        iss: authenticatedUser.iss,
        cognito_username: authenticatedUser['cognito:username'],
        identities: authenticatedUser.identities,
      });
    } else {
      setUser(null);
    }
    
    setIsLoading(false);
  }, [oidcAuth.isLoading, oidcAuth.isAuthenticated, oidcAuth.user]);

  // Sign in function
  const login = () => {
    oidcAuth.signinRedirect();
  };

  // Sign out function
  const logout = () => {
    const clientId = import.meta.env.VITE_APP_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_APP_REDIRECT_URI;
    const cognitoDomain = import.meta.env.VITE_APP_COGNITO_DOMAIN;
    
    oidcAuth.removeUser();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: oidcAuth.isAuthenticated,
        isLoading: isLoading || oidcAuth.isLoading,
        error: oidcAuth.error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};