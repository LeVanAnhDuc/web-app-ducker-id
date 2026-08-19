// libs
import { KeyRound } from "lucide-react";
// components
import LoginOptionCardLink from "../../components/LoginOptionCardLink";
// others
import CONSTANTS from "@/constants";

const { LOGIN_PASSWORD } = CONSTANTS.ROUTES;

const LoginOptionPassword = ({
  email,
  title,
  description,
  delay
}: {
  email: string;
  title: string;
  description: string;
  delay?: number;
}) => (
  <LoginOptionCardLink
    icon={KeyRound}
    title={title}
    description={description}
    colorVariant="success"
    href={`${LOGIN_PASSWORD}?email=${encodeURIComponent(email)}`}
    animationDelay={delay}
  />
);

export default LoginOptionPassword;
