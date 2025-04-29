import { useState, useEffect } from "react";
import Logo from "../UI/Logo";
import BriefMetadata from "../UI/BriefMetadata";
import UserMenu from "../UI/UserMenu";
import ContactMenu from "../UI/ContactMenu";
import SidebarToggle from "../UI/SidebarToggle";

export default function Sidebar({ onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);

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
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const toggleSidebar = () => setIsOpen(!isOpen);

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
        <div
          className={`px-8 py-3 mt-8 ${!isOpen ? "hidden md:flex" : "flex"}`}
        >
          <Logo />
        </div>

        {/* Toggle button */}
        <SidebarToggle isOpen={isOpen} toggleSidebar={toggleSidebar} />

        {/* Content container */}
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

        {/* Contact info */}
        <div
          className={`
            ${!isOpen ? "!opacity-0 md:!opacity-100" : "!opacity-100"}
            transition-opacity duration-200
          `}
        >
          <ContactMenu />
        </div>

        {/* User account section */}
        <div
          className={`
            ${!isOpen ? "!opacity-0 md:!opacity-100" : "!opacity-100"}
            transition-opacity duration-200
          `}
        >
          <UserMenu />
        </div>
      </aside>

      {/* Overlay for mobile - only when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm !z-30 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
}
