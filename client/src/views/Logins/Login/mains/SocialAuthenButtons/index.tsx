// components
import CustomButton from "@/components/CustomButton";
import GoogleIcon from "../../components/GoogleIcon";
import FacebookIcon from "../../components/FacebookIcon";

const SocialAuthenButtons = ({
  labels
}: {
  labels: {
    google: string;
    facebook: string;
    comingSoon: string;
  };
}) => (
  <div className="space-y-5">
    <CustomButton
      type="button"
      variant="outline"
      disabled
      fullWidth
      className="border-input hover:bg-accent justify-between transition-colors duration-200"
    >
      <span className="flex items-center gap-3">
        <GoogleIcon className="size-5 shrink-0" />
        {labels.google}
      </span>
      <span className="text-muted-foreground font-normal">
        ({labels.comingSoon})
      </span>
    </CustomButton>
    <CustomButton
      type="button"
      variant="outline"
      disabled
      fullWidth
      className="border-input hover:bg-accent justify-between transition-colors duration-200"
    >
      <span className="flex items-center gap-3">
        <FacebookIcon className="size-5 shrink-0" />
        {labels.facebook}
      </span>
      <span className="text-muted-foreground font-normal">
        ({labels.comingSoon})
      </span>
    </CustomButton>
  </div>
);

export default SocialAuthenButtons;
