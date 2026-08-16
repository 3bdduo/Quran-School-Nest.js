import { AlignmentType, BorderStyle, Document, Header, HeadingLevel, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

// ============================================================================
// دوال مشتركة لعمل ملفات Word احترافية بالعربي (اتجاه RTL، هيدر باسم المدرسة،
// عناوين ملونة، وجداول بحدود وألوان متبدلة للصفوف)
// ============================================================================
const BRAND_COLOR = "0F6B3E";
const BRAND_COLOR_LIGHT = "E9F7EF";

export function buildTitlePage(schoolName: string, reportTitle: string, subtitle?: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 100 },
      children: [new TextRun({ text: schoolName, bold: true, size: 40, color: BRAND_COLOR })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 100 },
      children: [new TextRun({ text: reportTitle, bold: true, size: 30 })],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [new TextRun({ text: subtitle, size: 22, color: "555555" })],
          }),
        ]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`, italics: true, size: 18, color: "888888" }),
      ],
    }),
  ];
}

export function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    spacing: { before: 300, after: 150 },
    border: { bottom: { color: BRAND_COLOR, space: 4, style: BorderStyle.SINGLE, size: 8 } },
    children: [new TextRun({ text, bold: true, size: 26, color: BRAND_COLOR })],
  });
}

export function buildTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { fill: BRAND_COLOR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
            }),
          ],
        }),
    ),
  });

  const dataRows = rows.map(
    (r, idx) =>
      new TableRow({
        children: r.map(
          (cellText) =>
            new TableCell({
              shading: idx % 2 === 0 ? { fill: BRAND_COLOR_LIGHT } : undefined,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                  children: [new TextRun({ text: String(cellText ?? ""), size: 20 })],
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

export function buildDocument(schoolName: string, children: (Paragraph | Table)[]): Document {
  return new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [new TextRun({ text: schoolName, bold: true, size: 18, color: BRAND_COLOR })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}
