import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const SHIPPING_FEE = 10000;

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData();

  const customer_name = String(formData.get("customer_name") || "").trim();
  const productIds = formData.getAll("product_id").map(String).filter(Boolean);

  if (!customer_name || productIds.length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên khách hàng và chọn ít nhất 1 sản phẩm." },
      { status: 400 },
    );
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price")
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 400 });
  }

  const subtotal = productIds.reduce((sum, productId) => {
    const quantity = Number(formData.get(`quantity_${productId}`) || 1);
    const product = products?.find((item) => item.id === productId);
    return sum + (Number(product?.price) || 0) * quantity;
  }, 0);

  const shipping_fee = SHIPPING_FEE;
  const order_code = `OD-${Date.now()}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name,
      order_code,
      subtotal,
      shipping_fee,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message || "Không thể tạo đơn." },
      { status: 400 },
    );
  }

  const orderItems = productIds
    .map((productId) => {
      const quantity = Number(formData.get(`quantity_${productId}`) || 1);
      const product = products?.find((item) => item.id === productId);
      if (!product) return null;
      return {
        order_id: order.id,
        product_id: productId,
        quantity,
        unit_price: Number(product.price),
      };
    })
    .filter(
      (
        item,
      ): item is {
        order_id: any;
        product_id: string;
        quantity: number;
        unit_price: number;
      } => Boolean(item),
    );

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/order", request.url));
}
