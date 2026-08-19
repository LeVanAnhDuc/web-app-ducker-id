// types
import type { ReactNode } from "react";
// components
import EmailBadge from "./components/EmailBadge";
import { FadeSlideUp, FadeIn } from "@/components/Animated";
// others
import { cn } from "@/libs/utils";

const MAX_WIDTH_CLASSES: Record<"md" | "2xl", string> = {
  md: "max-w-md",
  "2xl": "max-w-2xl"
};

const AuthStepLayout = ({
  title,
  description,
  email,
  maxWidth = "md",
  children,
  ghostComponents
}: {
  title?: string;
  description?: string;
  email?: string;
  maxWidth?: "md" | "2xl";
  children: ReactNode;
  ghostComponents?: ReactNode;
}) => (
  <main className="auth-background flex items-center justify-center">
    <FadeSlideUp className={cn("w-full", MAX_WIDTH_CLASSES[maxWidth])}>
      <div className="auth-card relative space-y-5 p-8 md:p-10">
        {(title || description) && (
          <FadeIn delay={0.2} y={10}>
            {title && <h1 className="text-foreground text-center">{title}</h1>}
            {description && (
              <p className="text-muted-foreground text-center">{description}</p>
            )}
          </FadeIn>
        )}
        {email && <EmailBadge email={email} />}
        {children}
      </div>
    </FadeSlideUp>
    {ghostComponents}
  </main>
);

export default AuthStepLayout;
