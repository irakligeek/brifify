import { createContext, useContext, useState, useEffect } from 'react';
import { ClientJS } from 'clientjs';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';

const BRIEF_STORAGE_KEY = 'brifify_brief';
const ANONYMOUS_USER_KEY = 'brifify_anonymous_user';

const BriefContext = createContext();

const useBrief = () => {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error('useBrief must be used within a BriefProvider');
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

  const getIpAddress = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      return response.data.ip;
    } catch (error) {
      console.error('Error fetching IP:', error);
      return null;
    }
  };

  const getScreenInfo = () => ({
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    orientation: window.screen.orientation?.type || 'unknown'
  });

  const generateDeviceSignature = (client) => {
    const screenInfo = getScreenInfo();
    // Focus on device-specific characteristics that are more likely to be consistent across browsers
    const components = [
      client.getOS(),
      client.getOSVersion(),
      client.getDevice(),
      client.getCPU(),
      client.getTimeZone(),
      `${screenInfo.width}x${screenInfo.height}`,
      screenInfo.colorDepth,
      navigator.hardwareConcurrency,
      navigator.platform
    ].filter(Boolean);

    return components.join('|');
  };

  const generateCompositeId = (fingerprint) => {
    // Create a more stable ID using device characteristics
    const client = new ClientJS();
    const os = client.getOS() || 'unknown';
    const cores = navigator.hardwareConcurrency || '0';
    const timezone = client.getTimeZone() || 'UTC';
    const devicePart = `${os}_${cores}_${timezone}`.replace(/\s+/g, '');
    return `${devicePart}_${fingerprint}`;
  };

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
        const client = new ClientJS();
        const currentDeviceSignature = generateDeviceSignature(client);
        const ipAddress = await getIpAddress();
        const screenInfo = getScreenInfo();
        const fingerprint = client.getFingerprint();
        const compositeId = generateCompositeId(fingerprint);

        const updatedUser = {
          id: compositeId,
          fingerprint: fingerprint,
          deviceSignature: currentDeviceSignature,
          ipAddress,
          lastSeen: new Date().toISOString(),
          // Device information
          browser: client.getBrowser(),
          browserVersion: client.getBrowserVersion(),
          os: client.getOS(),
          osVersion: client.getOSVersion(),
          device: client.getDevice(),
          engine: client.getEngine(),
          cpu: client.getCPU(),
          screen: screenInfo,
          timezone: client.getTimeZone(),
          language: client.getLanguage(),
          platform: navigator.platform,
          vendor: navigator.vendor,
          cores: navigator.hardwareConcurrency,
          memory: navigator.deviceMemory,
          connectionType: navigator.connection?.effectiveType
        };

        localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(updatedUser));
        
        setAnonymousUser(updatedUser);
      } catch (error) {
        console.error('Error parsing saved anonymous user:', error);
        createNewAnonymousUser();
      }
    } else {
      await createNewAnonymousUser();
    }
    setIsInitializing(false);
  };

  const createNewAnonymousUser = async () => {
    const client = new ClientJS();
    const deviceSignature = generateDeviceSignature(client);
    const ipAddress = await getIpAddress();
    const screenInfo = getScreenInfo();
    const fingerprint = client.getFingerprint();
    const compositeId = generateCompositeId(fingerprint);

    const user = {
      id: compositeId,
      fingerprint: fingerprint,
      deviceSignature,
      ipAddress,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      // Device information
      browser: client.getBrowser(),
      browserVersion: client.getBrowserVersion(),
      os: client.getOS(),
      osVersion: client.getOSVersion(),
      device: client.getDevice(),
      engine: client.getEngine(),
      cpu: client.getCPU(),
      screen: screenInfo,
      timezone: client.getTimeZone(),
      language: client.getLanguage(),
      platform: navigator.platform,
      vendor: navigator.vendor,
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      connectionType: navigator.connection?.effectiveType
    };

    localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user));
    setAnonymousUser(user);
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
          console.error('Error parsing saved brief:', error);
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
            "Content-Type": "application/json"
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
            "Content-Type": "application/json"
          },
          data: {
            userId: auth.user.sub,
            briefId
          }
        }
      );
      
      const responseData = response.data.body ? JSON.parse(response.data.body) : response.data;
      
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
        return { success: false, error: responseData.error || "Failed to delete brief" };
      }
    } catch (error) {
      console.error("Error deleting brief:", error);
      return { success: false, error: error.message || "Failed to delete brief" };
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
      const responseData = typeof response.data === 'string' 
        ? JSON.parse(response.data.body || response.data) 
        : response.data;
      
      if (responseData.success && responseData.briefs) {
        // Make sure we have an array of briefs
        const briefsArray = Array.isArray(responseData.briefs) ? responseData.briefs : [];
        
        // Process each brief to ensure it has the right structure
        const processedBriefs = briefsArray.map(brief => {
          // Make sure the brief has the necessary properties for display
          return {
            ...brief,
            // Use title from top level or from briefData.project_title
            title: brief.title || (brief.briefData?.project_title) || "Untitled Brief",
            // Ensure briefId is accessible at the top level
            briefId: brief.briefId || brief.briefData?.briefId || brief.recordId
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
      console.log("NOTE: get-brief API not implemented yet - using placeholder data");
      
      // Use the currently loaded brief as a fallback if IDs match
      if (brief && brief.briefId === briefId) {
        return brief;
      }
      
      // Return null since API doesn't exist yet
      return null;
      
      /* Uncomment when API is implemented
      const response = await axios.post(
        "https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-brief",
        {
          userId: auth.user.sub,
          briefId
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const responseData = JSON.parse(response.data.body);
      
      if (responseData.brief) {
        return responseData.brief;
      } else {
        console.error("Error fetching brief:", responseData.error);
        return null;
      }
      */
    } catch (error) {
      console.error(`Error fetching brief ${briefId}:`, error);
      return null;
    }
  };

  const fetchRemainingBriefs = async () => {
    try {
      // Determine which user data to send based on authentication status
      const userData = auth.isAuthenticated && auth.user 
        ? { 
            userId: auth.user.sub,
            sub: auth.user.sub,
            email: auth.user.email,
            // cognito_groups: user['cognito:groups'],
            // email_verified: user.email_verified
          }
        : { userId: anonymousUser?.id };
      
      const response = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-ramaining-tokens`,
        userData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = JSON.parse(response.data.body);
      setRemainingBriefs(data.remainingBriefs);
    } catch (error) {
      console.error('Error fetching remaining briefs:', error);
    }
  };

  return (
    <BriefContext.Provider value={{
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
      getBriefById
    }}>
      {children}
    </BriefContext.Provider>
  );
};

export { BriefProvider, useBrief };