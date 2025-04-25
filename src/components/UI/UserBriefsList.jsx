import { useState, useEffect } from "react";
import { useBrief } from "@/context/BriefContext";
import { Loader2, FileText } from "lucide-react";

export default function UserBriefsList() {
  const { savedBriefs, fetchUserBriefs } = useBrief();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBriefs = async () => {
      setIsLoading(true);
      await fetchUserBriefs();
      setIsLoading(false);
    };

    loadBriefs();
  }, []);

  const handleBriefClick = (briefId) => {
    // Just log the brief ID for now
    console.log(`Clicked brief: ${briefId}`);
    // Actual loading functionality will be implemented later
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Loading your briefs...</span>
      </div>
    );
  }

  if (!savedBriefs || savedBriefs.length === 0) {
    return (
      <>
        <h3 className="text-sm font-medium text-gray-400 text-left flex gap-2">
          My Briefs
        </h3>
        <div className="text-sm text-gray-500 py-2 text-left">
          No briefs found.
        </div>
      </>
    );
  }

  // Sort briefs by createdAt field (most recent first)
  const sortedBriefs = [...savedBriefs].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.timestamp || 0);
    const dateB = new Date(b.createdAt || b.timestamp || 0);
    return dateB - dateA; // Descending order (newest first)
  });

  return (
    <>
      <h3 className="text-sm font-medium text-gray-400 text-left flex gap-2">
        My Briefs
      </h3>
      <div className="overflow-auto max-h-64 pr-1 custom-scrollbar">
        <ul className="space-y-2">
          {sortedBriefs.map((brief) => (
            <li
              key={brief.briefId || brief.recordId}
              className="flex items-center gap-2 cursor-pointer transition-colors py-1 hover:text-gray-600 active:text-gray-800"
              onClick={() => handleBriefClick(brief.briefId || brief.recordId)}
            >
              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {brief.title ||
                  brief.projectName ||
                  brief.project_title ||
                  "Untitled Brief"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
