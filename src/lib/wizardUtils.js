import axios from "axios";
import { toast } from "sonner";

// Helper function to get the appropriate user data for API calls
export const getUserData = (auth, anonymousUser) => {
  if (auth.isAuthenticated && auth.user) {
    // If authenticated, use the Cognito user data
    return {
      userId: auth.user.sub,
      sub: auth.user.sub,
      email: auth.user.email,
      cognito_groups: auth.user["cognito:groups"],
      email_verified: auth.user.email_verified,
    };
  } else {
    // If not authenticated, use anonymous user ID
    return { userId: anonymousUser?.id };
  }
};

// Get current user ID for state persistence
export const getCurrentUserId = (auth, anonymousUser) => {
  return auth.isAuthenticated && auth.user ? auth.user.sub : anonymousUser?.id;
};

// Process AI conversation to generate questions
export const processConversation = async (conversationHistory, threadId, userData) => {
  try {
    const response = await axios.post(
      "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-questions",
      {
        messages: conversationHistory,
        userThreadId: threadId,
        ...userData,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return JSON.parse(response.data.body);
  } catch (error) {
    if (error.response?.status === 429) {
      toast.error(
        "You've reached the free brief limit. Get more tokens to continue!"
      );
    } else {
      toast.error("Something went wrong. Please try again.");
    }
    throw error;
  }
};

// Generate brief from completed questionnaire
export const generateBrief = async (conversationHistory, userData) => {
  try {
    const questionnaire = conversationHistory.reduce((acc, _, index, array) => {
      if (index % 2 === 0 && index + 1 < array.length) {
        acc.push({
          question: array[index].content,
          answer: array[index + 1].content,
        });
      }
      return acc;
    }, []);

    const response = await axios.post(
      "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/generate-brief",
      {
        questionnaire,
        ...userData,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return JSON.parse(response.data.body);
  } catch (error) {
    if (error.response?.status === 429) {
      toast.error(
        "You've reached the free brief limit. Get more tokens to continue!"
      );
    } else {
      toast.error("Failed to generate brief. Please try again.");
    }
    throw error;
  }
};

// Save and load wizard state from localStorage
export const saveWizardState = (userId, state) => {
  if (userId) {
    localStorage.setItem(`brifify_wizard_state_${userId}`, JSON.stringify(state));
  }
};

export const loadWizardState = (userId) => {
  if (!userId) return null;
  
  try {
    const savedStateJSON = localStorage.getItem(`brifify_wizard_state_${userId}`);
    if (!savedStateJSON) return null;
    
    const savedState = JSON.parse(savedStateJSON);
    
    // Validate saved state has all required properties and is not at initial state
    if (
      savedState &&
      savedState.currentStep > 0 &&
      savedState.questions &&
      savedState.questions.length > 1 &&
      savedState.threadId
    ) {
      return savedState;
    }
  } catch (error) {
    console.error("Error loading wizard state:", error);
  }
  
  return null;
};

export const clearWizardState = (userId) => {
  if (userId) {
    localStorage.removeItem(`brifify_wizard_state_${userId}`);
  }
};

// Initial question setup
export const getInitialQuestions = () => [
  {
    id: "initialQuestion",
    question: "What is your project about?",
    placeholder: "Describe your project in a few words",
  },
];

// Helper to check if a message indicates the questionnaire is complete
export const isQuestionnaireComplete = (message) => {
  return message
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .trim() === "done";
};