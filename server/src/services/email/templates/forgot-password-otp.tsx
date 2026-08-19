// libs
import { Text } from "@react-email/components";
// types
import type { ForgotPasswordOtpData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { OtpBlock } from "./components/otp-block";
import { InfoBox } from "./components/info-box";

export const ForgotPasswordOtpEmail = (
  { otp, expiryMinutes }: ForgotPasswordOtpData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { forgotPasswordOtp: s, common } = strings;

  return (
    <EmailLayout title={s.title} footerText={common.footer}>
      <Text style={paragraphStyle}>{s.greeting}</Text>
      <Text style={paragraphStyle}>{s.body}</Text>

      <OtpBlock otp={otp} />

      <InfoBox variant="warning">
        {s.expiryPrefix}{" "}
        <strong style={{ color: "#667eea" }}>{expiryMinutes}</strong>{" "}
        {s.expirySuffix} {s.securityNote}
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

const automatedStyle: React.CSSProperties = {
  marginTop: "30px",
  fontSize: "14px",
  color: "#666"
};
