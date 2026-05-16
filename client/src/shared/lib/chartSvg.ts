import type { BurndownPoint, ScatterPointDto } from "../../store/types/analytics.types";

const CHART_W = 720;
const CHART_H = 320;
const PAD = { top: 28, right: 28, bottom: 52, left: 56 };

const COLORS = {
  axis: "#64748b",
  grid: "#cbd5e1",
  tick: "#64748b",
  ideal: "#64748b",
  actual: "#2563eb",
  dot: "#2563eb",
};

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

export function extractSvgMarkup(fragment: string): string {
  const match = fragment.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return fragment;
  const svg = match[0];
  return svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function svgMarkupToPngBase64(svgFragment: string, width = 720, height = 360): Promise<string> {
  const svg = extractSvgMarkup(svgFragment);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/png");
      resolve(dataUrl.split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render chart"));
    };
    img.src = url;
  });
}

export type BurndownChartLabels = {
  axisX: string;
  axisY: string;
  ideal: string;
  actual: string;
};

export function burndownChartSvg(
  points: BurndownPoint[],
  committedStoryPoints: number,
  labels: BurndownChartLabels,
): string {
  if (points.length === 0) return "";

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

  const grid = yTicks
    .map((v) => {
      const y = PAD.top + yScale(v);
      return `<line x1="${PAD.left}" x2="${PAD.left + innerW}" y1="${y}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/><text x="${PAD.left - 10}" y="${y + 4}" text-anchor="end" fill="${COLORS.tick}" font-size="10">${v}</text>`;
    })
    .join("");

  const xLabels = points
    .map((p, i) =>
      i % xLabelEvery === 0 || i === points.length - 1
        ? `<text x="${PAD.left + xScale(i)}" y="${CHART_H - 16}" text-anchor="middle" fill="${COLORS.tick}" font-size="9">${p.date.slice(5)}</text>`
        : "",
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="100%" role="img">
    <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + innerH}" stroke="${COLORS.axis}" stroke-width="1.5"/>
    <line x1="${PAD.left}" y1="${PAD.top + innerH}" x2="${PAD.left + innerW}" y2="${PAD.top + innerH}" stroke="${COLORS.axis}" stroke-width="1.5"/>
    ${grid}
    <path d="${toPath("ideal")}" fill="none" stroke="${COLORS.ideal}" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round"/>
    <path d="${toPath("actual")}" fill="none" stroke="${COLORS.actual}" stroke-width="2.5" stroke-linecap="round"/>
    ${xLabels}
    <text x="${PAD.left + innerW / 2}" y="${CHART_H - 4}" text-anchor="middle" fill="${COLORS.tick}" font-size="11">${labels.axisX}</text>
    <text x="16" y="${PAD.top + innerH / 2}" text-anchor="middle" fill="${COLORS.tick}" font-size="11" transform="rotate(-90 16 ${PAD.top + innerH / 2})">${labels.axisY}</text>
  </svg>
  <p style="margin:0.5rem 0 0;font-size:0.85rem;color:#64748b">
    <span style="display:inline-block;width:1.25rem;height:3px;background:${COLORS.ideal};vertical-align:middle;margin-right:0.35rem"></span>${labels.ideal}
    &nbsp;&nbsp;
    <span style="display:inline-block;width:1.25rem;height:3px;background:${COLORS.actual};vertical-align:middle;margin-right:0.35rem"></span>${labels.actual}
  </p>`;
}

export type ScatterChartLabels = {
  axisX: string;
  axisY: string;
};

export function scatterChartSvg(points: ScatterPointDto[], labels: ScatterChartLabels): string {
  if (points.length === 0) return "";

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

  const yGrid = yTicks
    .map((v) => {
      const y = PAD.top + yScale(v);
      return `<line x1="${PAD.left}" x2="${PAD.left + innerW}" y1="${y}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/><text x="${PAD.left - 10}" y="${y + 4}" text-anchor="end" fill="${COLORS.tick}" font-size="10">${v}</text>`;
    })
    .join("");

  const xGrid = xTicks
    .map((v) => {
      const x = PAD.left + xScale(v);
      return `<line x1="${x}" x2="${x}" y1="${PAD.top}" y2="${PAD.top + innerH}" stroke="${COLORS.grid}" stroke-width="1"/><text x="${x}" y="${CHART_H - 16}" text-anchor="middle" fill="${COLORS.tick}" font-size="10">${v}</text>`;
    })
    .join("");

  const dots = points
    .map(
      (p) =>
        `<circle cx="${PAD.left + xScale(p.storyPoints)}" cy="${PAD.top + yScale(p.totalMinutes)}" r="7" fill="${COLORS.dot}" opacity="0.85"><title>${p.title}</title></circle>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="100%" role="img">
    <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + innerH}" stroke="${COLORS.axis}" stroke-width="1.5"/>
    <line x1="${PAD.left}" y1="${PAD.top + innerH}" x2="${PAD.left + innerW}" y2="${PAD.top + innerH}" stroke="${COLORS.axis}" stroke-width="1.5"/>
    ${yGrid}
    ${xGrid}
    ${dots}
    <text x="${PAD.left + innerW / 2}" y="${CHART_H - 4}" text-anchor="middle" fill="${COLORS.tick}" font-size="11">${labels.axisX}</text>
    <text x="16" y="${PAD.top + innerH / 2}" text-anchor="middle" fill="${COLORS.tick}" font-size="11" transform="rotate(-90 16 ${PAD.top + innerH / 2})">${labels.axisY}</text>
  </svg>`;
}
