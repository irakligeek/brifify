import { toast } from "sonner";
import { useState } from "react";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";
import { 
  getUserData, 
  getCurrentUserId,
  processConversation, 
  generateBrief, 
  isQuestionnaireComplete,
  clearWizardState
} from "@/lib/wizardUtils";

export default function QuestionProcessor({
  currentQuestion,
  formData,
  conversationHistory,
  threadId,
  updateConversationHistory,
  onNextQuestion,
  onBriefGenerated,
  onLoading,
}) {
  const { updateBrief, fetchRemainingBriefs, saveBrief, anonymousUser } = useBrief();
  const auth = useAuth();
  
  const processNextStep = async () => {
    const userAnswer = formData[currentQuestion.id];
    if (!userAnswer) return;

    onLoading(true);

    try {
      const newUserMessage = { role: "user", content: userAnswer };
      const currentQuestionMessage = {
        role: "assistant",
        content: currentQuestion.question,
      };
      
      const updatedHistory = [
        ...conversationHistory,
        currentQuestionMessage,
        newUserMessage,
      ];
      
      updateConversationHistory(updatedHistory);

      const responseBody = await processConversation(
        updatedHistory,
        threadId,
        getUserData(auth, anonymousUser)
      );

      // First check if there's an error in the response
      if (responseBody.error) {
        if (responseBody.error === "Brief limit reached") {
          fetchRemainingBriefs();
          toast.error(
            "You've reached the free brief limit. Get more tokens to continue!"
          );
        } else {
          toast.error(responseBody.error);
        }
        onLoading(false);
        return;
      }

      const { message, threadId: newThreadId } = responseBody;

      if (!message) {
        toast.error("Unexpected response format");
        onLoading(false);
        return;
      }

      // Check if the questionnaire is complete
      if (isQuestionnaireComplete(message)) {
        await handleQuestionnaireComplete(updatedHistory);
        return;
      }

      // Continue with the next question
      onNextQuestion(message, newThreadId, updatedHistory);
    } catch (error) {
      console.error("Error processing next step:", error);
      onLoading(false);
    }
  };

  const handleQuestionnaireComplete = async (conversationHistory) => {
    try {
      const briefResponseBody = await generateBrief(
        conversationHistory, 
        getUserData(auth, anonymousUser)
      );

      if (briefResponseBody.error) {
        toast.error(briefResponseBody.error);
        onLoading(false);
        return;
      }

      const { brief: generatedBrief } = briefResponseBody;

      if (generatedBrief) {
        updateBrief(generatedBrief);

        // If the user is authenticated, save the brief using the context function
        if (auth.isAuthenticated && auth.user) {
          try {
            const saveResult = await saveBrief(generatedBrief);
            if (saveResult && saveResult.success) {
              toast.success("Brief saved successfully!");
            } else {
              toast.error("Failed to save brief. Please try again.");
            }
          } catch (error) {
            toast.error("Failed to save brief. Please try again.");
          }
        }

        // Fetch updated remaining briefs count
        fetchRemainingBriefs();
        
        // Clear wizard state when brief is successfully generated
        const userId = getCurrentUserId(auth, anonymousUser);
        clearWizardState(userId);
        
        // Notify parent that brief was generated
        onBriefGenerated(generatedBrief);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error(
          "You've reached the free brief limit. Get more tokens to continue!"
        );
      } else {
        toast.error("Failed to generate brief. Please try again.");
      }
    } finally {
      onLoading(false);
    }
  };

  return {
    processNextStep,
  };
}