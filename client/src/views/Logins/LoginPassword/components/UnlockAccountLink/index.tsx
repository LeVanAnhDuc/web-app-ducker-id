// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN_UNLOCK } = CONSTANTS.ROUTES;

const UnlockAccountLink = ({
  email,
  label
}: {
  email: string;
  label: string;
}) => (
  <div className="text-center">
    <Link
      href={`${LOGIN_UNLOCK}?email=${encodeURIComponent(email)}`}
      className="text-primary text-sm font-medium transition-colors duration-200 hover:underline"
    >
      {label}
    </Link>
  </div>
);

export default UnlockAccountLink;
