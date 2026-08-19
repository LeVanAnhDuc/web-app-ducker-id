// types
import type { ReactNode } from "react";
// components
import AnimatedBackground from "./mains/AnimatedBackground";
import Header from "@/components/Header";
import AuthFooter from "./mains/AuthFooter";

const PublicLayout = ({ children }: { children: ReactNode }) => (
  <>
    <AnimatedBackground />
    <Header />
    <main
      id="main-content"
      tabIndex={-1}
      className="auth-background flex min-h-screen flex-col items-center justify-center p-4 pt-20"
    >
      {children}
      <AuthFooter />
    </main>
  </>
);

export default PublicLayout;
