import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import BriefMetadata from "../UI/BriefMetadata";

export default function Sidebar({ onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed md:static left-0 top-[73px] !z-40 bg-white border-r
          h-[calc(100vh-73px)] transition-all duration-200 ease-in-out
          md:!w-64 overflow-hidden
          ${isOpen ? "w-64" : "w-[50px]"}
        `}
      >
        {/* Toggle button container with proper spacing */}
        <div className="h-14 relative">
          <div
            className={`
            absolute top-4 w-6 h-6
            ${isOpen ? "right-4" : "left-1/2 -translate-x-1/2"}
          `}
          >
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="!z-[100] p-1 md:hidden"
              aria-label="Toggle sidebar"
            >
              <div className="flex">
                {isOpen ? (
                  <>
                    <ChevronLeft
                      size={18}
                      strokeWidth={2.5}
                      className="text-gray-600 -mr-3"
                    />
                  </>
                ) : (
                  <>
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className="text-gray-600 -mr-3"
                    />
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content container */}
        <div
          className={`
          h-[calc(100%-3.5rem)] md:overflow-y-auto
          ${
            isOpen
              ? "opacity-100 w-64"
              : "opacity-0 w-0 md:!opacity-100 md:!w-64"
          }
          transition-all duration-200
        `}
        >
          <div className="p-4">
            <BriefMetadata />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile - only when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm !z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
