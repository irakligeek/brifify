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
      <div className="flex flex-col sm:!flex-row gap-4 justify-start items-start sm:!items-center sm:!justify-between">
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
        </div>

        <div className="flex items-start gap-2 flex-col sm:!flex-row sm:items-center">
          <Button
            onClick={generateNewBrief}
            disabled={remainingBriefs === 0}
            className="flex items-center gap-2 "
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Generate New Brief
          </Button>
          <Button
            onClick={handleGetMoreTokens}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Coins className="h-4 w-4" />
            Get More Tokens
          </Button>
        </div>
      </div>
    </Card>
  );
}
