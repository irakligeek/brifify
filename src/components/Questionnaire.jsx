import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2 } from "lucide-react";
import { TextRotator } from "./UI/TextRotator";

export default function Questionnaire({
  questions,
  currentStep,
  formData,
  handleInputChange,
  nextStep,
  isLoading,
}) {
  const maxCharacters = 500;
  return (
    <div className="p-6 relative">
      <div className="overflow-hidden">
        <div
          className="transition-transform duration-500 ease-in-out flex"
          style={{ transform: `translateX(-${currentStep * 100}%)` }}
        >
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="w-full flex-shrink-0 transition-all duration-500"
              style={{
                height: index < currentStep ? "0" : "auto",
                opacity: index < currentStep ? 0 : 1,
                overflow: "hidden",
              }}
            >
              <div className="space-y-6">
                <div className="space-y-4 m-0">
                  <h3 className="text-xl text-gray-600 text-left font-light">
                    {q.question}
                  </h3>
                  <Textarea
                    name={q.id}
                    value={formData[q.id] || ""}
                    onChange={handleInputChange}
                    placeholder={q.placeholder}
                    maxLength={maxCharacters}
                    className={`w-full text-2xl py-3 px-0 resize-none text-gray-600 placeholder:text-gray-300
                       focus-visible:ring-0 focus-visible:ring-offset-0  
                       focus-visible:outline-none focus-visible:border-blue-500
                       border-x-0 border-t-0 border-b-2 border-gray-300
                       flex items-end rounded-none min-h-[60px] overflow-hidden m-0
                       ${index === currentStep && isLoading ? 'loading-border' : ''}`}
                    style={{ verticalAlign: "bottom" }}
                  />
                  <div className="text-left text-gray-400 h-6 flex justify-between">
                    <div className="my-2">
                      {index === currentStep && (
                        <div>{isLoading ? <TextRotator /> : ""}</div>
                      )}
                    </div>
                    <div className="text-sm">
                      {(formData[q.id] || "").length}/{maxCharacters}
                    </div>
                  </div>
                </div>

                {index === currentStep && (
                  <div className="flex justify-start pt-6">
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={isLoading || !formData[q.id]}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2
                        rounded-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <span>Loading...</span>
                          <Loader2 className="animate-spin" />
                        </>
                      ) : (
                        <>
                          Next <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
