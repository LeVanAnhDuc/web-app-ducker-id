// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN_ALTERNATIVE } = CONSTANTS.ROUTES;

const TryAnotherButton = ({
  email,
  disabled = false,
  label
}: {
  email: string;
  disabled?: boolean;
  label: string;
}) => {
  const encodedEmail = encodeURIComponent(email);

  if (disabled) {
    return (
      <span className="text-muted-foreground cursor-not-allowed text-sm opacity-50">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`${LOGIN_ALTERNATIVE}?email=${encodedEmail}`}
      className="text-primary text-sm transition-colors duration-200 hover:underline"
    >
      {label}
    </Link>
  );
};

export default TryAnotherButton;
