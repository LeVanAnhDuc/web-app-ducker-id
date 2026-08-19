// components
import { FadeIn } from "@/components/Animated";

const OtpInstructionBox = ({
  label,
  delay = 0.4
}: {
  label: string;
  delay?: number;
}) => (
  <FadeIn delay={delay}>
    <div className="bg-cream rounded-lg p-4">
      <p className="text-cream-foreground text-center text-sm">{label}</p>
    </div>
  </FadeIn>
);

export default OtpInstructionBox;
