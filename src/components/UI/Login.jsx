import { useAuth } from "react-oidc-context";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./button";

export default function Login() {
  const auth = useAuth();

  const signOutRedirect = () => {
    auth.removeUser();
    const clientId = import.meta.env.VITE_APP_CLIENT_ID;
    const logoutUri = import.meta.env.VITE_APP_REDIRECT_URI;
    const cognitoDomain = import.meta.env.VITE_APP_COGNITO_DOMAIN;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return (
      <Button disabled variant="ghost" size="sm" className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (auth.error) {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        className="text-red-500 hover:text-red-600"
        onClick={() => auth.signinRedirect()}
      >
        Error - Try Again
      </Button>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={signOutRedirect}
          variant="ghost"
          size="sm"
          className="text-gray-700 hover:text-gray-900"
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => auth.signinRedirect()}
      variant="ghost"
      size="sm"
      className="text-gray-700 hover:text-gray-900"
    >
      Login
    </Button>
  );
}
