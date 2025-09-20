import { createRoot } from "react-dom/client";
import App from "./home.tsx";
import "./home.css";

// Ensure language attribute is set for accessibility tools
try {
  if (!document.documentElement.getAttribute("lang")) {
    document.documentElement.setAttribute("lang", "zh-TW");
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
