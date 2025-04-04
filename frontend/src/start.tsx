import { createRoot } from 'react-dom/client'
import App from './home.tsx'
import './pages/LoginHome.tsx'
import './home.css'

createRoot(document.getElementById("root")!).render(<App />);
