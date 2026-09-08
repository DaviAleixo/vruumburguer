import React from "react";
import { Plus, Minus, Trash2, ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Cart({ cart, updateQuantity, onCheckout, deliveryFee, isVisible, onToggle }) {
  const getSubtotal = () =>
    cart.reduce((total, item) => {
      const additionalsTotal = item.additionals.reduce((sum, ad) => sum + ad.price, 0);
      return total + (item.price + additionalsTotal) * item.quantity;
    }, 0);

  const subtotal = getSubtotal();
  const total = subtotal + deliveryFee;
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const btnStyle = {
    background: 'linear-gradient(135deg, hsl(4,80%,44%), hsl(4,80%,38%))',
    boxShadow: '0 6px 20px hsla(4,80%,42%,0.32)',
  };

  // Botão flutuante
  if (!isVisible && cart.length > 0) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-7 pt-3"
        style={{ background: 'linear-gradient(to top, #0d0a09 75%, transparent)' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={onToggle}
            className="w-full text-white flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={btnStyle}
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-[11px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center" style={{ color: 'hsl(4,80%,42%)' }}>
                  {itemCount}
                </span>
              </div>
              <span className="font-bold text-sm tracking-tight">Ver Carrinho</span>
            </div>
            <span className="font-extrabold text-sm bg-white/20 px-3.5 py-1.5 rounded-xl">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      </motion.div>
    );
  }

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 260 }}
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
      style={{ background: '#fff', boxShadow: '0 -8px 40px hsla(20,10%,10%,0.14)', maxHeight: '85vh' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-9 h-1 rounded-full" style={{ background: 'hsl(36,12%,88%)' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid hsl(36,12%,93%)' }}>
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="w-4 h-4" style={{ color: 'hsl(4,80%,42%)' }} />
          <span className="font-bold text-base" style={{ color: 'hsl(20,10%,10%)', letterSpacing: '-0.015em' }}>
            Carrinho
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'hsl(4,80%,96%)', color: 'hsl(4,80%,42%)' }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'hsl(36,14%,93%)' }}
        >
          <X className="w-3.5 h-3.5" style={{ color: 'hsl(20,10%,40%)' }} />
        </button>
      </div>

      {/* Itens */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 188px)' }}>
        {cart.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-bold text-sm" style={{ color: 'hsl(20,10%,25%)' }}>Carrinho vazio</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(20,8%,55%)' }}>Adicione produtos para continuar</p>
          </div>
        ) : (
          <div className="p-4 space-y-2.5">
            <AnimatePresence>
              {cart.map((item, index) => (
                <motion.div
                  key={item.cartItemId || `cart-item-${item.id || index}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: 'hsl(36,20%,97%)', border: '1px solid hsl(36,12%,91%)' }}
                >
                  <div className="w-13 h-13 rounded-xl overflow-hidden flex-shrink-0" style={{ width: '52px', height: '52px', background: 'hsl(36,14%,91%)' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: 'hsl(20,10%,10%)' }}>{item.name}</p>
                    {item.additionals && item.additionals.length > 0 && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(20,8%,55%)' }}>{item.additionals.map(ad => ad.name).join(', ')}</p>
                    )}
                    <p className="font-extrabold text-sm mt-1" style={{ color: 'hsl(4,80%,42%)' }}>
                      R$ {((item.price + (item.additionals || []).reduce((s, a) => s + (a.price || 0), 0)) * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-0.5 rounded-xl p-1 flex-shrink-0" style={{ background: '#fff', border: '1px solid hsl(36,12%,90%)' }}>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50 cursor-pointer"
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                    >
                      {item.quantity === 1
                        ? <Trash2 className="w-3 h-3" style={{ color: 'hsl(4,80%,42%)' }} />
                        : <Minus className="w-3 h-3" style={{ color: 'hsl(20,10%,40%)' }} />
                      }
                    </button>
                    <span className="min-w-[1.4rem] text-center font-extrabold text-sm" style={{ color: 'hsl(20,10%,10%)' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50 cursor-pointer"
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" style={{ color: 'hsl(20,10%,40%)' }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="px-5 py-4" style={{ borderTop: '1px solid hsl(36,12%,93%)', background: '#fff' }}>
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm" style={{ color: 'hsl(20,8%,52%)' }}>
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm" style={{ color: 'hsl(20,8%,52%)' }}>
                <span>Taxa de entrega</span>
                <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div
              className="flex justify-between font-extrabold text-base pt-2 mt-1"
              style={{ color: 'hsl(20,10%,10%)', borderTop: '1px solid hsl(36,12%,91%)' }}
            >
              <span>Total</span>
              <span style={{ color: 'hsl(4,80%,42%)' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full text-white font-bold py-4 rounded-2xl text-sm tracking-tight transition-all active:scale-[0.98]"
            style={btnStyle}
          >
            Finalizar Pedido →
          </button>
        </div>
      )}
    </motion.div>
  );
}