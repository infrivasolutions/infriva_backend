import PDFDocument from "pdfkit";
import Quotation from "../models/Quotation.js";

export const downloadQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate(
      "client",
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const doc = new PDFDocument({
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `inline; filename=${quotation.quotationNo}.pdf`,
    );

    doc.pipe(res);

    // Company

    doc.fontSize(28).fillColor("#6D28D9").text("Infriva Solutions");

    doc.fontSize(10).fillColor("#555").text("www.infrivasolutions.com");

    doc.moveDown();

    doc.fontSize(22).fillColor("#111").text("QUOTATION");

    doc.moveDown();

    doc.text(`Quotation : ${quotation.quotationNo}`);
    doc.text(
      `Client : ${quotation.client.companyName || quotation.client.clientName}`,
    );
    doc.text(`Date : ${quotation.createdAt.toLocaleDateString()}`);
    doc.text(`Valid Till : ${quotation.validTill?.toLocaleDateString()}`);

    doc.moveDown();

    quotation.items.forEach((item) => {
      doc.text(item.title, {
        continued: true,
      });

      doc.text(`₹${item.price}`, {
        align: "right",
      });

      if (item.description) {
        doc.fontSize(10).fillColor("#666").text(item.description);

        doc.fontSize(12).fillColor("#111");
      }

      doc.moveDown();
    });

    doc.moveDown();

    doc.text(`Subtotal : ₹${quotation.subTotal}`);

    doc.text(`Discount : ₹${quotation.discount}`);

    doc.text(`GST : ₹${quotation.tax}`);

    doc.moveDown();

    doc
      .fontSize(18)
      .fillColor("#6D28D9")
      .text(`Grand Total : ₹${quotation.totalAmount}`);

    doc.moveDown(2);

    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Thank you for choosing Infriva Solutions.");

    doc.end();
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "PDF generation failed",
    });
  }
};
