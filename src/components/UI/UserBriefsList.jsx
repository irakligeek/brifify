import { useState, useEffect } from "react";
import { useBrief } from "@/context/BriefContext";
import { Loader2, FileText, Check } from "lucide-react";
import { useAuth } from "@/context/auth/AuthContext";

export default function UserBriefsList() {
  const { savedBriefs, fetchUserBriefs, brief, updateBrief, getBriefById, isInitializing } = useBrief();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingBriefId, setLoadingBriefId] = useState(null);
  const [hasTriedFetching, setHasTriedFetching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadBriefs = async () => {
      if (!isMounted) return;
      
      // If user is not authenticated, don't attempt to load briefs
      if (!isAuthenticated) {
        setIsLoading(false);
        setHasTriedFetching(true);
        return;
      }
      
      setIsLoading(true);
      
      try {
        await fetchUserBriefs();
      } catch (error) {
        console.error("Error loading briefs:", error);
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          setHasTriedFetching(true);
          setIsLoading(false);
        }
      }
    };

    // Only load briefs if context is not initializing
    if (!isInitializing) {
      loadBriefs();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isInitializing, isAuthenticated]); // Re-run when isInitializing or isAuthenticated changes

  const handleBriefClick = async (briefId) => {
    // Only authenticated users can select briefs from the list
    if (!isAuthenticated) {
      console.log("Cannot select brief - user is not authenticated");
      return;
    }
    
    // If the brief is already selected, do nothing
    if (brief && brief.briefId === briefId) {
      console.log("Brief already selected");
      return;
    }

    try {
      // Set loading state for this specific brief
      setLoadingBriefId(briefId);
      
      // Check if the brief is in the savedBriefs array first
      const selectedBrief = savedBriefs.find(b => (b.briefId || b.recordId) === briefId);
      
      if (selectedBrief) {
        // If we already have the brief data, use it directly
        updateBrief(selectedBrief);
      } else {
        // Otherwise fetch it from the backend
        const loadedBrief = await getBriefById(briefId);
        
        if (loadedBrief) {
          updateBrief(loadedBrief);
        } else {
          console.error("Failed to load brief with ID:", briefId);
        }
      }
    } catch (error) {
      console.error("Error selecting brief:", error);
    } finally {
      setLoadingBriefId(null);
    }
  };

  // If user is not authenticated, don't show any briefs
  if (!isAuthenticated) {
    return null;
  }

  // ALWAYS show loading state if:
  // 1. Context is still initializing, OR
  // 2. We're actively loading, OR
  // 3. We haven't tried fetching yet
  if (isInitializing || isLoading || !hasTriedFetching) {
    return (
      <div className="flex items-center justify-start py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  // Only show "No briefs found" after we've confirmed:
  // 1. Context is initialized
  // 2. We're not actively loading
  // 3. We've tried fetching at least once
  // 4. The savedBriefs array is empty
  if (!savedBriefs || savedBriefs.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2 text-left">
        No briefs found.
      </div>
    );
  }

  // Sort briefs by createdAt field (most recent first)
  const sortedBriefs = [...savedBriefs].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || a.timestamp || 0);
    const dateB = new Date(b.createdAt || b.updatedAt || b.timestamp || 0);
    return dateB - dateA; // Descending order (newest first)
  });

  return (
    <>
      <div className="overflow-auto max-h-64 pr-1 custom-scrollbar">
        <ul className="space-y-2">
          {sortedBriefs.map((item) => {
            const briefId = item.briefId || item.recordId;
            const isSelected = brief && (brief.briefId === briefId || brief.recordId === briefId);
            const isLoading = loadingBriefId === briefId;
            
            return (
              <li
                key={briefId || Math.random().toString()}
                className={`flex items-center gap-2 cursor-pointer transition-colors py-1 px-1 rounded-md ${
                  isSelected ? "bg-blue-50 text-blue-600" : "hover:text-gray-600 active:text-gray-800"
                }`}
                onClick={() => handleBriefClick(briefId)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : isSelected ? (
                  <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4  flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {item.title ||
                    item.projectName ||
                    item.project_title ||
                    "Untitled Brief"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
