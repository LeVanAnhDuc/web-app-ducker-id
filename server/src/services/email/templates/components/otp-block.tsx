// libs
import { Section, Text } from "@react-email/components";

export const OtpBlock = ({
  otp,
  color = "#667eea"
}: {
  otp: string;
  color?: string;
}) => (
  <Section style={containerStyle}>
    <Text style={{ ...codeStyle, color, borderColor: color }}>{otp}</Text>
  </Section>
);

const containerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "30px 0"
};

const codeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "36px",
  fontWeight: "bold",
  letterSpacing: "8px",
  padding: "20px 40px",
  backgroundColor: "#f8f9fa",
  border: "2px dashed",
  borderRadius: "8px"
};
