import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, User, Mail, LogOut, LogIn } from "lucide-react";
import BriefMetadata from "../UI/BriefMetadata";
import Logo from "../UI/Logo";
import { useAuth } from "../../context/auth/AuthContext";

export default function Sidebar({ onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout, login } = useAuth();
  
  // Check if screen is md or larger and set isOpen accordingly
  useEffect(() => {
    const checkScreenSize = () => {
      // 768px is the default md breakpoint in Tailwind
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else if (!isOpen) {
        setIsOpen(false);
      }
    };
    
    // Initial check
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed md:static left-0 !z-40 bg-white border-r h-screen
          transition-all duration-200 ease-in-out
          md:!w-64 overflow-hidden flex flex-col
          ${isOpen ? "w-64" : "w-[50px]"}
        `}
      >
        {/* Logo at the top */}
        <div className={`px-8 py-3 mt-8 ${!isOpen ? 'hidden md:flex' : 'flex'}`}>
          <Logo />
        </div>

        {/* Toggle button container with proper spacing */}
        <div className="h-14 relative md:hidden">
          <div
            className={`
            absolute top-4 w-6 h-6
            ${isOpen ? "right-4" : "left-1/2 -translate-x-1/2"}
          `}
          >
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="!z-[100] p-1"
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

        {/* Content container - reduced height to make room for account menu */}
        <div
          className={`
          md:h-[calc(100%-12rem)] flex-grow md:overflow-y-auto
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

        {/* Account menu at the bottom with margin-bottom to push it up from bottom edge */}
        <div 
          className={`
            mt-auto border-t p-4 mb-4 w-full
            ${!isOpen ? "!opacity-0 md:!opacity-100" : "!opacity-100"}
            transition-opacity duration-200
          `}
        >
          {/* Only show user account info when authenticated */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 py-1">
              <div className="p-2 flex-shrink-0">
                <User size={14} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          ) : null}

          {/* Add logout link when authenticated */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 py-1">
              <div className="p-2 flex-shrink-0">
                <LogOut size={14} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <button 
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 truncate block cursor-pointer
                  font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            // Show login button when not authenticated
            <div className="flex items-center gap-2 py-1">
              <div className="p-2 flex-shrink-0">
                <LogIn size={14} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <button 
                  onClick={login}
                  className="text-sm text-gray-600 hover:text-gray-900 truncate block cursor-pointer
                  font-medium"
                >
                  Login
                </button>
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="flex items-center gap-2 py-1">
            <div className=" p-2 flex-shrink-0">
              <Mail size={14} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <a 
                href="mailto:irakligeek@gmail.com" 
                className="text-sm !text-gray-600 truncate block "
              >
                Contact
              </a>
            </div>
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
