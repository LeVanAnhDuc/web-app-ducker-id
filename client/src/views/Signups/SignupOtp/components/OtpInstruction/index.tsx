// components
import { FadeIn } from "@/components/Animated";

const OtpInstruction = ({ label }: { label: string }) => (
  <FadeIn delay={0.4}>
    <div className="bg-cream rounded-lg p-4">
      <p className="text-cream-foreground text-center text-sm">{label}</p>
    </div>
  </FadeIn>
);

export default OtpInstruction;
