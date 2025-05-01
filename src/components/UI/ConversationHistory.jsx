import React from "react";
import { Separator } from "@/components/UI/separator";
import { cn } from "@/lib/utils";

export default function ConversationHistory({
  questions,
  formData,
  currentStep,
}) {
  // Only show history for questions that have been processed (i.e., not the current question)
  const answeredQuestions = questions.filter(
    (question, index) =>
      index < currentStep && // Only show questions before the current one
      formData[question.id] !== undefined &&
      formData[question.id] !== ""
  );

  if (answeredQuestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-8 mb-4 w-full mx-auto text-left pl-6")}>
      <Separator className="my-4 bg-gray-100" />
      <h3 className="text-sm font-medium mb-3 text-gray-600 uppercase tracking-wide">
        Questions log
      </h3>
      <div className="space-y-3">
        {answeredQuestions.map((question, index) => (
          <div key={question.id} className="space-y-1">
            <div className="flex items-start">
              <span className="text-gray-400 mr-2 min-w-[16px] text-sm">
                {index + 1}.
              </span>
              <div className="flex-1">
                <p className="text-gray-500 text-sm font-medium">
                  {question.question}
                </p>
                <p className="text-gray-400 mt-1 text-sm">
                  {formData[question.id]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
