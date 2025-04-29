import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { useAuth } from "@/context/auth/AuthContext";
import { useEffect } from "react";
import { cleanUpUrlParameters } from "@/lib/paymentUtils";

export const ThankYouDialog = ({ isOpen, onClose, email }) => {
  const { login, isAuthenticated } = useAuth();

  // Handle login button click
  const handleLoginClick = () => {
    login();
    // Don't close the dialog automatically - it will close when auth state changes
  };

  // Function to prevent closing when clicking outside
  const handlePointerDownOutside = (event) => {
    event.preventDefault();
  };

  // Clear URL parameters when dialog is shown
  useEffect(() => {
    if (isOpen) {
      cleanUpUrlParameters();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-black mb-2">
            Thank You for Your Purchase!
          </DialogTitle>
          <DialogDescription>
            Your brief tokens have been added to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isAuthenticated ? (
            <p className="mb-4">
              You can now start using your new tokens to create project briefs.
            </p>
          ) : (
            <>
              <p className="mb-4">
                We've detected that you already have an account with the email:{" "}
                <strong>{email}</strong>
              </p>

              <p className="mb-4">
                To access your briefs and use your new tokens, please log in to your account.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-center">
          {isAuthenticated ? (
            <Button
              type="button"
              onClick={onClose}
              className="gap-2 px-8"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleLoginClick}
              className="gap-2 px-8"
            >
              Log In
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};