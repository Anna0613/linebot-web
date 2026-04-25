import { createRoot } from "react-dom/client";
import "./utils/setupLogging";
import App from "./home.tsx";
import "./home.css";
import {
  applyLanguagePreference,
  getStoredLanguagePreference,
} from "./utils/languagePreference";

// Ensure language attribute is set for accessibility tools
try {
  applyLanguagePreference(getStoredLanguagePreference());
} catch (_err) {
  // ignore if document not ready
  console.debug("lang attribute setup skipped");
}

createRoot(document.getElementById("root")!).render(<App />);
