import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Loader2, FileIcon, FileText, PlusCircle } from "lucide-react";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";
import UserBriefsList from "./UserBriefsList";

export default function BriefMetadata() {
  const { remainingBriefs, generateNewBrief } = useBrief();
  const { isAuthenticated } = useAuth();

  const handleGetMoreTokens = () => {
    // TODO: Implement token purchase functionality
    console.log("Get More Tokens button clicked... ");
  };

  return (
    <Card className="p-4 mb-6 bg-white rounded-none border-none shadow-none">
      <div className="flex flex-col gap-6">
        {/* Tokens Section */}
        <div className="space-y-3">
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
          <Button
            onClick={handleGetMoreTokens}
            className="w-fit flex items-left justify-start gap-2 bg-gradient-to-r from-pink-400 to-purple-700 hover:from-pink-500 hover:to-purple-800 text-white border-none"
          >
            <Coins className="h-4 w-4" />
            Generate More Briefs
          </Button>
          <div className="pt-4 border-b border-gray-200" />
        </div>

        {/* My Briefs Section */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // Clear the brief data
              generateNewBrief();
              // Reset the wizard state by setting a flag in localStorage
              localStorage.setItem("brifify_reset_wizard", "true");

              // Force a refresh to ensure the wizard resets
              window.location.reload();
            }}
            disabled={remainingBriefs === 0}
            className="flex items-center gap-2 text-sm cursor-pointer
            disabled:text-gray-400 disabled:cursor-not-allowed 
            pl-1 "
          >
            <PlusCircle className="h-4 w-4" />
            <span className="text-sm font-medium truncate">
              Create New Brief
            </span>
          </button>

          {/* Only show the briefs list for authenticated users */}
          {isAuthenticated && (
            <>
              <UserBriefsList />
            </>
          )}

          {/* Show message for anonymous users */}
          {!isAuthenticated && (
            <div className="text-sm text-gray-500 mt-4">
              <p className="mb-2">
                Log in to save and access your briefs across devices.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
