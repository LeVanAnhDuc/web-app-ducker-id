// libs
import { ArrowLeft } from "lucide-react";
// components
import { Link } from "@/i18n/navigation";
// others
import { cn } from "@/libs/utils";

const BackLink = ({
  href,
  label,
  className
}: {
  href: string;
  label: string;
  className?: string;
}) => (
  <Link
    href={href}
    className={cn(
      "text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors",
      className
    )}
  >
    <ArrowLeft className="size-4" aria-hidden="true" />
    {label}
  </Link>
);

export default BackLink;
