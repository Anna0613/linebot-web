
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password, rememberMe });
    // Handle login logic
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 fade-in-element">
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="mt-2 text-muted-foreground">Log in to your LINE Bot Creator account</p>
          </div>
          
          <div className="glassmorphism p-8 fade-in-element" style={{ animationDelay: '0.2s' }}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="#"
                    className="text-sm text-primary hover:text-primary/80 hover-underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => 
                      setRememberMe(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-normal"
                  >
                    Remember me
                  </Label>
                </div>
              </div>
              
              <Button type="submit" className="w-full rounded-full bg-line hover:bg-line-dark h-11">
                Sign in
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/register" className="text-primary hover:text-primary/80 font-medium hover-underline">
                Sign up
              </Link>
            </div>
          </div>
          
          <div className="mt-10 text-center text-sm text-muted-foreground fade-in-element" style={{ animationDelay: '0.3s' }}>
            By signing in, you agree to our{' '}
            <Link to="#" className="underline hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="#" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Login;
