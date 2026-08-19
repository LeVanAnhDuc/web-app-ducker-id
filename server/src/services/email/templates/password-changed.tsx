// libs
import { Text } from "@react-email/components";
// types
import type { PasswordChangedData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { InfoBox } from "./components/info-box";

export const PasswordChangedEmail = (
  { changedAt, ipAddress }: PasswordChangedData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { passwordChanged: s, common } = strings;

  return (
    <EmailLayout title={s.title} footerText={common.footer}>
      <Text style={paragraphStyle}>{s.greeting}</Text>
      <Text style={paragraphStyle}>
        {s.body} {changedAt} (IP: {ipAddress}).
      </Text>

      <InfoBox variant="danger">{s.warning}</InfoBox>

      <Text style={automatedStyle}>{common.automated}</Text>
    </EmailLayout>
  );
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 15px 0",
  fontSize: "16px"
};

const automatedStyle: React.CSSProperties = {
  margin: "20px 0 0 0",
  fontSize: "13px",
  color: "#888888"
};
