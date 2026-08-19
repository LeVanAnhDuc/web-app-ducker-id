// libs
import { AlertCircle, Mail } from "lucide-react";
// components
import { FadeIn } from "@/components/Animated";

const MagicLinkInstructions = ({
  checkEmail,
  detail,
  hintTitle,
  hintDescription,
  delay = 0.3
}: {
  checkEmail: string;
  detail: string;
  hintTitle: string;
  hintDescription: string;
  delay?: number;
}) => (
  <FadeIn delay={delay} className="space-y-5">
    <div className="bg-info/10 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <Mail className="text-info mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="text-foreground text-sm">
          <span className="mb-2 block font-medium">{checkEmail}</span>
          {detail}
        </p>
      </div>
    </div>
    <div className="border-warning/30 bg-warning/10 rounded-lg border p-4">
      <div className="flex items-start gap-2">
        <AlertCircle
          className="text-warning mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <p className="text-warning-foreground text-sm">
          <span className="font-medium">{hintTitle}</span> {hintDescription}
        </p>
      </div>
    </div>
  </FadeIn>
);

export default MagicLinkInstructions;
