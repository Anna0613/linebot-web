
import { Link } from 'react-router-dom';
import LanguageToggle from './LanguageToggle';

const Footer = () => {
  return (
    <footer id="contact" className="bg-[#C4D4C9] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-line bg-clip-text text-transparent">LINE Bot Creator</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Create powerful LINE Bots without coding. Perfect for businesses in Taiwan and beyond.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <LanguageToggle />
            </div>
          </div>
          
          
          <div>
            <h3 className="font-medium text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="#features" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="#demo" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Demo
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="font-medium text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Security
                </Link>
              </li>
            </ul>
          </div>
          
          
          <div>
            <h3 className="font-medium text-lg mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="text-muted-foreground text-sm">
                  Taoyuan, Taiwan
              </li>
              <li>
                <a href="info@mail.mcu.edu.tw" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  info@mail.mcu.edu.tw
                </a>
              </li>
              <li>
                <a href="tel:03-350-7001" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  03-350-7001
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-muted-foreground mb-4 md:mb-0">
          © {new Date().getFullYear()} 銘傳大學 Ming Chuan University
        </p>
        <div className="flex space-x-4 items-center">
          <a
            href="https://www.facebook.com/MCU1957"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#454658] hover:text-[#1a1a40] transition-colors"
            aria-label="Facebook"
          >
            <svg className="h-5 w-5" viewBox="0 0 448 512" fill="currentColor">
              <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64h98.2V334.2H109.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H255V480H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/>
            </svg>
          </a>

          <a
            href="https://www.instagram.com/mcu1957/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#454658] hover:text-[#1a1a40] transition-colors"
            aria-label="Instagram"
          >
            <svg className="h-5 w-5" viewBox="0 0 448 512" fill="currentColor">
              <path d="M224.1 141c-63.6 0-115.1 51.5-115.1 115.1S160.5 371.2 224.1 371.2 339.2 319.7 339.2 256 287.7 141 224.1 141zm0 189.6c-41.2 0-74.5-33.3-74.5-74.5s33.3-74.5 74.5-74.5 74.5 33.3 74.5 74.5-33.3 74.5-74.5 74.5zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.3-9.9-66.7-36.2-93s-57.6-34.5-93-36.2c-36.6-2.1-146.6-2.1-183.1 0-35.3 1.7-66.7 9.9-93 36.2S1.6 118.4 0 153.7c-2.1 36.6-2.1 146.6 0 183.1 1.7 35.3 9.9 66.7 36.2 93s57.6 34.5 93 36.2c36.6 2.1 146.6 2.1 183.1 0 35.3-1.7 66.7-9.9 93-36.2s34.5-57.6 36.2-93c2.1-36.6 2.1-146.6 0-183.1zM398.8 388c-7.8 19.7-22.9 34.8-42.6 42.6-29.5 11.7-99.4 9-132.1 9s-102.7 2.6-132.1-9c-19.7-7.8-34.8-22.9-42.6-42.6-11.7-29.5-9-99.4-9-132.1s-2.6-102.7 9-132.1c7.8-19.7 22.9-34.8 42.6-42.6 29.5-11.7 99.4-9 132.1-9s102.7-2.6 132.1 9c19.7 7.8 34.8 22.9 42.6 42.6 11.7 29.5 9 99.4 9 132.1s2.6 102.7-9 132.1z"/>
            </svg>
          </a>

          <a
            href="https://www.youtube.com/mcu1957"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#454658] hover:text-[#1a1a40] transition-colors"
            aria-label="YouTube"
          >
            <svg className="h-5 w-5" viewBox="0 0 576 512" fill="currentColor">
              <path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zM232.2 337.6V174.4l142.8 81.6-142.8 81.6z"/>
            </svg>
          </a>
        </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
