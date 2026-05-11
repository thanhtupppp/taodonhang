import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_items(quantity, product_id, products(name))")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = new Map<string, { product_name: string; quantity: number }>();

  for (const order of orders || []) {
    for (const item of order.order_items || []) {
      const productName = item.products?.name ?? "";
      const current = summary.get(item.product_id) ?? {
        product_name: productName,
        quantity: 0,
      };
      current.quantity += Number(item.quantity || 0);
      summary.set(item.product_id, current);
    }
  }

  return NextResponse.json({
    data: Array.from(summary.entries()).map(([product_id, value]) => ({
      product_id,
      ...value,
    })),
  });
}
