
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, agreeTerms: checked }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    // Handle registration logic
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 fade-in-element">
            <h2 className="text-3xl font-bold">Create an Account</h2>
            <p className="mt-2 text-muted-foreground">Start creating your LINE Bot today</p>
          </div>
          
          <div className="glassmorphism p-8 fade-in-element" style={{ animationDelay: '0.2s' }}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="rounded-lg h-11"
                />
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agree-terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={handleCheckboxChange}
                  required
                />
                <Label
                  htmlFor="agree-terms"
                  className="text-sm font-normal leading-tight"
                >
                  I agree to the{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="#" className="text-primary hover:text-primary/80 hover-underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              
              <Button type="submit" className="w-full rounded-full bg-line hover:bg-line-dark h-11">
                Create Account
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium hover-underline">
                Sign in
              </Link>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center fade-in-element" style={{ animationDelay: '0.3s' }}>
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-line flex items-center justify-center text-white mr-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm">
              <span className="font-medium">Secure and encrypted </span>
              <span className="text-muted-foreground">signup process</span>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Register;
