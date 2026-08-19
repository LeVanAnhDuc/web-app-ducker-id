// components
import { Badge } from "@/components/ui/badge";

const StatBadge = ({ children }: { children: string }) => (
  <Badge
    variant="secondary"
    className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium"
  >
    {children}
  </Badge>
);

export default StatBadge;
