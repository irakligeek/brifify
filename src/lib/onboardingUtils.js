/**
 * Handles onboarding flow based on payment result and stored data
 * @param {Object} params - Onboarding parameters
 * @param {Object} params.result - Payment session result
 * @param {string} params.storedOnboardingData - Stored onboarding data from localStorage
 * @param {string} params.sessionId - Session ID from URL
 * @param {Function} params.setOnboardingData - State setter for onboarding data
 * @param {Function} params.setShowOnboardingDialog - State setter for onboarding dialog
 * @param {Function} params.setShowThankYouDialog - State setter for thank you dialog
 */
export const handleOnboardingFlow = ({
  result,
  storedOnboardingData,
  sessionId,
  setOnboardingData,
  setShowOnboardingDialog,
  setShowThankYouDialog
}) => {
  // New user who needs onboarding
  if (storedOnboardingData) {
    try {
      const parsedData = JSON.parse(storedOnboardingData);
      
      // Validate that the stored data matches the current session
      if (!parsedData.sessionId || parsedData.sessionId === sessionId) {
        setOnboardingData(parsedData);
        setShowOnboardingDialog(true);
        setShowThankYouDialog(false);
      } else {
        // Session mismatch - this is old data from another purchase
        console.warn('Stored onboarding data belongs to a different session');
        localStorage.removeItem('brifify_onboarding_data');
        
        // If result has new onboarding data, use that instead
        if (result.onboardingData) {
          setOnboardingData(result.onboardingData);
          setShowOnboardingDialog(true);
          setShowThankYouDialog(false);
        }
      }
    } catch (error) {
      console.error('Error parsing onboarding data:', error);
      localStorage.removeItem('brifify_onboarding_data');
    }
  }
  // If result has onboardingData directly, use that
  else if (result.onboardingData) {
    setOnboardingData(result.onboardingData);
    setShowOnboardingDialog(true);
    setShowThankYouDialog(false);
  }
};

/**
 * Loads onboarding data from localStorage and check for URL parameters
 * @param {Object} params - Parameters for loading
 * @param {Object|null} params.onboardingData - Current onboarding data state
 * @param {Function} params.setOnboardingData - State setter for onboarding data
 * @param {Function} params.setSessionVerified - State setter for session verification
 * @param {Function} params.setCustomerEmail - State setter for customer email
 * @param {Function} params.setShowOnboardingDialog - State setter for onboarding dialog visibility
 * @returns {boolean} - Whether onboarding data was loaded successfully
 */
export const loadOnboardingDataFromStorage = ({
  onboardingData,
  setOnboardingData,
  setSessionVerified,
  setCustomerEmail,
  setShowOnboardingDialog
}) => {
  // If we already have onboarding data loaded, don't overwrite it
  if (onboardingData) return false;
  
  const storedData = localStorage.getItem('brifify_onboarding_data');
  if (!storedData) return false;
  
  try {
    const parsedData = JSON.parse(storedData);
    
    // Get current URL session ID if any
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    
    // Only use stored data if it matches current session ID or no session ID in URL
    if (!parsedData.sessionId || !sessionId || parsedData.sessionId === sessionId) {
      setOnboardingData(parsedData);
      setSessionVerified(true);
      
      if (parsedData.email) {
        setCustomerEmail(parsedData.email);
      }
      
      // Only show dialog if URL has checkout=success parameter
      if (checkoutStatus === 'success' && sessionId) {
        setShowOnboardingDialog(true);
      }
      
      return true;
    } else {
      // Data from a different session - don't use it
      console.warn('Stored onboarding data belongs to a different session');
      return false;
    }
  } catch (error) {
    console.error('Error parsing onboarding data:', error);
    localStorage.removeItem('brifify_onboarding_data');
    return false;
  }
};