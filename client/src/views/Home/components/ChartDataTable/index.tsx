// types
import type { ReactNode } from "react";

export interface ChartDataRow {
  key: string;
  cells: ReactNode[];
}

/**
 * The same numbers the chart draws, as a table only a screen reader sees.
 *
 * recharts renders an SVG: the series are paths with no text, so an
 * `aria-label` on the figure can summarise but cannot be read point by point.
 * This is the point-by-point version, and it is the data itself rather than a
 * description of it.
 */
const ChartDataTable = ({
  caption,
  headers,
  rows
}: {
  caption: string;
  headers: string[];
  rows: ChartDataRow[];
}) => (
  <table className="sr-only">
    <caption>{caption}</caption>
    <thead>
      <tr>
        {headers.map((header) => (
          <th key={header} scope="col">
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.key}>
          {row.cells.map((cell, index) => (
            <td key={`${row.key}-${index}`}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default ChartDataTable;
