import { createRoot } from "react-dom/client";
import "./utils/setupLogging";
import App from "./home.tsx";
import "./home.css";

// Ensure language attribute is set for accessibility tools
try {
  if (!document.documentElement.getAttribute("lang")) {
    document.documentElement.setAttribute("lang", "zh-TW");
  }
} catch (_err) {
  // ignore if document not ready
  console.debug('lang attribute setup skipped');
}

createRoot(document.getElementById("root")!).render(<App />);
