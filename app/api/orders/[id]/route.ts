import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData();
  const method = String(formData.getAll("_method").at(-1) || "delete");

  if (method !== "delete") {
    return NextResponse.json(
      { error: "Unsupported method for order route." },
      { status: 405 },
    );
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
