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
    <div className="app-page-surface flex min-h-screen flex-col text-slate-950">
      <Navbar />

      <PageContentWrapper>
        <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pb-10 pt-28 sm:px-6 md:pt-32">
          <div className="w-full max-w-md">
            <div className="app-panel p-8 sm:p-10">
              <div className="pb-6 text-center">
                <p className="app-kicker mb-2">帳號</p>
                <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
                {description && (
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
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
