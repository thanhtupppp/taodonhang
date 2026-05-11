import { createSupabaseServerClient } from "@/lib/supabase-server";
import OrderForm from "./order-form";

export default async function OrderPage() {
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="container order-shell">
      <div className="card card-pad">
        <p className="eyebrow">Hi</p>
        <h1 className="page-title">Đặt hàng</h1>
        <p className="lead">
          Khách chỉ cần nhập tên, chọn sản phẩm và số lượng.
        </p>
      </div>

      <OrderForm products={products || []} />
    </main>
  );
}
