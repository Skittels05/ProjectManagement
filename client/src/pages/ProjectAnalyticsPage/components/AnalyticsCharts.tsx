import type { BurndownPoint, ScatterPointDto } from "../../../store/types/analytics.types";
import { useI18n } from "../../../shared/i18n";

const CHART_W = 720;
const CHART_H = 320;
const PAD = { top: 28, right: 28, bottom: 52, left: 56 };

function linearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

function niceStep(max: number, tickCount: number): number {
  const rough = max / tickCount;
  const mag = 10 ** Math.floor(Math.log10(rough || 1));
  const norm = rough / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function buildTicks(max: number, tickCount = 5): number[] {
  const step = niceStep(max, tickCount);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) {
    ticks.push(v);
  }
  return ticks;
}

type BurndownChartProps = {
  points: BurndownPoint[];
  committedStoryPoints: number;
};

export function BurndownChart({ points, committedStoryPoints }: BurndownChartProps) {
  const { t } = useI18n();
  if (points.length === 0) {
    return <p className="muted analytics-chart-empty">{t("analytics.noBurndownData")}</p>;
  }

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const dataMax = Math.max(committedStoryPoints, ...points.map((p) => Math.max(p.ideal, p.actual)), 0);
  const yTicks = buildTicks(dataMax, 5);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  const xScale = linearScale([0, Math.max(points.length - 1, 1)], [0, innerW]);
  const yScale = linearScale([0, yMax], [innerH, 0]);

  const toPath = (key: "ideal" | "actual") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${PAD.left + xScale(i)},${PAD.top + yScale(p[key])}`)
      .join(" ");

  const xLabelEvery = points.length <= 10 ? 1 : Math.ceil(points.length / 10);

  return (
    <figure className="analytics-chart">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label={t("analytics.burndownChart")}>
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + innerH}
          className="analytics-chart-axis"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          className="analytics-chart-axis"
        />
        {yTicks.map((v) => {
          const y = PAD.top + yScale(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={y}
                y2={y}
                className="analytics-chart-grid"
              />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="analytics-chart-tick">
                {v}
              </text>
            </g>
          );
        })}
        <path d={toPath("ideal")} className="analytics-chart-line analytics-chart-line-ideal" fill="none" />
        <path d={toPath("actual")} className="analytics-chart-line analytics-chart-line-actual" fill="none" />
        {points.map((p, i) =>
          i % xLabelEvery === 0 || i === points.length - 1 ? (
            <text
              key={p.date}
              x={PAD.left + xScale(i)}
              y={CHART_H - 16}
              textAnchor="middle"
              className="analytics-chart-tick analytics-chart-tick-x"
            >
              {p.date.slice(5)}
            </text>
          ) : null,
        )}
        <text
          x={PAD.left + innerW / 2}
          y={CHART_H - 4}
          textAnchor="middle"
          className="analytics-chart-axis-label"
        >
          {t("analytics.burndownAxisX")}
        </text>
        <text
          x={16}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
          className="analytics-chart-axis-label"
        >
          {t("analytics.burndownAxisY")}
        </text>
      </svg>
      <figcaption className="analytics-chart-legend">
        <span className="analytics-legend-item analytics-legend-ideal">{t("analytics.idealLine")}</span>
        <span className="analytics-legend-item analytics-legend-actual">{t("analytics.actualLine")}</span>
      </figcaption>
    </figure>
  );
}

type ScatterChartProps = {
  points: ScatterPointDto[];
};

export function ScatterChart({ points }: ScatterChartProps) {
  const { t } = useI18n();
  if (points.length === 0) {
    return <p className="muted analytics-chart-empty">{t("analytics.noScatterData")}</p>;
  }

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const maxX = Math.max(...points.map((p) => p.storyPoints), 1);
  const maxY = Math.max(...points.map((p) => p.totalMinutes), 1);
  const xTicks = buildTicks(maxX, 5);
  const yTicks = buildTicks(maxY, 5);
  const xMax = xTicks[xTicks.length - 1] ?? maxX;
  const yMax = yTicks[yTicks.length - 1] ?? maxY;
  const xScale = linearScale([0, xMax], [0, innerW]);
  const yScale = linearScale([0, yMax], [innerH, 0]);

  return (
    <figure className="analytics-chart">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label={t("analytics.scatterChart")}>
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + innerH}
          className="analytics-chart-axis"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          className="analytics-chart-axis"
        />
        {yTicks.map((v) => {
          const y = PAD.top + yScale(v);
          return (
            <g key={`y-${v}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={y}
                y2={y}
                className="analytics-chart-grid"
              />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="analytics-chart-tick">
                {v}
              </text>
            </g>
          );
        })}
        {xTicks.map((v) => {
          const x = PAD.left + xScale(v);
          return (
            <g key={`x-${v}`}>
              <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + innerH} className="analytics-chart-grid" />
              <text x={x} y={CHART_H - 16} textAnchor="middle" className="analytics-chart-tick">
                {v}
              </text>
            </g>
          );
        })}
        {points.map((p) => (
          <g key={p.taskId}>
            <circle
              cx={PAD.left + xScale(p.storyPoints)}
              cy={PAD.top + yScale(p.totalMinutes)}
              r={7}
              className="analytics-scatter-dot"
            />
            <title>
              {p.title} — {p.storyPoints} SP, {p.totalMinutes} min
              {p.assignee ? ` (${p.assignee.fullName})` : ""}
            </title>
          </g>
        ))}
        <text x={PAD.left + innerW / 2} y={CHART_H - 4} textAnchor="middle" className="analytics-chart-axis-label">
          {t("analytics.scatterX")}
        </text>
        <text
          x={16}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
          className="analytics-chart-axis-label"
        >
          {t("analytics.scatterY")}
        </text>
      </svg>
    </figure>
  );
}
