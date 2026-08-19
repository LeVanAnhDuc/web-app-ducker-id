// libs
import { Button } from "@react-email/components";

export const CtaButton = ({
  href,
  label,
  gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
}: {
  href: string;
  label: string;
  gradient?: string;
}) => (
  <Button href={href} style={{ ...buttonStyle, background: gradient }}>
    {label}
  </Button>
);

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "16px 48px",
  color: "white",
  textDecoration: "none",
  borderRadius: "8px",
  fontSize: "18px",
  fontWeight: "600",
  textAlign: "center" as const
};
