import { handleSuccessfulPayment, handleCancelledPayment } from "./paymentUtils";
import { handleOnboardingFlow } from "./onboardingUtils";

/**
 * Extract customer email from payment session result
 * @param {Object} result - Payment session result object
 * @returns {string|null} - Customer email if found, null otherwise
 */
export const extractEmailFromPaymentResult = (result) => {
  if (!result) return null;
  
  let email = null;
  
  // Extract email from result if available
  if (result.sessionData && result.sessionData.customerEmail) {
    email = result.sessionData.customerEmail;
  } else if (result.sessionData && result.sessionData.metadata && result.sessionData.metadata.email) {
    email = result.sessionData.metadata.email;
  } else if (result.onboardingData && result.onboardingData.email) {
    email = result.onboardingData.email;
  }
  
  return email;
};

/**
 * Processes a successful checkout and determines user flow
 * @param {Object} params - Checkout processing parameters
 * @param {string} params.sessionId - Stripe session ID
 * @param {boolean} params.isAuthenticated - User authentication status
 * @param {string} params.storedOnboardingData - Stored onboarding data from localStorage
 * @param {Function} params.setSessionVerified - State setter for session verification
 * @param {Function} params.setCustomerEmail - State setter for customer email
 * @param {Function} params.setOnboardingData - State setter for onboarding data
 * @param {Function} params.setShowOnboardingDialog - State setter for onboarding dialog
 * @param {Function} params.setShowThankYouDialog - State setter for thank you dialog
 * @returns {Promise<boolean>} - Whether checkout was successfully processed
 */
export const processSuccessfulCheckout = async ({
  sessionId,
  isAuthenticated,
  storedOnboardingData,
  setSessionVerified,
  setCustomerEmail,
  setOnboardingData,
  setShowOnboardingDialog,
  setShowThankYouDialog
}) => {
  if (!sessionId) return false;
  
  // If there's a previous session and it doesn't match current session ID,
  // clear the previous onboarding data to prevent showing wrong user info
  const currentSession = localStorage.getItem('brifify_current_session');
  if (currentSession && currentSession !== sessionId) {
    localStorage.removeItem('brifify_onboarding_data');
  }
  
  // Pass isAuthenticated to handleSuccessfulPayment
  const result = await handleSuccessfulPayment(sessionId, isAuthenticated);
  
  // Only proceed if the session is valid
  if (!result || !result.isValid) return false;
  
  setSessionVerified(true);
  
  // Get the email from the session verification
  const email = extractEmailFromPaymentResult(result);
  
  if (email) {
    setCustomerEmail(email);
  }
  
  // Handle new users vs. existing users
  if (result.needsOnboarding) {
    handleOnboardingFlow({
      result,
      storedOnboardingData,
      sessionId,
      setOnboardingData,
      setShowOnboardingDialog,
      setShowThankYouDialog
    });
  } else {
    // Existing user who doesn't need onboarding
    // Show Thank You dialog for both authenticated and non-authenticated users
    setShowThankYouDialog(true);
    setShowOnboardingDialog(false);
  }
  
  return true;
};

/**
 * Process stored onboarding data with URL params
 * @param {Object} params - Processing parameters
 * @param {string} params.storedOnboardingData - Stored onboarding data from localStorage
 * @param {string} params.sessionId - Stripe session ID
 * @param {Function} params.setOnboardingData - State setter for onboarding data
 * @param {Function} params.setSessionVerified - State setter for session verification
 * @param {Function} params.setShowOnboardingDialog - State setter for onboarding dialog
 * @param {Function} params.setShowThankYouDialog - State setter for thank you dialog
 * @param {Function} params.setCustomerEmail - State setter for customer email
 * @returns {boolean} - Whether processing was successful
 */
export const processStoredOnboardingData = ({
  storedOnboardingData,
  sessionId,
  setOnboardingData,
  setSessionVerified,
  setShowOnboardingDialog,
  setShowThankYouDialog,
  setCustomerEmail
}) => {
  if (!storedOnboardingData) return false;
  
  try {
    const parsedData = JSON.parse(storedOnboardingData);
    
    // Validate that the stored data matches the current session in URL
    if (!parsedData.sessionId || parsedData.sessionId === sessionId) {
      setOnboardingData(parsedData);
      setSessionVerified(true);
      setShowOnboardingDialog(true);
      setShowThankYouDialog(false);
      
      if (parsedData.email) {
        setCustomerEmail(parsedData.email);
      }
      
      return true;
    } else {
      // Session mismatch - this is data from another purchase
      console.warn('Stored onboarding data belongs to a different session than URL parameter');
      localStorage.removeItem('brifify_onboarding_data');
      return false;
    }
  } catch (error) {
    console.error('Error parsing onboarding data:', error);
    localStorage.removeItem('brifify_onboarding_data');
    return false;
  }
};

/**
 * Handle checkout process by examining URL parameters
 * @param {Object} params - Checkout parameters
 * @param {boolean} params.isAuthenticated - User authentication status
 * @param {boolean} params.hasCheckoutParams - Whether URL has checkout parameters
 * @param {string} params.checkoutStatus - Checkout status from URL
 * @param {string} params.sessionId - Session ID from URL
 * @param {Function} params.setSessionVerified - State setter for session verification
 * @param {Function} params.setCustomerEmail - State setter for customer email
 * @param {Function} params.setOnboardingData - State setter for onboarding data
 * @param {Function} params.setShowOnboardingDialog - State setter for onboarding dialog
 * @param {Function} params.setShowThankYouDialog - State setter for thank you dialog
 * @returns {Promise<void>}
 */
export const handleCheckoutProcess = async ({
  isAuthenticated,
  hasCheckoutParams,
  checkoutStatus,
  sessionId,
  setSessionVerified,
  setCustomerEmail,
  setOnboardingData,
  setShowOnboardingDialog,
  setShowThankYouDialog
}) => {
  // Important: Always check localStorage first for any existing onboarding data
  const storedOnboardingData = localStorage.getItem('brifify_onboarding_data');
  
  if (checkoutStatus === 'success' && sessionId) {
    await processSuccessfulCheckout({
      sessionId,
      isAuthenticated,
      storedOnboardingData,
      setSessionVerified,
      setCustomerEmail,
      setOnboardingData,
      setShowOnboardingDialog,
      setShowThankYouDialog
    });
  } else if (checkoutStatus === 'cancel') {
    handleCancelledPayment();
  } else if (storedOnboardingData && hasCheckoutParams) {
    // Only show dialog if we have checkout parameters in the URL
    // This prevents showing the dialog when users return from password reset
    processStoredOnboardingData({
      storedOnboardingData,
      sessionId,
      setOnboardingData,
      setSessionVerified,
      setShowOnboardingDialog,
      setShowThankYouDialog,
      setCustomerEmail
    });
  }
};