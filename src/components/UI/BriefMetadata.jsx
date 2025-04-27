import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Loader2, PlusCircle, Check } from "lucide-react";
import { useBrief } from "@/context/BriefContext";
import { useAuth } from "@/context/auth/AuthContext";
import UserBriefsList from "./UserBriefsList";
import axios from "axios";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function BriefMetadata() {
  const { remainingBriefs, generateNewBrief } = useBrief();
  const { isAuthenticated, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handlePurchaseTokens = async (productId) => {

    try {
      setIsLoading(true);

      // Call the Stripe checkout Lambda function using axios
      const response = await axios.post(
        "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/stripe-checkout",
        {
          productId,
          userId: isAuthenticated ? user.sub : null,
          email: isAuthenticated ? user.email : null,
        }
      );

      const { data } = response;
      // body 
      const body = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

      if (body?.url) {
        // Redirect to Stripe Checkout page
        window.location.href = body.url;
      } else {
        console.error("Failed to create checkout session");
      }
    } catch (error) {
      console.error(
        "Error creating checkout session:",
        error.response?.data || error.message
      );
    } finally {
      setIsLoading(false);
    }
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

          {/* Token Purchase Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-fit flex items-left justify-start gap-2 bg-gradient-to-r from-pink-400 to-purple-700 hover:from-pink-500 hover:to-purple-800 text-white border-none">
                <Coins className="h-4 w-4" />
                Generate More Briefs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[385px] md:!max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Choose a token package</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* 20 Tokens Package */}
                <div
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                  onClick={() => {
                    if (!isLoading) handlePurchaseTokens("20_tokens");
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg">
                        20 Brief Credits
                      </span>
                      <span className="text-gray-600">
                        Generate 20 project briefs
                      </span>
                    </div>
                    <div className="text-xl font-bold">$4.99</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>$0.25 per brief</span>
                  </div>
                </div>

                {/* 100 Tokens Package - Best Value */}
                <div
                  className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-all relative"
                  onClick={() => {
                    if (!isLoading) handlePurchaseTokens("100_tokens");
                  }}
                >
                  <div className="absolute -top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    BEST VALUE
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg">
                        100 Brief Credits
                      </span>
                      <span className="text-gray-600">
                        Generate 100 project briefs
                      </span>
                    </div>
                    <div className="text-xl font-bold">$14.99</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <span>$0.15 per brief</span>
                    <span className="ml-2 text-green-600 flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Save 40%
                    </span>
                  </div>
                </div>

                {isLoading && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
