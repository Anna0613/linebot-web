import { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";
// Removed unused Card components

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
    <div className="app-page-surface flex flex-col">
      <Navbar />

      <PageContentWrapper>
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pb-10 pt-28 sm:px-6">
          <div className="w-full max-w-md">
            <div className="app-panel-strong p-6 sm:p-8">
              <div className="text-center pb-6">
                <p className="app-kicker mb-2">Account</p>
                <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
                {description && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                )}
              </div>
              <div className="space-y-4">{children}</div>
            </div>
          </div>
        </main>
      </PageContentWrapper>

      <Footer />
    </div>
  );
};

export default AuthFormLayout;
