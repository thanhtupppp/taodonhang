import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData();
  const method = String(formData.getAll("_method").at(-1) || "patch");

  if (method === "delete") {
    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("product_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const payload = {
    name: String(formData.get("name") || "").trim(),
    price: Number(formData.get("price") || 0),
  };

  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
