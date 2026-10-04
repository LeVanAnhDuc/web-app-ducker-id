// types
import type { ReactNode } from "react";
// libs
import { ArrowRight } from "lucide-react";
// others
import { Link } from "@/i18n/navigation";

/**
 * The "see all" affordance on every section. A real anchor rather than a
 * button that pushes a route, so it opens in a new tab and shows up in a
 * screen reader's list of links.
 */
const SectionLink = ({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) => (
  <Link
    href={href}
    className="text-primary focus-visible:ring-ring inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-1 text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
  >
    {children}
    <ArrowRight className="size-3.5" aria-hidden="true" />
  </Link>
);

export default SectionLink;
