import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { existsSync, readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

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
      .select("order_items(quantity, product_id, products(name))")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const summary = new Map<
      string,
      { product_name: string; quantity: number }
    >();

    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        const productRecord = Array.isArray(item.products)
          ? item.products[0]
          : item.products;
        const productName = productRecord?.name ?? "";
        const current = summary.get(item.product_id) ?? {
          product_name: productName,
          quantity: 0,
        };
        current.quantity += Number(item.quantity || 0);
        summary.set(item.product_id, current);
      }
    }

    const doc = createPdfDocument();
    const pdf = doc as any;
    const chunks: Buffer[] = [];

    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve) => {
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
    });

    pdf.fontSize(18).text("Tổng hợp sản phẩm cần đặt", { align: "center" });
    pdf.moveDown(1);

    const startX = pdf.page.margins.left;
    const tableWidth =
      pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
    const qtyColWidth = 90;
    const nameColWidth = tableWidth - qtyColWidth;
    const rowHeight = 28;
    let currentY = pdf.y;

    pdf.fontSize(11).fillColor("#000");
    pdf
      .rect(startX, currentY, tableWidth, rowHeight)
      .fillAndStroke("#e2e8f0", "#cbd5e1");
    pdf.fillColor("#000");
    pdf.text("Tên sản phẩm", startX + 10, currentY + 8, {
      width: nameColWidth - 16,
      align: "left",
    });
    pdf.text("Số lượng", startX + nameColWidth, currentY + 8, {
      width: qtyColWidth - 10,
      align: "center",
    });

    currentY += rowHeight;

    for (const value of summary.values()) {
      if (currentY + rowHeight > pdf.page.height - pdf.page.margins.bottom) {
        pdf.addPage();
        currentY = pdf.page.margins.top;
      }

      pdf.rect(startX, currentY, tableWidth, rowHeight).stroke("#cbd5e1");
      pdf.text(
        value.product_name || "(Không rõ tên sản phẩm)",
        startX + 10,
        currentY + 8,
        {
          width: nameColWidth - 16,
          align: "left",
        },
      );
      pdf.text(String(value.quantity), startX + nameColWidth, currentY + 8, {
        width: qtyColWidth - 10,
        align: "center",
      });

      currentY += rowHeight;
    }

    pdf.end();
    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="product-summary.pdf"',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
