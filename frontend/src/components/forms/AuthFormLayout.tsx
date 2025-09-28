import { ReactNode } from "react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthFormLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

const AuthFormLayout = ({
  title,
  description,
  children,
}: AuthFormLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-8 pt-28 sm:pt-24 md:pt-28 pb-8">
        <div className="w-full max-w-md">
          <div className="web3-glass-card p-8 web3-hover-glow">
            <div className="text-center pb-6">
              <h1 className="text-2xl font-bold neon-text-gradient mb-2">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground mt-2">
                  {description}
                </p>
              )}
            </div>
            <div className="space-y-4">{children}</div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AuthFormLayout;
