import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Handles the user onboarding process after successful payment
 * @param {Object} onboardingData - The onboarding data received from the server
 * @param {boolean} onboardingData.needsOnboarding - Whether onboarding is needed
 * @param {string} onboardingData.token - The onboarding token
 * @param {string} onboardingData.cognitoUserId - The Cognito user ID
 * @param {number} onboardingData.expiresAt - The expiration timestamp
 * @param {string} onboardingData.email - The user's email
 * @returns {Promise<boolean>} - Whether onboarding was successful
 */
export const handleUserOnboarding = async (onboardingData) => {
  if (!onboardingData || !onboardingData.needsOnboarding) {
    return false;
  }
  
  // Store onboarding data in localStorage without redirecting
  localStorage.setItem(
    "brifify_onboarding_data",
    JSON.stringify(onboardingData)
  );

  // No longer redirecting - let App.jsx handle the dialog display flow
  // This ensures URL parameters remain intact for session verification
  
  toast.info(
    `Account created for ${onboardingData.email}.`
  );

  return true;
};
