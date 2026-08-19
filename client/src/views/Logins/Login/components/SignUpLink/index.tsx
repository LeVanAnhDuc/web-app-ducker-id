// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { SIGNUP } = CONSTANTS.ROUTES;

const SignUpLink = ({
  labels
}: {
  labels: {
    descriptionSignUp: string;
    signUp: string;
  };
}) => (
  <div className="mt-8 text-center">
    <p className="text-muted-foreground text-sm">
      {labels.descriptionSignUp}?{" "}
      <Link
        href={SIGNUP}
        className="text-primary transition-colors duration-200 hover:underline"
      >
        {labels.signUp}
      </Link>
    </p>
  </div>
);

export default SignUpLink;
