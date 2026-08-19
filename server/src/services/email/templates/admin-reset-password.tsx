// libs
import { Section, Text } from "@react-email/components";
// types
import type { AdminResetPasswordData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { CtaButton } from "./components/cta-button";
import { InfoBox } from "./components/info-box";

const ADMIN_RESET_GRADIENT =
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";

export const AdminResetPasswordEmail = (
  { tempPassword, loginUrl }: AdminResetPasswordData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { adminResetPassword: s } = strings;

  return (
    <EmailLayout
      title={s.title}
      headerGradient={ADMIN_RESET_GRADIENT}
      footerText={s.footerNote}
      footerCopyright={s.copyright}
    >
      <Text style={paragraphStyle}>{s.greeting}</Text>
      <Text style={paragraphStyle}>{s.body}</Text>

      <Section style={passwordBoxStyle}>
        <Text style={passwordLabelStyle}>{s.passwordLabel}</Text>
        <Text style={passwordValueStyle}>{tempPassword}</Text>
      </Section>

      <InfoBox variant="info">
        <strong>{s.changePasswordNote}</strong>
      </InfoBox>

      <Section style={ctaContainerStyle}>
        <CtaButton
          href={loginUrl}
          label={s.loginButton}
          gradient={ADMIN_RESET_GRADIENT}
        />
      </Section>

      <Section style={dangerBoxStyle}>
        <Text style={dangerTextStyle}>
          <strong>
            {"⚠️"} {s.securityTitle}
          </strong>
        </Text>
        <Text style={dangerTextStyle}>{s.securityWarning}</Text>
      </Section>
    </EmailLayout>
  );
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 15px 0",
  fontSize: "16px"
};

const passwordBoxStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  border: "2px dashed #6b7280",
  padding: "20px",
  margin: "25px 0",
  textAlign: "center" as const,
  borderRadius: "8px"
};

const passwordLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "10px",
  fontWeight: "500"
};

const passwordValueStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: "24px",
  fontWeight: "700",
  color: "#4338ca",
  letterSpacing: "2px",
  wordBreak: "break-all" as const
};

const ctaContainerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "30px 0"
};

const dangerBoxStyle: React.CSSProperties = {
  backgroundColor: "#fee2e2",
  borderLeft: "4px solid #dc2626",
  padding: "15px",
  margin: "20px 0",
  borderRadius: "4px"
};

const dangerTextStyle: React.CSSProperties = {
  margin: "5px 0",
  fontSize: "14px",
  color: "#7f1d1d"
};
