import "./App.css";
import WizardForm from "./components/WizardForm";
import Layout from "./components/layout/Layout";
import { BriefProvider } from "./context/BriefContext";
import { Toaster } from "./components/UI/sonner";
import { toast } from "sonner";
import { useEffect } from "react";

// Helper function to handle successful payments
const handleSuccessfulPayment = (sessionId) => {
  toast.success(
    "Payment successful! Your brief credits have been added to your account.",
    { duration: 6000 }
  );
  
  // Optional: You could verify the session with your backend here
  // if (sessionId) { verifySession(sessionId); }
  
  cleanUpUrlParameters();
};

// Helper function to handle cancelled payments
const handleCancelledPayment = () => {
  toast.error(
    "Payment cancelled. You can try again when you're ready.",
    { duration: 4000 }
  );
  
  cleanUpUrlParameters();
};

// Helper function to clean up URL parameters
const cleanUpUrlParameters = () => {
  const newUrl = window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
};

function App() {
  useEffect(() => {
    // Check URL parameters for checkout status
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    
    if (checkoutStatus === 'success') {
      handleSuccessfulPayment(sessionId);
    } else if (checkoutStatus === 'cancel') {
      handleCancelledPayment();
    }
  }, []);

  return (
    <BriefProvider>
      <Layout>
        <WizardForm />
      </Layout>
      <Toaster />
    </BriefProvider>
  );
}

export default App;
