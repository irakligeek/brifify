import { useState, useEffect, use } from "react";
import axios from "axios";
import Questionnaire from "./Questionnaire";
import ProjectBrief from "./ProjectBrief";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function WizardForm() {
  const {
    brief,
    updateBrief,
    anonymousUser,
    isInitializing,
    fetchRemainingBriefs,
    saveBrief,
  } = useBrief();
  const auth = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Helper function to get the appropriate user data for API calls
  const getUserData = () => {
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

  const [questions, setQuestions] = useState([
    {
      id: "initialQuestion",
      question: "What is your project about?",
      placeholder: "Describe your project in a few words",
    },
  ]);

  const [formData, setFormData] = useState({});

  // Check for and handle the wizard reset flag
  useEffect(() => {
    const resetFlag = localStorage.getItem("brifify_reset_wizard");
    if (resetFlag === "true") {
      // Reset all wizard state
      setCurrentStep(0);
      setThreadId(null);
      setConversationHistory([]);
      setFormData({});
      setQuestions([
        {
          id: "initialQuestion",
          question: "What is your project about?",
          placeholder: "Describe your project in a few words",
        },
      ]);

      // Clear the flag
      localStorage.removeItem("brifify_reset_wizard");
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    e.target.style.height = "inherit";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  useEffect(() => {
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
      textarea.style.height = "inherit";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [currentStep]);

  const nextStep = async () => {
    const currentQuestion = questions[currentStep];
    const userAnswer = formData[currentQuestion.id];

    if (!userAnswer) return;

    setIsLoading(true);

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
      setConversationHistory(updatedHistory);

      const response = await axios.post(
        "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-questions",
        {
          messages: updatedHistory,
          userThreadId: threadId,
          ...getUserData(), // Use the helper function to get appropriate user data
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseBody = JSON.parse(response.data.body);

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
        setIsLoading(false);
        return;
      }

      const { message, threadId: newThreadId } = responseBody;

      if (!message) {
        toast.error("Unexpected response format");
        setIsLoading(false);
        return;
      }

      // Check for 'done' more flexibly, ignoring case and punctuation
      if (
        message
          .toLowerCase()
          .replace(/[.,!?;:]/g, "")
          .trim() === "done"
      ) {
        try {
          const briefResponse = await axios.post(
            "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/generate-brief",
            {
              questionnaire: updatedHistory.reduce((acc, _, index, array) => {
                if (index % 2 === 0 && index + 1 < array.length) {
                  acc.push({
                    question: array[index].content,
                    answer: array[index + 1].content,
                  });
                }
                return acc;
              }, []),
              ...getUserData(), // Use the helper function to get appropriate user data
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const briefResponseBody = JSON.parse(briefResponse.data.body);

          if (briefResponseBody.error) {
            toast.error(briefResponseBody.error);
            setIsLoading(false);
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
                  console.error("Error saving brief");
                  toast.error("Failed to save brief. Please try again.");
                }
              } catch (error) {
                console.error("Error saving brief:", error);
                toast.error("Failed to save brief. Please try again.");
              }
            }

            // Fetch updated remaining briefs count
            fetchRemainingBriefs();
          }
        } catch (error) {
          console.error("Error generating brief:", error);
          if (error.response?.status === 429) {
            toast.error(
              "You've reached the free brief limit. Get more tokens to continue!"
            );
          } else {
            toast.error("Failed to generate brief. Please try again.");
          }
        }
        setIsLoading(false);
        return;
      }

      // Only add new question if not 'done'
      setThreadId(newThreadId);
      setQuestions((prev) => [
        ...prev,
        {
          id: `question_${prev.length}`,
          question: message,
          placeholder: "Type your answer here...",
        },
      ]);
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      console.error("Error fetching next question:", error);
      if (error.response?.status === 429) {
        toast.error(
          "You've reached the free brief limit. Get more tokens to continue!"
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {brief ? (
        <ProjectBrief initialData={brief} />
      ) : (
        <div className="flex items-center justify-center">
          <div className="w-full">
            <Questionnaire
              questions={questions}
              currentStep={currentStep}
              formData={formData}
              handleInputChange={handleInputChange}
              nextStep={nextStep}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
