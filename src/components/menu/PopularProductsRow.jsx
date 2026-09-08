import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function PopularProductsRow({ products = [], onProductClick, isStoreOpen = true }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Pega os 7 produtos mais pedidos (ou os primeiros 7 disponíveis)
  const popularProducts = products
    .filter((p) => p.available !== false)
    .slice(0, 7);

  if (popularProducts.length === 0) return null;

  // Mouse Drag handlers
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 6) {
      setHasMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  return (
    <section className="space-y-3.5">
      {/* Cabeçalho limpo sem setas e sem badge */}
      <div>
        <h2
          className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2"
          style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
        >
          <span>Mais Pedidos</span>
          <span className="text-stone-500 text-sm font-semibold">({popularProducts.length})</span>
        </h2>
      </div>

      {/* Fileira com arrastar fluido no mouse e touch */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex gap-3.5 sm:gap-4 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {popularProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            whileHover={{ y: -3 }}
            className={`flex-shrink-0 w-36 sm:w-44 group cursor-pointer ${
              !isStoreOpen ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={() => {
              if (!hasMoved && isStoreOpen) {
                onProductClick(product);
              }
            }}
          >
            <div
              className="flex flex-col h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-800/90 group-hover:border-red-500/50 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-red-950/30 p-2 sm:p-2.5"
              style={{ background: "linear-gradient(180deg, #191311 0%, #110d0c 100%)" }}
            >
              {/* Imagem Quadrada */}
              <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900/90 border border-stone-800/60 pointer-events-none">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-stone-900">
                    🍔
                  </div>
                )}

                {/* Badge de Ranking */}
                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1">
                  <span className="text-amber-400">#{index + 1}</span>
                </div>

                {/* Botão flutuante rápido no mobile/hover */}
                <div className="absolute bottom-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
              </div>

              {/* Informações */}
              <div className="pt-2 sm:pt-2.5 px-1 flex flex-col flex-1 justify-between pointer-events-none">
                <h3
                  className="font-bold text-xs sm:text-sm text-stone-100 group-hover:text-red-400 transition-colors line-clamp-1 leading-snug"
                  style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  {product.name}
                </h3>
                
                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <span
                    className="font-black text-xs sm:text-sm text-red-500 tracking-tight"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  >
                    R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}
                  </span>
                  {product.totalSold > 0 && (
                    <span className="text-[10px] text-stone-400 font-medium">
                      {product.totalSold} {product.totalSold === 1 ? 'vendido' : 'vendidos'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
