// libs
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text
} from "@react-email/components";
// types
import type { ReactNode } from "react";

export const EmailLayout = ({
  title,
  headerGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  footerText,
  footerCopyright,
  children
}: {
  title: string;
  headerGradient?: string;
  footerText: string;
  footerCopyright?: string;
  children: ReactNode;
}) => (
  <Html>
    <Head />
    <Body style={bodyStyle}>
      <Container style={containerStyle}>
        <Section style={{ ...headerStyle, background: headerGradient }}>
          <Text style={headerTitleStyle}>{title}</Text>
        </Section>
        <Section style={contentStyle}>{children}</Section>
        <Section style={footerStyle}>
          <Text style={footerTextStyle}>{footerText}</Text>
          {footerCopyright && (
            <Text style={{ ...footerTextStyle, marginTop: "10px" }}>
              {footerCopyright}
            </Text>
          )}
        </Section>
      </Container>
    </Body>
  </Html>
);

const bodyStyle: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  lineHeight: "1.6",
  color: "#333",
  margin: "0",
  padding: "0",
  backgroundColor: "#f4f4f4"
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
};

const headerStyle: React.CSSProperties = {
  color: "white",
  padding: "30px 20px",
  textAlign: "center" as const
};

const headerTitleStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "28px",
  fontWeight: "600",
  color: "white"
};

const contentStyle: React.CSSProperties = {
  padding: "40px 30px"
};

const footerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "20px",
  backgroundColor: "#f8f9fa"
};

const footerTextStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "12px",
  color: "#999"
};
