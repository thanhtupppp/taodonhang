import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const supabase = createSupabaseServiceClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    [
      "order_code",
      "customer_name",
      "status",
      "subtotal",
      "shipping_fee",
      "total_amount",
      "created_at",
      "product_name",
      "quantity",
      "unit_price",
      "line_total",
    ],
  ];

  for (const order of orders || []) {
    for (const item of order.order_items || []) {
      rows.push([
        order.order_code,
        order.customer_name,
        order.status,
        order.subtotal,
        order.shipping_fee,
        order.total_amount,
        order.created_at,
        item.products?.name ?? "",
        item.quantity,
        item.unit_price,
        Number(item.quantity) * Number(item.unit_price),
      ]);
    }
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orders-export.csv"',
    },
  });
}
