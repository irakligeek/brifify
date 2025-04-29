import { useState } from "react";
import { 
  UserCircle, 
  LogOut, 
  LogIn, 
  ChevronDown,
  Settings,
  Moon,
  Sun,
  Bell 
} from "lucide-react";
import { useAuth } from "../../context/auth/AuthContext";

export default function UserMenu() {
  const [showUserPanel, setShowUserPanel] = useState(false);
  const { user, isAuthenticated, logout, login } = useAuth();
  
  // Sample state for theme - in a real app, this would be managed in a theme context
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle the user panel visibility
  const toggleUserPanel = () => {
    setShowUserPanel(!showUserPanel);
  };

  // Toggle theme between light and dark
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Your theme switching logic would go here
  };

  return (
    <div className="mt-auto border-t p-4 mb-2 w-full relative">
      {isAuthenticated && user ? (
        <>
          <div 
            className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded-md px-1"
            onClick={toggleUserPanel}
          >
            <div className="p-2 flex-shrink-0">
              <UserCircle size={16} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0 text-left flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 truncate">
                My Account
              </p>
              <ChevronDown size={14} className="text-gray-600 ml-1" />
            </div>
          </div>
          
          {/* Enhanced user panel that appears when user info is clicked */}
          {showUserPanel && (
            <div className="absolute bottom-full left-4 right-4 mb-1">
              <div className="bg-white border border-gray-200 shadow-md">
                {/* User info header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <UserCircle size={24} className="text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.email}</p>
                      <p className="text-xs text-gray-500">Account</p>
                    </div>
                  </div>
                </div>
                
                {/* Menu options */}
                {/* <div className="py-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <Settings size={14} className="text-gray-500" />
                    <span>Settings</span>
                  </button>
                
                  
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <Bell size={14} className="text-gray-500" />
                    <span>Notifications</span>
                  </button>
                </div> */}
                
                {/* Logout option */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut size={14} className="text-gray-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
    </div>
  );
}