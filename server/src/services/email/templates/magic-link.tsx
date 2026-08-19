// libs
import { Section, Text } from "@react-email/components";
// types
import type { MagicLinkData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { CtaButton } from "./components/cta-button";
import { InfoBox } from "./components/info-box";

export const MagicLinkEmail = (
  { magicLinkUrl, expiryMinutes }: MagicLinkData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { magicLink: s, common } = strings;

  return (
    <EmailLayout title={s.title} footerText={common.footer}>
      <Text style={paragraphStyle}>{s.greeting}</Text>
      <Text style={paragraphStyle}>{s.body}</Text>

      <Section style={ctaContainerStyle}>
        <CtaButton href={magicLinkUrl} label={s.signInButton} />
        <Text style={tipStyle}>{s.tip}</Text>
      </Section>

      <InfoBox variant="warning">
        {s.expiryPrefix}{" "}
        <strong style={{ color: "#667eea" }}>{expiryMinutes}</strong>{" "}
        {s.expirySuffix} {s.oneTimeNote}
      </InfoBox>

      <InfoBox variant="danger">{s.warning}</InfoBox>

      <Text style={automatedStyle}>{common.automated}</Text>
    </EmailLayout>
  );
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 15px 0",
  fontSize: "16px"
};

const ctaContainerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "30px 0"
};

const tipStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#888",
  marginTop: "15px"
};

const automatedStyle: React.CSSProperties = {
  marginTop: "30px",
  fontSize: "14px",
  color: "#666"
};
