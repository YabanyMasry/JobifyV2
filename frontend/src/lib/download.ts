import type { GenerationKind } from "../types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFilename(
  candidateName: string,
  company: string,
  kind: GenerationKind,
  ext: "md" | "pdf",
): string {
  const docLabel = kind === "cv" ? "CV" : "CoverLetter";
  const parts = [slugify(candidateName), slugify(company), docLabel].filter(Boolean);
  return `${parts.join("_") || docLabel}.${ext}`;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Helvetica", "Arial", sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  main { padding: 0.6in 0.7in; max-width: 8.5in; margin: 0 auto; }
  h1 { font-size: 20pt; margin: 0 0 4pt 0; font-weight: 700; }
  h2 {
    font-size: 12pt;
    margin: 16pt 0 4pt 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #999;
    padding-bottom: 2pt;
    font-weight: 700;
  }
  h3 { font-size: 11pt; margin: 8pt 0 2pt 0; font-weight: 700; }
  p { margin: 4pt 0; }
  ul, ol { margin: 4pt 0; padding-left: 18pt; }
  li { margin: 1pt 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: #1a4cd7; text-decoration: none; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
  @page { size: A4; margin: 0; }
  @media print {
    main { padding: 0.5in 0.7in; }
    a { color: #111; text-decoration: none; }
  }
`;

export function downloadPdf(htmlContent: string, title: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    alert("Please allow pop-ups to download as PDF.");
    return;
  }

  const safeTitle = title.replace(/[<>"'&]/g, "");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<main>${htmlContent}</main>
<script>
  window.addEventListener("load", function () {
    setTimeout(function () {
      window.print();
    }, 100);
  });
  window.addEventListener("afterprint", function () {
    window.close();
  });
</script>
</body>
</html>`);
  printWindow.document.close();
}
