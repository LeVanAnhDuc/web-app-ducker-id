const GroupHeader = ({ label }: { label: string }) => (
  <div className="bg-muted/60 text-muted-foreground border-border flex items-center border-b px-5 py-2 text-xs font-semibold tracking-[0.12em] uppercase">
    {label}
  </div>
);

export default GroupHeader;
