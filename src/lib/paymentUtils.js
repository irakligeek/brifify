import { toast } from "sonner";
import axios from "axios";
import { handleUserOnboarding } from "./utils";
/**
 * Verifies a Stripe session by calling the get-stripe-session API
 * @param {string} sessionId - The Stripe session ID to verify
 * @returns {Promise<object|null>} - The session data or null if verification failed
 */
export const verifySession = async (sessionId) => {
  if (!sessionId) return null;

  try {
    const response = await axios.get(
      `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-stripe-session?session_id=${sessionId}`
    );

    const data = response.data;

    if (data.success && data.session.paymentStatus === "paid") {
      // You could do additional processing here like updating local state
      return data.session;
    } else {
      console.warn("Session verification issue:", data);
      return null;
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    toast.error("Error verifying your payment. Please contact support.");
    return null;
  }
};

/**
 * Checks if a user needs onboarding after successful payment
 * @param {string} email - User's email address
 * @param {string} sessionId - Stripe session ID
 * @param {boolean} isAuthenticated - Whether the user is already logged in
 * @returns {Promise<Object|null>} - Onboarding information or null if no onboarding needed
 */
export const checkUserOnboarding = async (
  email,
  sessionId,
  isAuthenticated
) => {
  // Skip onboarding check if user is already logged in
  if (isAuthenticated) {
    return {
      needsOnboarding: false,
    };
  }

  if (!email || !sessionId) {
    console.error("Email and session ID are required for onboarding check");
    return null;
  }

  try {
    const api = `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-onboarding-token?email=${email}&session_id=${sessionId}`;

    // Instead of using axios directly, use fetch which won't log 404s to console
    const response = await fetch(api);
    
    // Only process successful responses
    if (response.ok) {
      const data = await response.json();

      if (data && data.success) {
        return {
          needsOnboarding: true,
          token: data.token,
          cognitoUserId: data.cognitoUserId,
          expiresAt: data.expiresAt,
          email: data.email,
        };
      }
    }
    
    // For any non-200 response or unsuccessful data, silently return needsOnboarding: false
    return {
      needsOnboarding: false,
    };
  } catch (error) {
    // Catch any unexpected errors but don't show to user
    return {
      needsOnboarding: false,
    };
  }
};

/**
 * Handles successful payment and verifies the session
 * @param {string} sessionId - The Stripe session ID
 * @param {boolean} isAuthenticated - Whether the user is already logged in
 */
export const handleSuccessfulPayment = async (sessionId, isAuthenticated) => {
  // Check if this specific session has already been processed
  const processedSession = sessionStorage.getItem(`payment_success_${sessionId}`);
  if (processedSession) {
    // This session was already processed, so just return the cached result
    console.log("Payment already processed for session:", sessionId);
    return JSON.parse(processedSession);
  }

  if (sessionId) {
    const sessionData = await verifySession(sessionId);
    // Return the session verification result so App.jsx can use it to determine if dialog should show
    if (sessionData && sessionData.metadata) {
      // Show success toast only after verification succeeds - just once per session
      toast.success(
        "Payment successful! Your brief credits have been added to your account.",
        { duration: 6000, id: `payment_toast_${sessionId}` }
      );
      
      // You could update UI or local state with the tokens info
      const email =
        sessionData.customerEmail || sessionData.metadata.email || null;
      const tokensPurchased = sessionData.metadata.tokens || 0;
      const amountPaid = sessionData.amountTotal || 0;
      const productName = sessionData.items[0]?.productName || false;

      // Check if user needs onboarding (only if not logged in)
      if (email) {
        const onboardingStatus = await checkUserOnboarding(
          email,
          sessionId,
          isAuthenticated
        );

        // Create result with full onboarding data if needed
        let result = { isValid: true };

        if (onboardingStatus?.needsOnboarding) {
          // User needs onboarding - call our handler function
          await handleUserOnboarding(onboardingStatus);
          
          // Make sure the result includes needsOnboarding and that the dialog can be shown
          result.needsOnboarding = true;
          
          // Get the stored onboarding data from localStorage to ensure consistency
          const storedData = localStorage.getItem("brifify_onboarding_data");
          if (storedData) {
            try {
              // Include the full onboarding data in the result
              const parsedData = JSON.parse(storedData);
              result.onboardingData = parsedData;
            } catch (error) {
              console.error("Error parsing stored onboarding data:", error);
            }
          }
        } else {
          result.needsOnboarding = false;
        }
        
        // Cache the result so we don't process this payment again
        sessionStorage.setItem(`payment_success_${sessionId}`, JSON.stringify(result));
        return result;
      }
    }
  }

  // Session invalid or verification failed
  return { isValid: false, needsOnboarding: false };
};

/**
 * Handles cancelled payment
 */
export const handleCancelledPayment = () => {
  toast.error("Payment cancelled. You can try again when you're ready.", {
    duration: 4000,
  });

  cleanUpUrlParameters();
};

/**
 * Cleans up URL parameters after handling payment status
 */
export const cleanUpUrlParameters = () => {
  const newUrl = window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
};
