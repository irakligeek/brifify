import "./App.css";
import WizardForm from "./components/WizardForm";
import Layout from "./components/layout/Layout";
import { BriefProvider } from "./context/BriefContext";
import { Toaster } from "./components/UI/sonner";
import { useEffect, useState } from "react";
import { useAuth } from "./context/auth/AuthContext";
import { OnboardingDialog } from "./components/UI/OnboardingDialog";
import { ThankYouDialog } from "./components/UI/ThankYouDialog";
import { handleCheckoutProcess } from "./lib/checkoutUtils";
import { loadOnboardingDataFromStorage } from "./lib/onboardingUtils";

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingData, setOnboardingData] = useState(null);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [showThankYouDialog, setShowThankYouDialog] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  
  useEffect(() => {
    // Check URL parameters for checkout status
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    const authCode = urlParams.get('code');
    
    // Store the presence of checkout parameters
    const hasCheckoutParams = checkoutStatus === 'success' && sessionId;
    
    // If auth code is present but we're not handling a password reset from onboarding
    if (authCode) {
      // Only clear dialogs if there are no checkout parameters present
      if (!hasCheckoutParams) {
        setShowOnboardingDialog(false);
        setShowThankYouDialog(false);
      }
      // Don't process checkout parameters when handling auth code
      return;
    }
    
    // Process checkout parameters and handle user flow
    handleCheckoutProcess({
      isAuthenticated,
      hasCheckoutParams,
      checkoutStatus,
      sessionId,
      setSessionVerified,
      setCustomerEmail,
      setOnboardingData,
      setShowOnboardingDialog,
      setShowThankYouDialog
    });
  }, [isAuthenticated, isLoading]);

  // Function to handle closing the onboarding dialog
  const handleCloseOnboarding = () => {
    setShowOnboardingDialog(false);
    // Don't remove data from localStorage or state when closing
  };
  
  // Function to handle closing the thank you dialog
  const handleCloseThankYou = () => {
    setShowThankYouDialog(false);
  };

  // Effect specifically for checking onboarding data in localStorage
  useEffect(() => {
    loadOnboardingDataFromStorage({
      onboardingData,
      setOnboardingData,
      setSessionVerified,
      setCustomerEmail,
      setShowOnboardingDialog
    });
  }, [onboardingData]);

  return (
    <BriefProvider>
      <Layout>
        <WizardForm />
      </Layout>
      <Toaster />
      
      {/* Show onboarding dialog for new users */}
      {onboardingData && sessionVerified && showOnboardingDialog && (
        <OnboardingDialog
          isOpen={true}
          onClose={handleCloseOnboarding}
          email={onboardingData.email}
          expiresAt={onboardingData.expiresAt}
        />
      )}
      
      {/* Show thank you dialog for after users succesfully purchase brief tokens */}
      {sessionVerified && showThankYouDialog && (
        <ThankYouDialog
          isOpen={true}
          onClose={handleCloseThankYou}
          email={customerEmail}
        />
      )}
    </BriefProvider>
  );
}

export default App;
