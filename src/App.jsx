import "./App.css";
import WizardForm from "./components/WizardForm";
import Layout from "./components/layout/Layout";
import { BriefProvider } from "./context/BriefContext";
import { Toaster } from "./components/UI/sonner";

function App() {
  return (
    <BriefProvider>
      <Layout>
        <WizardForm />
      </Layout>
      <Toaster />
    </BriefProvider>
  );
}

export default App;
