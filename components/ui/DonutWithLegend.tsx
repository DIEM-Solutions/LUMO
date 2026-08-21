import { Donut } from "./primitives";

export function DonutWithLegend({
  segments,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string; names?: string[] }[];
  centerLabel: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const donutSegments = segments.map((seg) => ({ color: seg.color, pct: (seg.value / total) * 100 }));

  return (
    <div className="chart-row-top">
      <Donut segments={donutSegments} centerNum={total} centerLabel={centerLabel} />
      <div className="donut-legend">
        {segments.map((seg) => (
          <div className={`li${seg.names?.length ? " has-names" : ""}`} key={seg.label}>
            <span className="li-label">
              <span className="sw" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="li-nums">
              <span className="li-count">{seg.value}</span>
              <span className="li-pct">{Math.round((seg.value / total) * 100)}%</span>
            </span>
            {seg.names && seg.names.length > 0 && <div className="li-tooltip">{seg.names.join(", ")}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
