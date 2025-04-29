import { useState, useEffect } from "react";
import Questionnaire from "./Questionnaire";
import ProjectBrief from "./ProjectBrief";
import { useBrief } from "@/context/BriefContext";
import { Loader2 } from "lucide-react";
import WizardStateManager from "./WizardStateManager";
import QuestionProcessor from "./QuestionProcessor";
import ConversationHistory from "./UI/ConversationHistory";
import { getInitialQuestions } from "@/lib/wizardUtils";

export default function WizardForm() {
  const { brief, updateBrief, isInitializing } = useBrief();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [questions, setQuestions] = useState(getInitialQuestions());
  const [formData, setFormData] = useState({});

  // Helper function to handle text area auto-resize
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    e.target.style.height = "inherit";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Auto-resize textareas on step change
  useEffect(() => {
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
      textarea.style.height = "inherit";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }, [currentStep]);

  // Handle the next question from the AI
  const handleNextQuestion = (message, newThreadId, updatedHistory) => {
    const newQuestions = [
      ...questions,
      {
        id: `question_${questions.length}`,
        question: message,
        placeholder: "Type your answer here...",
      },
    ];
    
    setThreadId(newThreadId);
    setQuestions(newQuestions);
    setCurrentStep(currentStep + 1);
    setIsLoading(false);
  };

  // Create an instance of QuestionProcessor
  const questionProcessor = QuestionProcessor({
    currentQuestion: questions[currentStep],
    formData,
    conversationHistory,
    threadId,
    updateConversationHistory: setConversationHistory,
    onNextQuestion: handleNextQuestion,
    onBriefGenerated: updateBrief,
    onLoading: setIsLoading,
  });

  // Handle next step button click
  const nextStep = () => {
    questionProcessor.processNextStep();
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
      {/* State manager component (no UI) */}
      <WizardStateManager
        setCurrentStep={setCurrentStep}
        setThreadId={setThreadId}
        setConversationHistory={setConversationHistory}
        setFormData={setFormData}
        setQuestions={setQuestions}
        currentStep={currentStep}
        threadId={threadId}
        conversationHistory={conversationHistory}
        formData={formData}
        questions={questions}
      />

      {/* Display either the brief or the questionnaire */}
      {brief ? (
        <ProjectBrief initialData={brief} />
      ) : (
        <div className="flex flex-col items-center justify-center">
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
          
          {/* Conversation history display */}
          <ConversationHistory 
            questions={questions} 
            formData={formData}
            currentStep={currentStep}
          />
        </div>
      )}
    </>
  );
}
