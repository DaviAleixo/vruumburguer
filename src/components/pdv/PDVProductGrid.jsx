import React, { useState } from "react";
import { Search, ShoppingCart, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PDVProductGrid({ 
  products, 
  categories, 
  onAddToCart,
  cartCount = 0,
  onOpenMobileCart,
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [flashItems, setFlashItems] = useState(new Set());

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const matchCat =
      activeCategory === "all" ||
      p.category === activeCategory ||
      p.category_id === activeCategory ||
      categories.find((c) => c.id === activeCategory)?.name === p.category;

    return matchSearch && matchCat;
  });

  const handleAdd = (product) => {
    onAddToCart(product);
    // Flash visual de feedback
    setFlashItems((prev) => new Set([...prev, product.id]));
    setTimeout(() => {
      setFlashItems((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 400);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header com busca */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 tracking-tight whitespace-nowrap">
              🧾 PDV Balcão
            </h1>
            <Link to={createPageUrl("PDVOrders")} className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-600 hover:text-gray-900 gap-1">
                <History className="w-3.5 h-3.5" />
                <span>Histórico</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-lg"
              />
            </div>

            {/* Botão Carrinho para telas pequenas */}
            <button
              onClick={onOpenMobileCart}
              className="lg:hidden relative flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0 shadow-xs cursor-pointer"
              title="Abrir Carrinho"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-stone-900 font-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === "all"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 pb-16 lg:pb-0">
          {filtered.map((product) => {
            const isFlashing = flashItems.has(product.id);
            return (
              <motion.button
                key={product.id}
                onClick={() => handleAdd(product)}
                whileTap={{ scale: 0.95 }}
                className={`bg-white rounded-xl text-left shadow-xs border transition-all duration-150 hover:shadow-md overflow-hidden flex flex-col cursor-pointer ${
                  isFlashing
                    ? "border-emerald-500 bg-emerald-50 shadow-emerald-200 shadow-md ring-2 ring-emerald-400"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-24 sm:h-28 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-full h-24 sm:h-28 bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                    🍔
                  </div>
                )}
                <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-red-600 font-black text-sm sm:text-base">
                      R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}
                    </p>
                    {isFlashing && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                        ✓ Adicionado
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl sm:text-5xl mb-2 sm:mb-3">🔍</p>
            <p className="font-semibold text-sm sm:text-base text-gray-600">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}