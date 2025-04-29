import { useState, useEffect, useRef } from "react";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";
import { 
  getCurrentUserId, 
  loadWizardState, 
  clearWizardState, 
  getInitialQuestions, 
  saveWizardState 
} from "@/lib/wizardUtils";

export default function WizardStateManager({
  setCurrentStep,
  setThreadId,
  setConversationHistory,
  setFormData,
  setQuestions,
  currentStep,
  threadId,
  conversationHistory,
  formData,
  questions
}) {
  const { isInitializing, anonymousUser } = useBrief();
  const auth = useAuth();
  const [lastLoadedUserId, setLastLoadedUserId] = useState(null);
  
  // Track if state has been loaded from localStorage
  const stateLoaded = useRef(false);
  
  // Track if the component is mounted
  const isMounted = useRef(false);

  // Mark component as mounted
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Clear wizard state when user changes (logout/login)
  useEffect(() => {
    const currentUserId = getCurrentUserId(auth, anonymousUser);
    
    if (!currentUserId || !isMounted.current) return;
    
    // Only handle user transitions after initial state load
    if (stateLoaded.current && lastLoadedUserId && currentUserId !== lastLoadedUserId) {
      // User has changed, reset state
      resetWizardToInitialState();
    }
    
    // Update the lastLoadedUserId
    if (currentUserId) {
      setLastLoadedUserId(currentUserId);
    }
  }, [auth.isAuthenticated, auth.user, anonymousUser]);

  // Load saved wizard state on component mount
  useEffect(() => {
    if (isInitializing) return; // Wait until initialization is complete
    
    const loadState = () => {
      const userId = getCurrentUserId(auth, anonymousUser);
      if (!userId) return;
      
      console.log("Attempting to load wizard state for user:", userId);
      
      const savedState = loadWizardState(userId);
      if (savedState) {
        console.log("Restoring wizard state from localStorage");
        
        // Apply saved state to component state
        setCurrentStep(savedState.currentStep);
        setThreadId(savedState.threadId);
        setConversationHistory(savedState.conversationHistory || []);
        setFormData(savedState.formData || {});
        setQuestions(savedState.questions);
        setLastLoadedUserId(userId);
        stateLoaded.current = true;
        
        console.log("State restored. Current step:", savedState.currentStep);
      } else {
        console.log("No valid saved state found for user:", userId);
        // Mark as loaded even if no state was found, to allow saving new state
        stateLoaded.current = true;
      }
    };

    // Load state immediately and after a short delay to ensure context is ready
    loadState();
    const delayedLoad = setTimeout(loadState, 500);
    
    return () => clearTimeout(delayedLoad);
  }, [isInitializing, anonymousUser, auth.user]);

  // Reset wizard to initial state without clearing localStorage
  const resetWizardToInitialState = () => {
    setCurrentStep(0);
    setThreadId(null);
    setConversationHistory([]);
    setFormData({});
    setQuestions(getInitialQuestions());
  };

  // Save wizard state whenever it changes
  useEffect(() => {
    const userId = getCurrentUserId(auth, anonymousUser);
    
    // Don't try to save if we're in the initial state or if component isn't mounted
    if (!userId || !isMounted.current) return;
    
    // For the initial question (step 0), only save if user has typed something
    if (currentStep === 0 && !formData.initialQuestion) return;
    
    // Always save state if we have meaningful data, even before completely loaded
    if ((currentStep > 0 || (formData.initialQuestion && formData.initialQuestion.trim().length > 0)) && 
        threadId && questions.length > 0) {
      
      console.log("Saving wizard state to localStorage for user:", userId);
      
      const stateToSave = {
        currentStep,
        threadId,
        conversationHistory,
        formData,
        questions,
      };
      
      saveWizardState(userId, stateToSave);
    }
  }, [currentStep, threadId, conversationHistory, formData, questions, auth.isAuthenticated, auth.user, anonymousUser]);

  // Check for and handle the wizard reset flag
  useEffect(() => {
    if (!isMounted.current) return;
    
    const resetFlag = localStorage.getItem("brifify_reset_wizard");
    if (resetFlag === "true") {
      const userId = getCurrentUserId(auth, anonymousUser);
      clearWizardState(userId);
      resetWizardToInitialState();
      // Clear the flag
      localStorage.removeItem("brifify_reset_wizard");
    }
  }, []);

  return null; // This is a logic-only component, no UI
}