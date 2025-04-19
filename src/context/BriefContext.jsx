import { createContext, useContext, useState, useEffect } from 'react';
import { ClientJS } from 'clientjs';
import axios from 'axios';

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

  useEffect(() => {
    initializeAnonymousUser();
    loadBrief();
  }, []);

  useEffect(() => {
    if (anonymousUser?.id) {
      fetchRemainingBriefs();
    }
  }, [anonymousUser?.id]);

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
    const components = [
      client.getFingerprint(),
      client.getOS(),
      client.getOSVersion(),
      client.getBrowser(),
      client.getBrowserVersion(),
      client.getEngine(),
      client.getDevice(),
      client.getCPU(),
      client.getTimeZone(),
      client.getLanguage(),
      `${screenInfo.width}x${screenInfo.height}`,
      screenInfo.colorDepth,
      navigator.hardwareConcurrency,
      navigator.deviceMemory,
      navigator.platform,
      navigator.vendor,
      navigator.language,
      navigator.connection?.effectiveType
    ].filter(Boolean);

    return components.join('|');
  };

  const generateCompositeId = (fingerprint, ipAddress) => {
    const fingerprintPart = fingerprint.toString().substring(0, 8);
    const ipPart = ipAddress ? ipAddress.split('.').join('') : 'noip';
    return `${fingerprintPart}_${ipPart}`;
  };

  const initializeAnonymousUser = async () => {
    setIsInitializing(true);
    const savedUser = localStorage.getItem(ANONYMOUS_USER_KEY);

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const client = new ClientJS();
        const currentDeviceSignature = generateDeviceSignature(client);
        const ipAddress = await getIpAddress();
        const screenInfo = getScreenInfo();
        const fingerprint = client.getFingerprint();
        const compositeId = generateCompositeId(fingerprint, ipAddress);

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
        // console.log('Updated existing anonymous user:', updatedUser);
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
    const compositeId = generateCompositeId(fingerprint, ipAddress);

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
    console.log('Created new anonymous user:', user);
    setAnonymousUser(user);
  };

  const loadBrief = () => {
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
  };

  const updateBrief = (newBrief) => {
    setBrief(newBrief);
    if (newBrief) {
      localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(newBrief));
    } else {
      localStorage.removeItem(BRIEF_STORAGE_KEY);
    }
  };

  const generateNewBrief = () => {
    setBrief(null);
    localStorage.removeItem(BRIEF_STORAGE_KEY);
    return true;
  };

  const fetchRemainingBriefs = async () => {
    try {
      const response = await axios.post(
        `https://8dza2tz7cd.execute-api.us-east-1.amazonaws.com/dev/get-ramaining-tokens`,
        {
          userId: anonymousUser.id
        },
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
      fetchRemainingBriefs
    }}>
      {children}
    </BriefContext.Provider>
  );
};

export { BriefProvider, useBrief };