import { Mail, MessageSquare } from "lucide-react";

export default function ContactMenu() {
  return (
    <div className="p-6 pb-4 w-full">
      <div className="flex items-center gap-1 py-1">
        <div className="p-2 flex-shrink-0">
          <Mail size={14} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <a
            href="mailto:irakligeek@gmail.com"
            className="text-sm !text-gray-600 truncate block"
          >
            Help
          </a>
          
        </div>
      </div>
      <div className="flex items-center gap-1 py-1">
        <div className="p-2 flex-shrink-0">
          <MessageSquare size={14} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <a
            href="https://x.com/irakligeek"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm !text-gray-600 truncate block"
          >
            Suggest a feature
          </a>
          
        </div>
      </div>
    </div>
  );
}