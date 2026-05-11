import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { existsSync, readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function formatVnd(value: number) {
  return currencyFormatter.format(value);
}

function createPdfDocument() {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const fontPath = join(process.cwd(), "public", "fonts", "NotoSans.ttf");

  if (!existsSync(fontPath)) {
    throw new Error(`Missing font file at ${fontPath}`);
  }

  doc.registerFont("NotoSans", readFileSync(fontPath));
  doc.font("NotoSans");
  return doc;
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*))")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const doc = createPdfDocument();
    const pdf = doc as any;
    const chunks: Buffer[] = [];

    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve) => {
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
    });

    pdf.fontSize(18).text("Các Đơn Đã Đặt", { align: "center" });
    pdf.moveDown(1);

    (orders || []).forEach((order: any, index: number) => {
      const startX = pdf.page.margins.left;
      const contentWidth =
        pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
      const headerHeight = 30;
      const startY = pdf.y;
      const itemIndent = 16;
      const blockGap = 16;

      pdf
        .fillColor("#f8fafc")
        .rect(startX, startY, contentWidth, headerHeight)
        .fill();
      pdf
        .strokeColor("#cbd5e1")
        .rect(startX, startY, contentWidth, headerHeight)
        .stroke();

      pdf
        .fillColor("#000")
        .fontSize(12)
        .text(`${index + 1}. ${order.customer_name}`, startX + 10, startY + 8, {
          width: contentWidth - 20,
        });

      pdf.y = startY + headerHeight + 8;
      pdf.fontSize(10).fillColor("#555");
      pdf.text(`Tạm tính: ${formatVnd(Number(order.subtotal || 0))}`);
      pdf.text(`Phí ship: ${formatVnd(Number(order.shipping_fee || 0))}`);
      pdf.text(`Tổng cộng: ${formatVnd(Number(order.total_amount || 0))}`);
      pdf.moveDown(0.5);

      pdf.fontSize(10).fillColor("#000");
      for (const item of order.order_items || []) {
        pdf.text(
          `${item.products?.name ?? ""}: ${item.quantity} x ${formatVnd(Number(item.unit_price))}`,
          { indent: itemIndent },
        );
      }

      pdf.moveDown(0.8);
      pdf
        .moveTo(startX, pdf.y)
        .lineTo(startX + contentWidth, pdf.y)
        .strokeColor("#e2e8f0")
        .stroke();

      pdf.moveDown(1);
      if (pdf.y > pdf.page.height - pdf.page.margins.bottom - 80) {
        pdf.addPage();
      } else {
        pdf.moveDown(blockGap / 10);
      }
    });

    pdf.end();
    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="orders-export.pdf"',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
