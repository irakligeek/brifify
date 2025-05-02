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
      return response.data;
    } catch (error) {
      console.error('Error saving user data:', error);
      return null;
    }
  };

  // Handle auth code in URL automatically
  useEffect(() => {
    const handleAuthCode = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      // If there's an auth code in the URL and user is not authenticated yet
      if (authCode && !oidcAuth.isAuthenticated && !oidcAuth.isLoading) {;
        try {
          // Use the signinRedirect method instead - the library will handle the code
          // automatically since it's already in the URL
          oidcAuth.signinRedirect({ 
            redirect_uri: window.location.origin 
          });
          
          // Note: The URL cleanup will happen automatically after authentication is complete
        } catch (error) {
          console.error('Error during auto-login:', error);
        }
      }
    };
    
    handleAuthCode();
  }, [oidcAuth.isAuthenticated, oidcAuth.isLoading]);

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
    console.log('Login function called in AuthContext');
    console.log('Environment:', import.meta.env.MODE);
    console.log('Redirect URI:', import.meta.env.VITE_APP_REDIRECT_URI);
    console.log('Auth config:', {
      authority: import.meta.env.VITE_APP_AUTH_AUTHORITY,
      clientId: import.meta.env.VITE_APP_CLIENT_ID,
      cognitoDomain: import.meta.env.VITE_APP_COGNITO_DOMAIN,
    });
    
    try {
      oidcAuth.signinRedirect()
        .catch(error => {
          console.error('Signin redirect error:', error);
        });
    } catch (error) {
      console.error('Exception during login attempt:', error);
    }
  };

  // Sign out function
  const logout = () => {
    const clientId = import.meta.env.VITE_APP_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_APP_REDIRECT_URI;
    const cognitoDomain = import.meta.env.VITE_APP_COGNITO_DOMAIN;
    
    // Clear wizard state for the current user
    if (user && user.sub) {
      localStorage.removeItem(`brifify_wizard_state_${user.sub}`);
    }
    
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