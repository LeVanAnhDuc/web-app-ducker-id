// components
import { FadeIn } from "@/components/Animated";

const LoginOptionsInfo = ({ label }: { label: string }) => (
  <FadeIn delay={0.4} y={10} className="bg-primary/5 mt-6 rounded-lg p-4">
    <p className="text-muted-foreground text-center text-sm">{label}</p>
  </FadeIn>
);

export default LoginOptionsInfo;
