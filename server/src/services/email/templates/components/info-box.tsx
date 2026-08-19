// libs
import { Section, Text } from "@react-email/components";
// types
import type { ReactNode } from "react";

type InfoBoxVariant = "warning" | "danger" | "info";

const variantStyles: Record<
  InfoBoxVariant,
  { bg: string; border: string; text: string }
> = {
  warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404" },
  danger: { bg: "#f8d7da", border: "#dc3545", text: "#721c24" },
  info: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" }
};

export const InfoBox = ({
  variant,
  children
}: {
  variant: InfoBoxVariant;
  children: ReactNode;
}) => {
  const colors = variantStyles[variant];

  return (
    <Section
      style={{
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        padding: "15px",
        margin: "20px 0",
        borderRadius: "4px"
      }}
    >
      <Text style={{ margin: "5px 0", fontSize: "14px", color: colors.text }}>
        {children}
      </Text>
    </Section>
  );
};
