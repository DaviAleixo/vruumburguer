import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { Category } from "@/entities/Category";
import { Order } from "@/entities/Order";
import PDVProductGrid from "../components/pdv/PDVProductGrid";
import PDVCart from "../components/pdv/PDVCart";
import PDVPaymentModal from "../components/pdv/PDVPaymentModal";

// Som ao adicionar item
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
};

export default function PDVPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        Product.filter({ available: true }),
        Category.list("order_index"),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (_error) {
      console.error("Erro ao carregar dados no PDV:", _error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product) => {
    playBeep();
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleFinalize = async (paymentMethod) => {
    const orderData = {
      customer_name: customerName.trim() || "Balcão",
      customer_phone: "-",
      total_amount: total,
      status: "confirmado",
      payment_method: paymentMethod,
      order_type: "pickup",
      table_number: "Balcão",
      items: cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.qty,
        subtotal: item.price * item.qty,
        additionals: [],
      })),
    };

    const created = await Order.create(orderData);
    setLastOrder(created);
    clearCart();
    setShowPayment(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando PDV...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Grade de Produtos */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <PDVProductGrid
          products={products}
          categories={categories}
          onAddToCart={addToCart}
        />
      </div>

      {/* Carrinho Lateral */}
      <PDVCart
        cart={cart}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        onFinalize={() => setShowPayment(true)}
        total={total}
        lastOrder={lastOrder}
        onDismissSuccess={() => setLastOrder(null)}
      />

      {/* Modal de Pagamento */}
      {showPayment && (
        <PDVPaymentModal
          total={total}
          onConfirm={handleFinalize}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}