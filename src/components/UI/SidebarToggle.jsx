import { ChevronRight, ChevronLeft } from "lucide-react";

export default function SidebarToggle({ isOpen, toggleSidebar }) {
  return (
    <button
      onClick={toggleSidebar}
      className={`md:!hidden absolute top-6 z-10 h-fit flex justify-center items-center
          ${isOpen ? "right-4" : "left-[13px]"}`}
    >
      {isOpen ? (
        <ChevronLeft
          size={18}
          strokeWidth={2.5}
          className="text-gray-600"
        />
      ) : (
        <ChevronRight
          size={18}
          strokeWidth={2.5}
          className="text-gray-600"
        />
      )}
    </button>
  );
}