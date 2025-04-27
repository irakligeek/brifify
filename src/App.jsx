import "./App.css";
import WizardForm from "./components/WizardForm";
import Layout from "./components/layout/Layout";
import { BriefProvider } from "./context/BriefContext";
import { Toaster } from "./components/UI/sonner";
import { useEffect, useState } from "react";
import { handleSuccessfulPayment, handleCancelledPayment, cleanUpUrlParameters } from "./lib/paymentUtils";
import { useAuth } from "./context/auth/AuthContext";
import { OnboardingDialog } from "./components/UI/OnboardingDialog";

function App() {
  const { isAuthenticated } = useAuth();
  const [onboardingData, setOnboardingData] = useState(null);
  const [sessionVerified, setSessionVerified] = useState(false);

  useEffect(() => {
    // Check URL parameters for checkout status
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    const authCode = urlParams.get('code');
    
    // console.log("URL params:", { checkoutStatus, sessionId, authCode });
    
    // If auth code is present but we're not handling a password reset from onboarding
    // Don't clear onboarding data if user is in the process of setting up their account
    if (authCode) {
      // Check if this is part of the onboarding flow by looking for onboarding data
      const hasOnboardingData = localStorage.getItem('brifify_onboarding_data');
      
      // Only clear onboarding data if it's not part of an onboarding flow
      if (!hasOnboardingData) {
        localStorage.removeItem('brifify_onboarding_data');
        setOnboardingData(null);
        setSessionVerified(false);
      }
      
      // Don't process checkout parameters when handling auth code
      return;
    }
    
    async function handleCheckout() {
      // Important: Always check localStorage first for any existing onboarding data
      const storedOnboardingData = localStorage.getItem('brifify_onboarding_data');
      
      if (checkoutStatus === 'success' && sessionId) {
        
        // Pass isAuthenticated to handleSuccessfulPayment
        const result = await handleSuccessfulPayment(sessionId, isAuthenticated);
        
        // Only set sessionVerified to true if the session is valid
        if (result && result.isValid) {
          setSessionVerified(true);
          
          // If we have onboarding data in localStorage, use it
          if (storedOnboardingData) {
            try {
              const parsedData = JSON.parse(storedOnboardingData);
              console.log("Using onboarding data from localStorage:", parsedData);
              setOnboardingData(parsedData);
            } catch (error) {
              console.error('Error parsing onboarding data:', error);
              localStorage.removeItem('brifify_onboarding_data');
            }
          }
          // If result has onboardingData directly, use that
          else if (result.onboardingData) {
            setOnboardingData(result.onboardingData);
          }
        }
      } else if (checkoutStatus === 'cancel') {
        handleCancelledPayment();
      } else if (storedOnboardingData) {
        // If no checkout parameters but we have stored onboarding data, use it
        try {
          const parsedData = JSON.parse(storedOnboardingData);
          setOnboardingData(parsedData);
          setSessionVerified(true); // Consider the session verified if loaded from localStorage
        } catch (error) {
          console.error('Error parsing onboarding data:', error);
          localStorage.removeItem('brifify_onboarding_data');
        }
      }
    }
    
    handleCheckout();
  }, [isAuthenticated]); // Add isAuthenticated back to dependency array to ensure it runs when auth state changes

  // Function to handle closing the onboarding dialog
  const handleCloseOnboarding = () => {
    setOnboardingData(null);
    setSessionVerified(false);
    localStorage.removeItem('brifify_onboarding_data');
    // Clean up URL parameters when closing the dialog
    cleanUpUrlParameters();
  };

  // Effect specifically for checking onboarding data in localStorage
  // This ensures the dialog shows up even if the main useEffect doesn't catch it
  useEffect(() => {
    // If we already have onboarding data loaded, don't overwrite it
    if (onboardingData) return;
    
    const storedData = localStorage.getItem('brifify_onboarding_data');
    if (storedData) {
      try {
        console.log("Found onboarding data in localStorage check");
        const parsedData = JSON.parse(storedData);
        setOnboardingData(parsedData);
        setSessionVerified(true);
      } catch (error) {
        console.error('Error parsing onboarding data:', error);
        localStorage.removeItem('brifify_onboarding_data');
      }
    }
  }, [onboardingData]);

  return (
    <BriefProvider>
      <Layout>
        <WizardForm />
      </Layout>
      <Toaster />
      
      {/* Show dialog only when both onboardingData exists AND session is verified */}
      {onboardingData && sessionVerified && (
        <OnboardingDialog
          isOpen={true}
          onClose={handleCloseOnboarding}
          email={onboardingData.email}
          expiresAt={onboardingData.expiresAt}
        />
      )}
    </BriefProvider>
  );
}

export default App;
