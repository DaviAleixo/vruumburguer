import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function PDVProductGrid({ products, categories, onAddToCart }) {
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
    <div className="flex flex-col h-full">
      {/* Header com busca */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">🧾 PDV Balcão</h1>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === "all"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filtered.map((product) => {
            const isFlashing = flashItems.has(product.id);
            return (
              <motion.button
                key={product.id}
                onClick={() => handleAdd(product)}
                whileTap={{ scale: 0.93 }}
                className={`bg-white rounded-xl text-left shadow-sm border-2 transition-all duration-200 hover:shadow-md overflow-hidden ${
                  isFlashing
                    ? "border-green-500 bg-green-50 shadow-green-200 shadow-md"
                    : "border-transparent hover:border-red-200"
                }`}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-28 object-cover"
                  />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-4xl">
                    🍽️
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-red-600 font-bold text-base mt-1">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </p>
                  {isFlashing && (
                    <p className="text-xs text-green-600 font-semibold mt-1">✓ Adicionado!</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-medium">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}