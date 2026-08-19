// components
import AvatarUser from "../../components/AvatarUser";

const UserInfoHeader = ({
  fullName,
  email,
  avatar,
  initials
}: {
  fullName: string;
  email: string;
  avatar?: string | null;
  initials: string;
}) => (
  <div className="flex items-center gap-3 px-3 py-2.5">
    <AvatarUser src={avatar} fallback={initials} className="size-10" />
    <div className="min-w-0 flex-1">
      <p className="text-foreground truncate text-sm font-semibold">
        {fullName}
      </p>
      <p className="text-muted-foreground truncate text-xs">{email}</p>
    </div>
  </div>
);

export default UserInfoHeader;
