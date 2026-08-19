// libs
import { Mail, Info } from "lucide-react";
// components
import { FadeIn } from "@/components/Animated";

const MagicLinkInstructions = ({
  labels
}: {
  labels: {
    checkEmail: string;
    clickLink: string;
    checkSpam: string;
  };
}) => (
  <FadeIn delay={0.3} className="space-y-5">
    <div className="bg-info/10 rounded-lg p-4">
      <p className="text-foreground text-sm">
        <span className="mb-2 flex items-center gap-2">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {labels.checkEmail}
        </span>
        {labels.clickLink}
      </p>
    </div>
    <div className="border-warning/30 bg-warning/10 rounded-lg border p-4">
      <p className="text-warning-foreground flex items-center gap-2 text-sm">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        <span>{labels.checkSpam}</span>
      </p>
    </div>
  </FadeIn>
);

export default MagicLinkInstructions;
