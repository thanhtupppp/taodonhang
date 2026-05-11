"use client";

import { useMemo, useRef, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
};

type SelectedProduct = Product & {
  quantity: number;
};

const SHIP_FEE = 10000;

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function formatVnd(value: number) {
  return currencyFormatter.format(value);
}

export default function OrderForm({ products }: { products: Product[] }) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<SelectedProduct[]>([]);

  const selectedIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items],
  );

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedIds.has(product.id)) return false;
      if (!query) return true;
      return product.name.toLowerCase().includes(query);
    });
  }, [products, searchTerm, selectedIds]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      ),
    [items],
  );

  const shippingFee = items.length > 0 ? SHIP_FEE : 0;
  const total = subtotal + shippingFee;

  const focusSearch = () => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const addProduct = (productId: string) => {
    if (!productId || selectedIds.has(productId)) return;
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setItems((current) => [...current, { ...product, quantity: 1 }]);
    setSearchTerm("");
    focusSearch();
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const removeProduct = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    focusSearch();
  };

  return (
    <form className="card card-pad stack" action="/api/orders" method="post">
      <div>
        <h2 className="section-title">Thông tin khách hàng</h2>
      </div>

      <input
        className="input"
        name="customer_name"
        placeholder="Tên khách hàng"
        required
        value={customerName}
        onChange={(event) => setCustomerName(event.target.value)}
      />

      <div>
        <h2 className="section-title">Chọn sản phẩm</h2>
      </div>

      <div className="product-picker product-picker-searchable">
        <input
          ref={searchInputRef}
          className="input"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm sản phẩm..."
          aria-label="Tìm sản phẩm"
        />

        <div
          className="picker-results"
          role="listbox"
          aria-label="Danh sách sản phẩm"
        >
          {filteredProducts.length === 0 ? (
            <div className="picker-empty small">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                className="picker-option"
                type="button"
                onClick={() => addProduct(product.id)}
              >
                <div className="picker-option-main">
                  <strong>{product.name}</strong>
                  <div className="small">
                    {formatVnd(Number(product.price))}
                  </div>
                </div>
                <span className="picker-option-action">Chọn</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="selected-product-list">
        {items.length === 0 ? (
          <p className="small">Chưa có sản phẩm nào được chọn.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="selected-product-row">
              <div className="product-info">
                <div>
                  <strong>{item.name}</strong>
                  <div className="small">{formatVnd(Number(item.price))}</div>
                </div>
              </div>

              <div className="quantity-field">
                <span className="quantity-label">Số lượng</span>
                <input
                  className="input quantity-input"
                  type="number"
                  name={`quantity_${item.id}`}
                  min="0.5"
                  step="0.5"
                  value={item.quantity}
                  onChange={(event) =>
                    updateQuantity(item.id, Number(event.target.value))
                  }
                />
              </div>

              <button
                className="btn btn-secondary remove-product-button"
                type="button"
                onClick={() => removeProduct(item.id)}
              >
                Xoá
              </button>

              <input type="hidden" name="product_id" value={item.id} />
            </div>
          ))
        )}
      </div>

      <div className="order-summary card card-pad">
        <div className="summary-row">
          <span>Tạm tính</span>
          <strong>{formatVnd(subtotal)}</strong>
        </div>
        <div className="summary-row">
          <span>Phí ship</span>
          <strong>
            {items.length > 0 ? formatVnd(shippingFee) : formatVnd(0)}
          </strong>
        </div>
        <div className="summary-row summary-total">
          <span>Tổng cộng</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>

      <button
        className="btn btn-primary"
        type="submit"
        disabled={items.length === 0}
      >
        Đặt hàng
      </button>
    </form>
  );
}
