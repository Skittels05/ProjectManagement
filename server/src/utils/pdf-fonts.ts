import path from "path";
import type PDFDocument from "pdfkit";

export const PDF_FONT = "App";
export const PDF_FONT_BOLD = "App-Bold";

function dejavuFontPath(filename: string): string {
  const pkgRoot = path.dirname(require.resolve("@vintproykt/dejavu-fonts-ttf/package.json"));
  return path.join(pkgRoot, "ttf", filename);
}

export function registerPdfFonts(doc: InstanceType<typeof PDFDocument>): void {
  doc.registerFont(PDF_FONT, dejavuFontPath("DejaVuSans.ttf"));
  doc.registerFont(PDF_FONT_BOLD, dejavuFontPath("DejaVuSans-Bold.ttf"));
}
