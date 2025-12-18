const express = require("express");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

const router = express.Router();

/* CSV */
router.get("/export/csv", async (req, res) => {
  const Audit = req.app.get("Audit");
  const data = await Audit.find().lean();

  const parser = new Parser();
  const csv = parser.parse(data);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit.csv");
  res.send(csv);
});

/* XLSX */
router.get("/export/xlsx", async (req, res) => {
  const Audit = req.app.get("Audit");
  const data = await Audit.find().lean();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Audit");

  if (data.length) {
    ws.columns = Object.keys(data[0]).map((k) => ({
      header: k,
      key: k,
    }));
    data.forEach((row) => ws.addRow(row));
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=audit.xlsx");

  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
