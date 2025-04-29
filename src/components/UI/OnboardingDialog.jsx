import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/context/auth/AuthContext";

export const OnboardingDialog = ({ isOpen, onClose, email, expiresAt }) => {
  const { login } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Calculate and update the time remaining
  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining("expired");
        return;
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setTimeRemaining(`${minutes}m ${seconds}s`);
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Get the Cognito login URL instead of password reset
  const getCognitoLoginUrl = () => {
    const cognitoDomain =
      "https://us-east-1wktkjutvk.auth.us-east-1.amazoncognito.com";
    const clientId = import.meta.env.VITE_APP_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      import.meta.env.VITE_APP_REDIRECT_URI
    );

    return `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid+phone&redirect_uri=${redirectUri}`;
  };

  // Handle login button click - open Cognito in a new tab but don't close dialog
  const handleLoginClick = () => {
    // Open the Cognito login URL in a new tab
    window.open(getCognitoLoginUrl(), "_blank");
    // Don't close the dialog - remove the onClose() call
  };

  // Check if the timestamp is valid (it should be a future date)
  const isValidTimestamp =
    expiresAt && expiresAt > Math.floor(Date.now() / 1000);

  // Function to prevent closing when clicking outside
  const handlePointerDownOutside = (event) => {
    event.preventDefault();
  };

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
          <p className="mb-2">
            Your account has been created with the email:{" "}
            <strong>{email}</strong>
          </p>

          <p className="mb-4">
            We sent a temporary password to your email. To complete your account
            setup:
          </p>

          <ol className="list-decimal pl-5 space-y-2 mb-4">
            <li>
              Find the email from <b>no-reply@verificationemail.com</b> with
              your temporary password
            </li>
            <li>Click the "Login" button below</li>
            <li>
              Enter your email: <strong>{email}</strong>
            </li>
            <li>Enter the temporary password from your email</li>
            <li>You'll be prompted to create a new password</li>
            <li>
              Once you've set your new password, you'll be redirected back to
              Brifify where you can login and use your new account.
            </li>
          </ol>

          {timeRemaining && timeRemaining !== "expired" && (
            <p className="text-sm text-amber-600 font-medium">
              Your temporary password will expire in {timeRemaining}
            </p>
          )}

          {timeRemaining === "expired" && (
            <p className="text-sm text-red-600 font-medium">
              Your temporary password has expired. Please contact support for
              assistance.
            </p>
          )}
        </div>

        <DialogFooter className="flex justify-center">
          <Button
            type="button"
            onClick={handleLoginClick}
            className="gap-2 px-8"
            disabled={!isValidTimestamp}
          >
            Login <ExternalLink size={16} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
