import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { Plus, Flame } from "lucide-react";

const ProductCard = forwardRef(function ProductCard(
  { product, onProductClick, isStoreOpen = true, isPopular = false },
  ref
) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={`group cursor-pointer w-full select-none ${!isStoreOpen ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={() => isStoreOpen && onProductClick(product)}
    >
      <div 
        className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-stone-800/90 hover:border-red-500/50 shadow-md hover:shadow-xl hover:shadow-red-950/20 transition-all duration-200 active:scale-[0.99] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #181210 0%, #120e0d 100%)' }}
      >
        {/* Lado Esquerdo: Textos e Preço */}
        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between self-stretch py-0.5">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 
                className="font-extrabold text-sm sm:text-base text-stone-100 group-hover:text-red-400 transition-colors line-clamp-1"
                style={{ letterSpacing: '-0.015em', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {product.name}
              </h3>
              {(isPopular || product.popular) && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded-md">
                  <Flame className="w-2.5 h-2.5 fill-red-400" />
                  Top
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed line-clamp-2 mt-1 font-normal">
                {product.description}
              </p>
            )}
          </div>

          <div className="pt-2 mt-auto">
            <span 
              className="font-black text-sm sm:text-base text-red-500 tracking-tight"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Lado Direito: Imagem Quadrada com Botão + com dimensões fixas garantidas */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 min-w-[96px] min-h-[96px] max-w-[96px] max-h-[96px] sm:min-w-[112px] sm:min-h-[112px] sm:max-w-[112px] sm:max-h-[112px] flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900 border border-stone-800/80 shadow-inner">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 block"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl bg-stone-900">🍔</div>
          )}

          {/* Botão flutuante + */}
          <button
            type="button"
            className="absolute bottom-1.5 right-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 group-hover:bg-red-500 active:scale-90 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-950/60 pointer-events-none"
            aria-label="Adicionar produto"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;