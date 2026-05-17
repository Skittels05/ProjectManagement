import type PDFDocument from "pdfkit";

const PAD = { top: 22, right: 20, bottom: 36, left: 44 };

const COLORS = {
  axis: "#64748b",
  grid: "#cbd5e1",
  ideal: "#64748b",
  actual: "#2563eb",
  dot: "#2563eb",
  tick: "#64748b",
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

type ChartBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function chartBox(doc: InstanceType<typeof PDFDocument>, width: number, height: number): ChartBox {
  const marginBottom = doc.page.height - doc.page.margins.bottom;
  let y = doc.y;
  if (y + height > marginBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const x = doc.page.margins.left;
  return { x, y, width, height };
}

function finishChart(doc: InstanceType<typeof PDFDocument>, box: ChartBox, extra = 12): void {
  doc.y = box.y + box.height + extra;
}

export function drawBurndownChart(
  doc: InstanceType<typeof PDFDocument>,
  points: { date: string; ideal: number; actual: number }[],
  committedStoryPoints: number,
  labels: { axisX: string; axisY: string; ideal: string; actual: string },
): void {
  if (points.length === 0) return;

  const chartW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartH = 200;
  const box = chartBox(doc, chartW, chartH + 28);

  const innerW = chartW - PAD.left - PAD.right;
  const innerH = chartH - PAD.top - PAD.bottom;
  const originX = box.x + PAD.left;
  const originY = box.y + PAD.top;

  const dataMax = Math.max(committedStoryPoints, ...points.map((p) => Math.max(p.ideal, p.actual)), 0);
  const yTicks = buildTicks(dataMax, 5);
  const yMax = yTicks[yTicks.length - 1] ?? 1;
  const xScale = linearScale([0, Math.max(points.length - 1, 1)], [0, innerW]);
  const yScale = linearScale([0, yMax], [innerH, 0]);

  doc.save();
  doc.strokeColor(COLORS.grid).lineWidth(0.5);
  for (const v of yTicks) {
    const y = originY + yScale(v);
    doc
      .moveTo(originX, y)
      .lineTo(originX + innerW, y)
      .stroke();
    doc.fillColor(COLORS.tick).fontSize(7).text(String(v), box.x + 4, y - 4, { width: PAD.left - 8, align: "right" });
  }

  doc.strokeColor(COLORS.axis).lineWidth(1);
  doc.moveTo(originX, originY).lineTo(originX, originY + innerH).stroke();
  doc.moveTo(originX, originY + innerH).lineTo(originX + innerW, originY + innerH).stroke();

  const idealPath = points.map((p, i) => ({
    x: originX + xScale(i),
    y: originY + yScale(p.ideal),
  }));
  const actualPath = points.map((p, i) => ({
    x: originX + xScale(i),
    y: originY + yScale(p.actual),
  }));

  doc.strokeColor(COLORS.ideal).lineWidth(2).dash(6, { space: 4 });
  idealPath.forEach((pt, i) => {
    if (i === 0) doc.moveTo(pt.x, pt.y);
    else doc.lineTo(pt.x, pt.y);
  });
  doc.stroke().undash();

  doc.strokeColor(COLORS.actual).lineWidth(2);
  actualPath.forEach((pt, i) => {
    if (i === 0) doc.moveTo(pt.x, pt.y);
    else doc.lineTo(pt.x, pt.y);
  });
  doc.stroke();

  const xLabelEvery = points.length <= 10 ? 1 : Math.ceil(points.length / 10);
  doc.fillColor(COLORS.tick).fontSize(7);
  points.forEach((p, i) => {
    if (i % xLabelEvery !== 0 && i !== points.length - 1) return;
    const x = originX + xScale(i);
    doc.text(p.date.slice(5), x - 16, originY + innerH + 6, { width: 32, align: "center" });
  });

  doc.fillColor(COLORS.tick).fontSize(9).text(labels.axisX, originX, originY + innerH + 22, {
    width: innerW,
    align: "center",
  });
  doc.save();
  doc.translate(box.x + 12, originY + innerH / 2);
  doc.rotate(-90);
  doc.text(labels.axisY, -40, 0, { width: 80, align: "center" });
  doc.restore();

  doc.restore();

  const legendY = box.y + chartH + 4;
  doc.fillColor(COLORS.tick).fontSize(8);
  doc.rect(box.x + PAD.left, legendY, 14, 2).fill(COLORS.ideal);
  doc.fillColor(COLORS.tick).text(labels.ideal, box.x + PAD.left + 18, legendY - 3, { continued: false });
  doc.rect(box.x + PAD.left + 100, legendY, 14, 2).fill(COLORS.actual);
  doc.text(labels.actual, box.x + PAD.left + 118, legendY - 3);

  finishChart(doc, { ...box, height: chartH + 28 });
}

export function drawScatterChart(
  doc: InstanceType<typeof PDFDocument>,
  points: { storyPoints: number; totalMinutes: number }[],
  labels: { axisX: string; axisY: string },
): void {
  if (points.length === 0) return;

  const chartW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartH = 200;
  const box = chartBox(doc, chartW, chartH + 16);

  const innerW = chartW - PAD.left - PAD.right;
  const innerH = chartH - PAD.top - PAD.bottom;
  const originX = box.x + PAD.left;
  const originY = box.y + PAD.top;

  const maxX = Math.max(...points.map((p) => p.storyPoints), 1);
  const maxY = Math.max(...points.map((p) => p.totalMinutes), 1);
  const xTicks = buildTicks(maxX, 5);
  const yTicks = buildTicks(maxY, 5);
  const xMax = xTicks[xTicks.length - 1] ?? maxX;
  const yMax = yTicks[yTicks.length - 1] ?? maxY;
  const xScale = linearScale([0, xMax], [0, innerW]);
  const yScale = linearScale([0, yMax], [innerH, 0]);

  doc.save();
  doc.strokeColor(COLORS.grid).lineWidth(0.5);
  for (const v of yTicks) {
    const y = originY + yScale(v);
    doc
      .moveTo(originX, y)
      .lineTo(originX + innerW, y)
      .stroke();
    doc.fillColor(COLORS.tick).fontSize(7).text(String(v), box.x + 4, y - 4, { width: PAD.left - 8, align: "right" });
  }
  for (const v of xTicks) {
    const x = originX + xScale(v);
    doc
      .moveTo(x, originY)
      .lineTo(x, originY + innerH)
      .stroke();
    doc.fillColor(COLORS.tick).fontSize(7).text(String(v), x - 12, originY + innerH + 4, { width: 24, align: "center" });
  }

  doc.strokeColor(COLORS.axis).lineWidth(1);
  doc.moveTo(originX, originY).lineTo(originX, originY + innerH).stroke();
  doc.moveTo(originX, originY + innerH).lineTo(originX + innerW, originY + innerH).stroke();

  doc.fillColor(COLORS.dot);
  for (const p of points) {
    const cx = originX + xScale(p.storyPoints);
    const cy = originY + yScale(p.totalMinutes);
    doc.circle(cx, cy, 4).fill();
  }

  doc.fillColor(COLORS.tick).fontSize(9).text(labels.axisX, originX, originY + innerH + 22, {
    width: innerW,
    align: "center",
  });
  doc.save();
  doc.translate(box.x + 12, originY + innerH / 2);
  doc.rotate(-90);
  doc.text(labels.axisY, -40, 0, { width: 80, align: "center" });
  doc.restore();
  doc.restore();

  finishChart(doc, { ...box, height: chartH + 16 });
}
