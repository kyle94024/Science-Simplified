import { NextResponse } from "next/server";
import mammoth from "mammoth";

// Map Word styles to apicss classes (and standard semantic tags) for our editor.
// Falls back to plain semantic HTML for any unmapped styles.
const STYLE_MAP = [
  // Paragraphs
  "p[style-name='Normal'] => p.apicss-paragraph:fresh",
  "p[style-name='Body Text'] => p.apicss-paragraph:fresh",
  "p[style-name='Body Text 2'] => p.apicss-paragraph:fresh",
  "p[style-name='Body Text 3'] => p.apicss-paragraph:fresh",
  "p[style-name='Default Paragraph Font'] => p.apicss-paragraph:fresh",

  // Headings
  "p[style-name='Title'] => h1.apicss-heading-primary:fresh",
  "p[style-name='Heading 1'] => h1.apicss-heading-primary:fresh",
  "p[style-name='heading 1'] => h1.apicss-heading-primary:fresh",
  "p[style-name='Heading 2'] => h2.apicss-heading-secondary:fresh",
  "p[style-name='heading 2'] => h2.apicss-heading-secondary:fresh",
  "p[style-name='Heading 3'] => h3.apicss-heading-tertiary:fresh",
  "p[style-name='heading 3'] => h3.apicss-heading-tertiary:fresh",
  "p[style-name='Heading 4'] => h4.apicss-heading-tertiary:fresh",
  "p[style-name='Subtitle'] => h2.apicss-heading-secondary:fresh",

  // Quotes
  "p[style-name='Quote'] => blockquote.apicss-blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote.apicss-blockquote > p:fresh",

  // Inline formatting
  "b => strong.apicss-strong",
  "i => em.apicss-em",
  "u => span.apicss-underline",
  "strike => s",

  // Captions
  "p[style-name='Caption'] => figcaption.apicss-caption:fresh",
];

const OPTIONS = {
  styleMap: STYLE_MAP,
  // Strip empty paragraphs
  ignoreEmptyParagraphs: true,
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const filename = file.name || "";
    if (!filename.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { success: false, message: "File must be a .docx" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract HTML and plain text. Plain text useful for the summary field
    // if the document is short.
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ buffer }, OPTIONS),
      mammoth.extractRawText({ buffer }),
    ]);

    return NextResponse.json({
      success: true,
      html: htmlResult.value,
      text: textResult.value,
      messages: htmlResult.messages.map((m) => ({
        type: m.type,
        message: m.message,
      })),
    });
  } catch (err) {
    console.error("Error importing docx:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to import docx" },
      { status: 500 }
    );
  }
}
