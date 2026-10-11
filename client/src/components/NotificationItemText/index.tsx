// others
import { cn } from "@/libs/utils";

const NotificationItemText = ({
  titleId,
  title,
  body,
  time,
  isRead
}: {
  titleId: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
}) => (
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <p
        id={titleId}
        className={cn(
          "text-foreground text-sm",
          isRead ? "font-normal" : "font-semibold"
        )}
      >
        {title}
      </p>
      <span className="text-muted-foreground shrink-0 text-xs">{time}</span>
    </div>
    {body ? (
      <p className="text-muted-foreground mt-1 text-sm leading-snug">{body}</p>
    ) : null}
  </div>
);

export default NotificationItemText;
