// libs
import type { LucideIcon } from "lucide-react";
// components
import {
  DropdownMenuItem,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
// others
import { Link } from "@/i18n/navigation";

const UserMenuItem = ({
  icon: Icon,
  label,
  shortcut,
  href,
  onSelect,
  variant = "default"
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  href?: string;
  onSelect?: () => void;
  variant?: "default" | "destructive";
}) => {
  const content = (
    <>
      <Icon className="size-4" aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
      {shortcut ? (
        <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
      ) : null}
    </>
  );
  if (href) {
    return (
      <DropdownMenuItem
        asChild
        variant={variant}
        className="cursor-pointer gap-3 px-3 py-2"
      >
        <Link href={href}>{content}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem
      variant={variant}
      onSelect={onSelect}
      className="cursor-pointer gap-3 px-3 py-2"
    >
      {content}
    </DropdownMenuItem>
  );
};

export default UserMenuItem;
