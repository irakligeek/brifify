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
          <div className="max-w-screen-xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <NavbarMain />
            </div>
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
