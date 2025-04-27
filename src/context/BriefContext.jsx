import { createContext, useContext, useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import axios from "axios";
import { useAuth } from "./auth/AuthContext";

const BRIEF_STORAGE_KEY = "brifify_brief";
const ANONYMOUS_USER_KEY = "brifify_anonymous_user";

const BriefContext = createContext();

const useBrief = () => {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error("useBrief must be used within a BriefProvider");
  }
  return context;
};

const BriefProvider = ({ children }) => {
  const [brief, setBrief] = useState(null);
  const [anonymousUser, setAnonymousUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [remainingBriefs, setRemainingBriefs] = useState(null);
  const [savedBriefs, setSavedBriefs] = useState([]);
  const auth = useAuth();

  useEffect(() => {
    initializeAnonymousUser();

    // Only load brief from localStorage if user is not authenticated
    if (!auth.isAuthenticated) {
      loadBrief();
    } else {
      // For authenticated users, clear any previously loaded anonymous brief
      setBrief(null);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (anonymousUser?.id || (auth.isAuthenticated && auth.user)) {
      fetchRemainingBriefs();
    }

    // Fetch saved briefs when user logs in
    if (auth.isAuthenticated && auth.user) {
      fetchUserBriefs();
    }
  }, [anonymousUser?.id, auth.isAuthenticated, auth.user]);

  const initializeAnonymousUser = async () => {
    // Anonymous user is only needed for anonymous sessions
    if (auth.isAuthenticated) {
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    const savedUser = localStorage.getItem(ANONYMOUS_USER_KEY);

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Update the last seen timestamp
        parsedUser.lastSeen = new Date().toISOString();

        // Save the updated user data
        localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(parsedUser));
        setAnonymousUser(parsedUser);

        // Ensure user exists in backend even if we loaded from localStorage
        await ensureUserExistsInBackend(parsedUser);
      } catch (error) {
        console.error("Error parsing saved anonymous user:", error);
        await createNewAnonymousUser();
      }
    } else {
      await createNewAnonymousUser();
    }
    setIsInitializing(false);
  };

  const createNewAnonymousUser = async () => {
    try {
      // Initialize the FingerprintJS agent
      const fpPromise = FingerprintJS.load();

      // Get the visitor identifier
      const fp = await fpPromise;
      const result = await fp.get();

      // This is the visitor identifier:
      const visitorId = result.visitorId;

      // Create user data with FingerprintJS result
      const user = {
        id: visitorId,
        fingerprint: visitorId,
        visitorId: visitorId,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        // Device information from navigator
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
      setAnonymousUser(user);

      // Call to create the user in the backend if it doesn't exist yet
      await createAnonymousUserInBackend(user);

      return user;
    } catch (error) {
      console.error("Error creating anonymous user with FingerprintJS:", error);
      // Fallback to simpler identification if FingerprintJS fails
      const fallbackId = `fb-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      const fallbackUser = {
        id: fallbackId,
        fingerprint: fallbackId,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isFallback: true,
      };

      localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(fallbackUser));
      setAnonymousUser(fallbackUser);

      // Try to create fallback user in backend
      await createAnonymousUserInBackend(fallbackUser);

      return fallbackUser;
    }
  };

  const createAnonymousUserInBackend = async (user) => {
    try {
      // Make an API call to create the user in the backend with only essential data
      const response = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/save-user`,
        {
          userId: user.id,
          isAnonymous: true,
          createdAt: user.createdAt,
          lastSeen: user.lastSeen,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.body) {
        const data = JSON.parse(response.data.body);

        if (data.success) {
          // Now that we've confirmed the user is created in the backend,
          // we can safely fetch the remaining briefs
          await fetchRemainingBriefs();
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error creating anonymous user in backend:", error);
      return false;
    }
  };

  const ensureUserExistsInBackend = async (user) => {
    try {
      // First check if the user exists by trying to fetch their token count
      const checkResponse = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-ramaining-tokens`,
        {
          userId: user.id,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Parse the response
      const checkData =
        checkResponse.data && checkResponse.data.body
          ? JSON.parse(checkResponse.data.body)
          : {};

      // If we got an error response with "User not found", we need to create the user
      if (checkData.error && checkData.error.includes("User not found")) {
        // Create the user in the backend
        return await createAnonymousUserInBackend(user);
      } else if (checkData.remainingBriefs !== undefined) {
        // User already exists and we have the token count
        setRemainingBriefs(checkData.remainingBriefs);
        return true;
      } else {
        // Something else went wrong, try creating the user
        return await createAnonymousUserInBackend(user);
      }
    } catch (error) {
      console.error("Error ensuring user exists in backend:", error);

      // If there was an error, try to create the user
      return await createAnonymousUserInBackend(user);
    }
  };

  const loadBrief = () => {
    // ONLY load from localStorage for anonymous users
    if (!auth.isAuthenticated) {
      const savedBrief = localStorage.getItem(BRIEF_STORAGE_KEY);
      if (savedBrief) {
        try {
          const parsedBrief = JSON.parse(savedBrief);
          setBrief(parsedBrief);
        } catch (error) {
          console.error("Error parsing saved brief:", error);
          localStorage.removeItem(BRIEF_STORAGE_KEY);
        }
      }
    }
  };

  const updateBrief = (newBrief) => {
    setBrief(newBrief);
    // Only save brief to localStorage for anonymous users
    if (!auth.isAuthenticated) {
      if (newBrief) {
        localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(newBrief));
      } else {
        localStorage.removeItem(BRIEF_STORAGE_KEY);
      }
    }
  };

  const generateNewBrief = () => {
    setBrief(null);
    // Only remove from localStorage for anonymous users
    if (!auth.isAuthenticated) {
      localStorage.removeItem(BRIEF_STORAGE_KEY);
    }
    return true;
  };

  const saveBrief = async (briefData) => {
    if (!auth.isAuthenticated || !auth.user) {
      return null;
    }

    try {
      // Changed from accessToken to idToken or use the id_token directly
      const userToken = auth.user.idToken || auth.user.id_token;

      if (!userToken) {
        console.error("No authentication token available");
        return null;
      }

      // Add cache-busting parameter and disable browser caching
      const response = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/save-brief`,
        {
          userId: auth.user.sub,
          briefData,
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = JSON.parse(response.data.body);

      if (responseData.success) {
        // Refresh the user's briefs list
        fetchUserBriefs();
        return responseData;
      } else {
        console.error("Error saving brief:", responseData.error);
        return null;
      }
    } catch (error) {
      console.error("Error saving brief:", error);
      return null;
    }
  };

  const deleteBrief = async (briefId) => {
    if (!auth.isAuthenticated || !auth.user) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const userToken = auth.user.idToken || auth.user.id_token;

      if (!userToken) {
        console.error("No authentication token available");
        return { success: false, error: "No authentication token available" };
      }

      const response = await axios.delete(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/delete-brief`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
          data: {
            userId: auth.user.sub,
            briefId,
          },
        }
      );

      const responseData = response.data.body
        ? JSON.parse(response.data.body)
        : response.data;

      if (responseData.success) {
        // Refresh the user's briefs list after successful deletion
        await fetchUserBriefs();
        // Clear the current brief if it was the one deleted
        if (brief && brief.briefId === briefId) {
          setBrief(null);
          localStorage.removeItem(BRIEF_STORAGE_KEY);
        }
        return responseData;
      } else {
        console.error("Error deleting brief:", responseData.error);
        return {
          success: false,
          error: responseData.error || "Failed to delete brief",
        };
      }
    } catch (error) {
      console.error("Error deleting brief:", error);
      return {
        success: false,
        error: error.message || "Failed to delete brief",
      };
    }
  };

  const fetchUserBriefs = async () => {
    // Only fetch user briefs for authenticated users
    if (!auth.isAuthenticated || !auth.user) {
      setSavedBriefs([]);
      return;
    }

    try {
      const userToken = auth.user.idToken || auth.user.id_token;

      if (!userToken) {
        console.error("No authentication token available");
        setSavedBriefs([]);
        return;
      }

      // Use the GET API endpoint as specified
      const response = await axios.get(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-briefs?userId=${auth.user.sub}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Parse the response data
      const responseData =
        typeof response.data === "string"
          ? JSON.parse(response.data.body || response.data)
          : response.data;

      if (responseData.success && responseData.briefs) {
        // Make sure we have an array of briefs
        const briefsArray = Array.isArray(responseData.briefs)
          ? responseData.briefs
          : [];

        // Process each brief to ensure it has the right structure
        const processedBriefs = briefsArray.map((brief) => {
          // Make sure the brief has the necessary properties for display
          return {
            ...brief,
            // Use title from top level or from briefData.project_title
            title:
              brief.title || brief.briefData?.project_title || "Untitled Brief",
            // Ensure briefId is accessible at the top level
            briefId:
              brief.briefId || brief.briefData?.briefId || brief.recordId,
          };
        });

        setSavedBriefs(processedBriefs);

        // We no longer automatically load the most recent brief
        // This allows the questionnaire wizard to be shown by default
      } else if (responseData.success && responseData.briefs === false) {
        // No briefs found
        setSavedBriefs([]);
      } else {
        console.error("Error fetching briefs:", responseData.error);
        setSavedBriefs([]);
      }
    } catch (error) {
      console.error("Error fetching user briefs:", error);
      // Set empty array to prevent UI issues
      setSavedBriefs([]);
    }
  };

  const getBriefById = async (briefId) => {
    if (!auth.isAuthenticated || !auth.user) {
      return null;
    }

    try {
      const userToken = auth.user.accessToken;

      if (!userToken) {
        console.error("No authentication token available");
        return null;
      }

      // PLACEHOLDER: API endpoint not yet created
      // When API is ready, replace this with actual API call

      // Use the currently loaded brief as a fallback if IDs match
      if (brief && brief.briefId === briefId) {
        return brief;
      }

      // Return null since API doesn't exist yet
      return null;
    } catch (error) {
      console.error(`Error fetching brief ${briefId}:`, error);
      return null;
    }
  };

  const fetchRemainingBriefs = async () => {
    try {
      // Don't attempt to fetch if we don't have a user ID
      if (!auth.isAuthenticated && !anonymousUser?.id) {
        return;
      }

      // Only send userId as that's all the backend needs
      const userData = {
        userId:
          auth.isAuthenticated && auth.user ? auth.user.sub : anonymousUser?.id,
      };

      const response = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-ramaining-tokens`,
        userData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data || !response.data.body) {
        console.error(
          "Invalid response when fetching remaining briefs:",
          response
        );
        return;
      }

      const data = JSON.parse(response.data.body);

      if (data && typeof data.remainingBriefs !== "undefined") {
        setRemainingBriefs(data.remainingBriefs);
      } else if (data && data.error && data.error.includes("User not found")) {
        // If user not found, try to create the user first before giving up
        if (!auth.isAuthenticated && anonymousUser) {
          // For anonymous users, try to create the user in the backend
          await createAnonymousUserInBackend(anonymousUser);

          // Don't try to fetch tokens again here, createAnonymousUserInBackend will do that
        } else {
          console.error(
            "User not found and unable to create user automatically"
          );
        }
      } else {
        console.error("No remainingBriefs in response:", data);
      }
    } catch (error) {
      console.error("Error fetching remaining briefs:", error);

      // If we get a 404 error, it might mean the user doesn't exist in the backend
      if (
        error.response &&
        (error.response.status === 404 || error.response.status === 400)
      ) {
        if (!auth.isAuthenticated && anonymousUser) {
          // For anonymous users, try to create the user in the backend
          await createAnonymousUserInBackend(anonymousUser);
        }
      }
    }
  };

  return (
    <BriefContext.Provider
      value={{
        brief,
        updateBrief,
        generateNewBrief,
        anonymousUser,
        isInitializing,
        remainingBriefs,
        fetchRemainingBriefs,
        saveBrief,
        deleteBrief,
        savedBriefs,
        fetchUserBriefs,
        getBriefById,
      }}
    >
      {children}
    </BriefContext.Provider>
  );
};

export { BriefProvider, useBrief };
