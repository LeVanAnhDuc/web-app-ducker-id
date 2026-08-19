const UsageStat = ({
  label,
  value,
  ratio
}: {
  label: string;
  value: string;
  ratio: number;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground text-xl font-bold">{value}</p>
    </div>
    <div
      className="bg-muted h-1.5 overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="bg-primary h-full"
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
        aria-hidden="true"
      />
    </div>
  </div>
);

export default UsageStat;
