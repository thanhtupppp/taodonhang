import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function formatVnd(value: number) {
  return currencyFormatter.format(value);
}

async function getProductSummary() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("orders")
    .select("order_items(quantity, product_id, products(name))")
    .order("created_at", { ascending: false });

  const summary = new Map<string, { product_name: string; quantity: number }>();

  for (const order of data || []) {
    for (const item of order.order_items || []) {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;
      const productName = product?.name ?? "";
      const current = summary.get(item.product_id) ?? {
        product_name: productName,
        quantity: 0,
      };
      current.quantity += Number(item.quantity || 0);
      summary.set(item.product_id, current);
    }
  }

  return Array.from(summary.entries()).map(([product_id, value]) => ({
    product_id,
    ...value,
  }));
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const serviceSupabase = createSupabaseServiceClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/admin/login");

  const [{ data: products }, { data: orders }, productSummary] =
    await Promise.all([
      serviceSupabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
      serviceSupabase
        .from("orders")
        .select("*, order_items(*, products(*))")
        .order("created_at", { ascending: false }),
      getProductSummary(),
    ]);

  return (
    <main className="container admin-shell">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1 className="page-title">Quản lý sản phẩm và đơn hàng</h1>
        </div>
        <div className="admin-toolbar-actions">
          <a className="btn btn-secondary" href="/api/orders/export/csv">
            Xuất CSV
          </a>
          <a className="btn btn-secondary" href="/api/orders/export/pdf">
            Xuất PDF
          </a>
          <a
            className="btn btn-secondary"
            href="/api/orders/summary/export/csv"
          >
            Xuất tổng hợp CSV
          </a>
          <a
            className="btn btn-secondary"
            href="/api/orders/summary/export/pdf"
          >
            Xuất tổng hợp PDF
          </a>
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary" type="submit">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>

      <section className="grid admin-grid">
        <div className="card card-pad span-6">
          <h2 className="section-title">Sản phẩm</h2>
          <div className="admin-card-stack">
            <form className="stack" action="/api/products" method="post">
              <input
                className="input"
                name="name"
                placeholder="Tên sản phẩm"
                required
              />
              <input
                className="input"
                name="price"
                type="number"
                placeholder="Giá"
                required
              />
              <button className="btn btn-primary" type="submit">
                Thêm sản phẩm
              </button>
            </form>

            <div className="admin-list">
              {(products || []).map((product) => (
                <form
                  key={product.id}
                  className="admin-row admin-row-form"
                  action={`/api/products/${product.id}`}
                  method="post"
                >
                  <input type="hidden" name="_method" value="patch" />
                  <input
                    className="input"
                    name="name"
                    defaultValue={product.name}
                    placeholder="Tên sản phẩm"
                    required
                  />
                  <input
                    className="input"
                    name="price"
                    type="number"
                    defaultValue={Number(product.price)}
                    placeholder="Giá"
                    required
                  />
                  <div className="admin-row-actions">
                    <button className="btn btn-primary" type="submit">
                      Sửa
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="submit"
                      name="_method"
                      value="delete"
                      formNoValidate
                    >
                      Xoá
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        </div>

        <div className="card card-pad span-6">
          <h2 className="section-title">Tổng hợp sản phẩm đã bán</h2>
          <div className="summary-list card card-pad summary-card">
            {productSummary.length === 0 ? (
              <p className="small">Chưa có dữ liệu tổng hợp.</p>
            ) : (
              productSummary.map((item) => (
                <div key={item.product_id} className="summary-row">
                  <span>{item.product_name}</span>
                  <strong>{item.quantity}</strong>
                </div>
              ))
            )}
          </div>

          <h2 className="section-title" style={{ marginTop: 24 }}>
            Danh sách đơn hàng
          </h2>
          <div className="admin-list">
            {(orders || []).map((order) => (
              <div
                key={order.id}
                className="admin-order card card-pad order-detail-card"
              >
                <div className="admin-row">
                  <div>
                    <strong>{order.order_code}</strong>
                    <div className="small">{order.customer_name}</div>
                  </div>
                  <span className={`badge badge-${order.status}`}>
                    {order.status}
                  </span>
                </div>

                <div className="order-detail-summary">
                  <div className="summary-row">
                    <span>Tạm tính</span>
                    <strong>{formatVnd(Number(order.subtotal || 0))}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Phí ship</span>
                    <strong>
                      {formatVnd(Number(order.shipping_fee || 0))}
                    </strong>
                  </div>
                  <div className="summary-row summary-total">
                    <span>Tổng cộng</span>
                    <strong>
                      {formatVnd(Number(order.total_amount || 0))}
                    </strong>
                  </div>
                </div>

                <div className="admin-order-items">
                  {(order.order_items || []).map((item: any) => (
                    <div key={item.id} className="admin-order-item">
                      <div>
                        <strong>{item.products?.name}</strong>
                        <div className="small">
                          {formatVnd(Number(item.unit_price))} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  action={`/api/orders/${order.id}/status`}
                  method="post"
                  className="status-form"
                >
                  <select
                    name="status"
                    className="select"
                    defaultValue={order.status}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="shipping">shipping</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button className="btn btn-primary" type="submit">
                    Cập nhật
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
