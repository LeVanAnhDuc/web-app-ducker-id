// components
import ChartDataTable from "../ChartDataTable";
// others
import { Link } from "@/i18n/navigation";

export interface CountBarRow {
  key: string;
  label: string;
  count: number;
  /** Secondary line, e.g. an app's category. */
  hint?: string;
  href?: string;
}

/**
 * A single-series ranking. Deliberately not a recharts bar chart: there is one
 * series, so the drawn length carries everything, and plain markup keeps the
 * row a real link with a 44px hit area instead of an SVG rect.
 *
 * Horizontal, because the labels are app and device names — a vertical chart
 * would tilt them to 45°.
 */
const CountBarList = ({
  rows,
  caption,
  labelColumn,
  countColumn,
  countLabel
}: {
  rows: CountBarRow[];
  caption: string;
  labelColumn: string;
  countColumn: string;
  countLabel?: (count: number) => string;
}) => {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => {
          const content = (
            <>
              <span className="w-36 shrink-0 truncate text-sm font-medium">
                {row.label}
                {row.hint ? (
                  <span className="text-muted-foreground block truncate text-xs font-normal">
                    {row.hint}
                  </span>
                ) : null}
              </span>
              <span
                className="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <span
                  className="bg-primary block h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </span>
              <span className="text-muted-foreground w-10 shrink-0 text-right text-sm tabular-nums">
                {row.count}
              </span>
            </>
          );

          return (
            <li key={row.key}>
              {row.href ? (
                <Link
                  href={row.href}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={
                    countLabel
                      ? `${row.label}: ${countLabel(row.count)}`
                      : `${row.label}: ${row.count}`
                  }
                >
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-11 items-center gap-3 px-2">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <ChartDataTable
        caption={caption}
        headers={[labelColumn, countColumn]}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [row.label, row.count]
        }))}
      />
    </>
  );
};

export default CountBarList;
