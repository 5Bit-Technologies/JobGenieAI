// Browser-side text extraction for uploaded documents.
// Supports: .pdf, .docx, .doc (best-effort), .txt, .md, and other plain text.

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 60_000; // cap to keep AI prompts bounded

export interface ExtractedDoc {
  name: string;
  text: string;
  truncated: boolean;
}

function clip(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TEXT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_TEXT_CHARS), truncated: true };
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerMod = (await import(
    /* @vite-ignore */ "pdfjs-dist/build/pdf.worker.min.mjs?url"
  )) as { default: string };
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const maxPages = Math.min(pdf.numPages, 50);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        const it = item as { str?: string };
        return it.str ?? "";
      })
      .join(" ");
    out += pageText + "\n\n";
    if (out.length > MAX_TEXT_CHARS) break;
  }
  return out.trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = (await import("mammoth")) as unknown as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.trim();
}

async function extractText(file: File): Promise<string> {
  return (await file.text()).trim();
}

export async function extractDocument(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too big — please upload under 10 MB.");
  }

  const lower = file.name.toLowerCase();
  let raw = "";

  try {
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      raw = await extractPdf(file);
    } else if (lower.endsWith(".docx")) {
      raw = await extractDocx(file);
    } else if (lower.endsWith(".doc")) {
      // Old .doc isn't supported by mammoth — try as text fallback.
      raw = await extractText(file);
    } else if (
      lower.endsWith(".txt") ||
      lower.endsWith(".md") ||
      lower.endsWith(".rtf") ||
      file.type.startsWith("text/")
    ) {
      raw = await extractText(file);
    } else {
      // Last resort: try plain text decode.
      raw = await extractText(file);
    }
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `Couldn't read "${file.name}": ${e.message}`
        : `Couldn't read "${file.name}".`,
    );
  }

  if (!raw || raw.length < 5) {
    throw new Error(`No readable text found in "${file.name}".`);
  }

  const { text, truncated } = clip(raw);
  return { name: file.name, text, truncated };
}
