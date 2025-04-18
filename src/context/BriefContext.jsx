import { createContext, useContext, useState, useEffect } from 'react';

const BRIEF_STORAGE_KEY = 'brifify_brief';

const BriefContext = createContext();

export function BriefProvider({ children }) {
  const [brief, setBrief] = useState(null);

  // Load brief from localStorage on mount
  useEffect(() => {
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
  }, []);

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
  };

  return (
    <BriefContext.Provider value={{ brief, updateBrief, generateNewBrief }}>
      {children}
    </BriefContext.Provider>
  );
}

export function useBrief() {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error('useBrief must be used within a BriefProvider');
  }
  return context;
}