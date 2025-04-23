import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { AuthProvider } from "./context/auth/AuthContext";

const cognitoAuthConfig = {
  authority: import.meta.env.VITE_APP_AUTH_AUTHORITY,
  client_id: import.meta.env.VITE_APP_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_APP_REDIRECT_URI,
  response_type: "code",
  scope: "email openid phone",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OidcAuthProvider {...cognitoAuthConfig}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </OidcAuthProvider>
  </React.StrictMode>
);
