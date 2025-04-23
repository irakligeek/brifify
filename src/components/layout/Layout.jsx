import Sidebar from './Sidebar';
import NavbarMain from './NavbarMain';
import { useState } from 'react';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar WILL BE GONE IN THE APP - ONLY IN LANDING PAGE*/}
      <div className="sticky top-0 !z-50 bg-white border-b px-4 py-4">
        <NavbarMain />
      </div>

      {/* Grid layout for sidebar and main content */}
      <div className="grid md:grid-cols-[256px_1fr] relative">
        <div className="shrink-0">
          <Sidebar onOpenChange={setIsSidebarOpen} />
        </div>
        <main className={`
          min-w-0 p-6 md:mt-24 mt-16
          ${!isSidebarOpen ? 'pl-[60px] md:pl-6' : 'pl-6'}
        `}>
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}