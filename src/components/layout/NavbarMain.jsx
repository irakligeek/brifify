import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useBrief } from "@/context/BriefContext";

export default function NavbarMain() {
  const { brief, generateNewBrief } = useBrief();

  return (
    <nav>
      <ul className="flex items-center space-x-6">
        <li>
          <Button
            onClick={generateNewBrief}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm px-4 py-2 transition-colors duration-200"
          >
            Create Brief
            <ArrowRight className="h-4 w-4" />
          </Button>
        </li>
        <li>
          <a href="#" className="!text-gray-600 hover:!text-gray-900">
            Login
          </a>
        </li>
        <li>
          <a href="#" className="!text-gray-600 hover:!text-gray-900">
            About
          </a>
        </li>
      </ul>
    </nav>
  );
}
