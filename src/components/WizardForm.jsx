import { useState, useEffect } from "react";
import axios from "axios";
import Questionnaire from "./Questionnaire";
import ProjectBrief from "./ProjectBrief";
import { useBrief } from "@/context/BriefContext";

export default function WizardForm() {
  const { brief, updateBrief } = useBrief();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [questions, setQuestions] = useState([
    {
      id: "initialQuestion",
      question: "What is your project about?",
      placeholder: "Describe your project in a few words",
    },
  ]);

  const [formData, setFormData] = useState({});

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
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseBody = JSON.parse(response.data.body);
      const { message, threadId: newThreadId } = responseBody;

      if (message.toLowerCase() === "done") {
        const briefData = {
          questionnaire: updatedHistory.reduce((acc, _, index, array) => {
            if (index % 2 === 0 && index + 1 < array.length) {
              acc.push({
                question: array[index].content,
                answer: array[index + 1].content,
              });
            }
            return acc;
          }, []),
        };

        try {
          const briefResponse = await axios.post(
            "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/generate-brief",
            briefData,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          const briefResponseBody = JSON.parse(briefResponse.data.body);
          const { brief: generatedBrief } = briefResponseBody;
          updateBrief(generatedBrief);
        } catch (error) {
          console.error("Error generating brief:", error);
        }
        return;
      }

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {brief ? (
        <ProjectBrief initialData={brief} />
      ) : (
        <div className="flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
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
