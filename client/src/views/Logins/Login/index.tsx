// libs
import { getMessages } from "next-intl/server";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import SocialAuthenButtons from "./mains/SocialAuthenButtons";
import EmailStepForm from "./mains/EmailStepForm";
import AuthDivider from "./components/AuthDivider";

const Login = async () => {
  const messages = await getMessages();
  const translations = messages.login as LoginMessages;
  const { form } = translations;

  return (
    <AuthStepLayout title={form.titleWelcome} description={form.description}>
      <div className="space-y-5">
        <SocialAuthenButtons
          labels={{
            google: form.button.loginWithGoogle,
            facebook: form.button.loginWithFacebook,
            comingSoon: form.button.comingSoon
          }}
        />
        <AuthDivider />
        <EmailStepForm
          labels={{
            email: form.input.labelEmail,
            next: form.button.next
          }}
        />
      </div>
    </AuthStepLayout>
  );
};

export default Login;
