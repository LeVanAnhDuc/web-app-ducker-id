// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { FORGOT_PASSWORD } = CONSTANTS.ROUTES;

const ForgotPasswordLink = ({
  email,
  label
}: {
  email: string;
  label: string;
}) => {
  const encodedEmail = encodeURIComponent(email);

  return (
    <Link
      href={`${FORGOT_PASSWORD}?email=${encodedEmail}`}
      className="text-primary text-sm transition-colors duration-200 hover:underline"
    >
      {label}
    </Link>
  );
};

export default ForgotPasswordLink;
