import "./App.css";
import NavbarMain from "./components/layout/NavbarMain";
import Footer from "./components/layout/Footer";
import WizardForm from "./components/WizardForm";
import { Toaster } from "@/components/ui/sonner";
import { BriefProvider } from "./context/BriefContext";

function App() {
  return (
    <BriefProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-md">
          <div className="max-w-screen-lg mx-auto px-4 py-4 flex justify-between items-center">
            <div className="text-xl font-bold text-gray-800">
              <a
                href="/"
                className="!text-gray-900 hover:!text-gray-800 !font-bold tracking-wide"
              >
                Brifify
              </a>
            </div>
            <NavbarMain />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="text-center">
              <WizardForm />
            </div>
          </div>
        </main>

        <Footer />
        <Toaster />
      </div>
    </BriefProvider>
  );
}

export default App;
