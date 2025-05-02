import { useAuth } from "../../context/auth/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "./button";

export default function Login() {
  const auth = useAuth();

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
        onClick={() => auth.login()}
      >
        Error - Try Again
      </Button>
    );
  }

  if (auth.isAuthenticated) {
    // Display user email when authenticated
    return (
      <div className="flex items-center">
        <Button
          onClick={() => auth.logout()}
          variant="ghost"
          size="sm"
          className="text-gray-700 hover:text-gray-900"
        >
          Sign out
        </Button>
      </div>
    );
  }

  const handleLogin = () => {
    auth.login();
  };

  return (
    <Button
      onClick={handleLogin}
      variant="ghost"
      size="sm"
      className="text-gray-700 hover:text-gray-900 pl-1"
    >
      Login
    </Button>
  );
}
