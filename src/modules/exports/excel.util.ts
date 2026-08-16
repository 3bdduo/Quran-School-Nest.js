import * as ExcelJS from "exceljs";

// ============================================================================
// دوال مشتركة لعمل ملفات إكسل احترافية:
// - اتجاه الشيت من اليمين لليسار (RTL) عشان العربي يبان صح
// - هيدر باسم المدرسة ولونه مميز + تاريخ التصدير
// - تنسيق هيدر الجدول (خلفية ملونة + خط أبيض بولد) وحدود للخلايا
// ============================================================================
export function styleWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ rightToLeft: true }];
}

export function addReportHeader(
  worksheet: ExcelJS.Worksheet,
  schoolName: string,
  reportTitle: string,
  columnsCount: number,
) {
  worksheet.mergeCells(1, 1, 1, columnsCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = schoolName;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F6B3E" } };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells(2, 1, 2, columnsCount);
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = reportTitle;
  subtitleCell.font = { size: 13, bold: true, color: { argb: "FF0F6B3E" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 22;

  worksheet.mergeCells(3, 1, 3, columnsCount);
  const dateCell = worksheet.getCell(3, 1);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`;
  dateCell.font = { size: 10, italic: true, color: { argb: "FF666666" } };
  dateCell.alignment = { horizontal: "center" };
  worksheet.getRow(3).height = 18;

  worksheet.addRow([]);
}

export function styleTableHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16965A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
    };
  });
  row.height = 20;
}

export function styleDataRow(row: ExcelJS.Row, zebra: boolean) {
  row.eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFDDDDDD" } },
      left: { style: "thin", color: { argb: "FFDDDDDD" } },
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
      right: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
    if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3FBF6" } };
  });
}
