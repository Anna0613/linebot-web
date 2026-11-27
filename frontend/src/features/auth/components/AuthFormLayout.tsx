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
          <div className="studio-auth">
            <div className="studio-auth-art" aria-hidden="true" />
            <div className="studio-auth-form">
              <div className="pb-6">
                <h1 className="text-3xl font-medium tracking-[-0.03em] text-[var(--bc-ink)]">{title}</h1>
                {description && (
                  <p className="mt-3 text-base leading-relaxed text-[var(--bc-ink-2)]">
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
