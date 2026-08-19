const EmailBadge = ({ email }: { email: string }) => (
  <div className="flex items-center justify-center">
    <div className="bg-muted flex items-center gap-2 rounded-full px-4 py-2">
      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs">
        {email.charAt(0).toUpperCase()}
      </div>
      <span className="text-foreground text-sm">{email}</span>
    </div>
  </div>
);

export default EmailBadge;
