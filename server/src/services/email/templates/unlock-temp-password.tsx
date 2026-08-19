// libs
import { Section, Text } from "@react-email/components";
// types
import type { UnlockTempPasswordData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { CtaButton } from "./components/cta-button";
import { InfoBox } from "./components/info-box";

const UNLOCK_GRADIENT = "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)";

export const UnlockTempPasswordEmail = (
  { tempPassword, loginUrl }: UnlockTempPasswordData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { unlockTempPassword: s } = strings;

  return (
    <EmailLayout
      title={s.title}
      headerGradient={UNLOCK_GRADIENT}
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
        <strong>
          {"\u23f1\ufe0f"} {s.expiryNote}
        </strong>
        {"\n"}
        {s.changePasswordNote}
      </InfoBox>

      <Section style={ctaContainerStyle}>
        <CtaButton
          href={loginUrl}
          label={s.loginButton}
          gradient={UNLOCK_GRADIENT}
        />
      </Section>

      <Section style={dangerBoxStyle}>
        <Text style={dangerTextStyle}>
          <strong>
            {"\u26a0\ufe0f"} {s.securityTitle}
          </strong>
        </Text>
        <Text style={dangerTextStyle}>{s.securityWarning}</Text>
      </Section>

      <Text style={securityHeaderStyle}>{s.securityListTitle}</Text>
      <Text style={securityListStyle}>
        {"\u2022"} {s.securityList1}
        {"\n"}
        {"\u2022"} {s.securityList2}
        {"\n"}
        {"\u2022"} {s.securityList3}
        {"\n"}
        {"\u2022"} {s.securityList4}
      </Text>
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
  color: "#dc2626",
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

const securityHeaderStyle: React.CSSProperties = {
  marginTop: "30px",
  fontSize: "14px",
  color: "#666"
};

const securityListStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#666",
  lineHeight: "1.8",
  whiteSpace: "pre-line" as const
};
