import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Loader2, RefreshCw } from "lucide-react";
import { useBrief } from "@/context/BriefContext";

export default function BriefMetadata() {
  const { remainingBriefs, generateNewBrief } = useBrief();
  
  const handleGetMoreTokens = () => {
    // TODO: Implement token purchase functionality
    console.log("Get More Tokens button clicked... ");
  };

  return (
    <Card className="p-4 mb-6 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {remainingBriefs === null ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                Remaining Briefs:{" "}
                <span className="font-semibold text-blue-600">
                  {remainingBriefs}
                </span>
              </>
            )}
          </span>

          <Button
            onClick={generateNewBrief}
            disabled={remainingBriefs === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Generate New Brief
          </Button>
        </div>

        <Button
          onClick={handleGetMoreTokens}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Coins className="h-4 w-4" />
          Get More Tokens
        </Button>
      </div>
    </Card>
  );
}
