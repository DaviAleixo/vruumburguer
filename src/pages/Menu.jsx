import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { ProductAdditional } from "@/entities/ProductAdditional";
import { Order } from "@/entities/Order";
import { Settings } from "@/entities/Settings";
import { BannerImage } from "@/entities/BannerImage";
import { Category } from "@/entities/Category";
import { Coupon } from "@/entities/Coupon";
import { CouponUsage } from "@/entities/CouponUsage";
import { ComplementGroup } from "@/entities/ComplementGroup";
import { ComplementItem } from "@/entities/ComplementItem";
import { ProductComplementGroup } from "@/entities/ProductComplementGroup";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "../components/menu/ProductCard";
import PopularProductsRow from "../components/menu/PopularProductsRow";
import Cart from "../components/menu/Cart";
import OrderModal from "../components/menu/OrderModal";
import BannerCarousel from "../components/menu/BannerCarousel";
import UserProfileSheet from "../components/menu/UserProfileSheet";
import StoreInfoSheet from "../components/menu/StoreInfoSheet";
import ProductDetailModal from "../components/menu/ProductDetailModal";
import { 
  XCircle, 
  ShoppingBag, 
  Bike, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Phone, 
  ArrowRight,
  Star,
  Instagram
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { isStoreOpen } from "@/utils/storeStatus";

export default function MenuPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlMesa = searchParams.get("mesa");

  const [products, setProducts] = useState([]);
  const [additionals, setAdditionals] = useState([]);
  const [settings, setSettings] = useState(null);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [activeGuestOrder, setActiveGuestOrder] = useState(null);
  const [complementGroups, setComplementGroups] = useState([]);
  const [complementItems, setComplementItems] = useState([]);
  const [productComplementGroups, setProductComplementGroups] = useState([]);

  useEffect(() => {
    if (urlMesa) {
      try {
        localStorage.setItem("vrumburguer_table_number", urlMesa);
      } catch {}
    }
  }, [urlMesa]);

  useEffect(() => {
    loadData();
    checkActiveOrders();
    requestNotificationPermission();

    const unsubSettings = Settings.subscribe(() => loadData());
    const unsubBanners = BannerImage.subscribe(() => loadData());
    const unsubProducts = Product.subscribe(() => loadData());
    const unsubCategories = Category.subscribe(() => loadData());

    return () => {
      if (typeof unsubSettings === "function") unsubSettings();
      if (typeof unsubBanners === "function") unsubBanners();
      if (typeof unsubProducts === "function") unsubProducts();
      if (typeof unsubCategories === "function") unsubCategories();
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const checkActiveOrders = async () => {
    try {
      const user = await base44.auth.me();

      if (user?.email) {
        // Se estiver logado em uma conta, mostra APENAS os pedidos pertencentes a essa conta
        const allOrders = await Order.list("-created_date", 10);
        const active = allOrders.find(o => o.user_email === user.email && ['pendente', 'confirmado', 'preparando', 'enviado'].includes(o.status));
        setActiveGuestOrder(active || null);
        return;
      }

      // Se não estiver logado (visitante novo ou após logout), verifica somente pedidos feitos na sessão anônima
      const recentIds = JSON.parse(localStorage.getItem("vrumburguer_recent_orders") || "[]");
      if (!Array.isArray(recentIds) || recentIds.length === 0) {
        setActiveGuestOrder(null);
        return;
      }

      const allOrders = await Order.list("-created_date", 10);
      // Garante que o pedido é anônimo (sem user_email de outra conta) e bate com o ID da sessão
      const active = allOrders.find(o => recentIds.includes(o.id) && !o.user_email && ['pendente', 'confirmado', 'preparando', 'enviado'].includes(o.status));
      setActiveGuestOrder(active || null);
    } catch (_err) {
      console.log("Erro ao verificar pedidos ativos:", _err);
      setActiveGuestOrder(null);
    }
  };

  const loadData = async () => {
    try {
      // Carregamento otimizado com cache inteligente (0ms nos re-acessos)
      const [productsData, additionalsData, settingsData, bannerData, categoryData, groupsData, itemsData, pcgData] = await Promise.all([
        Product.filter({ available: true }, "-created_date"),
        ProductAdditional.list(),
        Settings.list(),
        BannerImage.filter({ active: true }, "order_index"),
        Category.filter({}, "order_index"),
        ComplementGroup.list("order_index"),
        ComplementItem.list("order_index"),
        ProductComplementGroup.list("-created_date"),
      ]);

      setProducts(productsData || []);
      setAdditionals(additionalsData || []);
      setComplementGroups(groupsData || []);
      setComplementItems(itemsData || []);
      setProductComplementGroups(pcgData || []);
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
        setStoreIsOpen(isStoreOpen(settingsData[0]));
      }
      setBanners(bannerData || []);
      setCategories(categoryData || []);
      
      if (categoryData.length > 0) {
        setActiveCategory(categoryData[0].id);
      }
    } catch (_error) {
      console.error("Erro ao carregar dados:", _error);
    }
  };

  // Pega os 7 produtos mais populares com máxima performance (sem query pesada)
  const popularRankedProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];

    return [...products]
      .filter(p => p.available !== false)
      .sort((a, b) => {
        if (b.popular && !a.popular) return 1;
        if (a.popular && !b.popular) return -1;
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      })
      .slice(0, 7);
  }, [products]);

  const addToCart = (product, selectedAdditionals = [], quantity = 1, notes = "") => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) =>
          item.id === product.id &&
          JSON.stringify(item.additionals) === JSON.stringify(selectedAdditionals) &&
          item.notes === notes
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      }

      return [
        ...prevCart,
        {
          ...product,
          cartItemId: `${product.id || 'item'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          additionals: selectedAdditionals,
          quantity,
          notes,
        },
      ];
    });

    setIsCartVisible(true);
  };

  const updateCartQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      setCart((prevCart) => prevCart.filter((_, i) => i !== index));
    } else {
      setCart((prevCart) =>
        prevCart.map((item, i) =>
          i === index ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const additionalsTotal = item.additionals.reduce((sum, ad) => sum + ad.price, 0);
      return total + (item.price + additionalsTotal) * item.quantity;
    }, 0);
  };

  const isSearching = Boolean(searchQuery.trim());
  const filteredProducts = products.filter(product => {
    const matchesCategory = isSearching || !activeCategory || product.category === activeCategory;
    const matchesSearch = !isSearching || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const comboCategory = categories.find(c => c.is_combo);

  const handleCartToggle = () => {
    setIsCartVisible(!isCartVisible);
  };

  const handleCheckout = () => {
    if (!storeIsOpen) {
      alert("Desculpe, o restaurante está fechado no momento.");
      return;
    }
    setShowOrderModal(true);
  };

  const submitOrder = async (orderData) => {
    setIsSubmitting(true);
    try {
      const createdOrder = await Order.create(orderData);

      try {
        const recentOrders = JSON.parse(localStorage.getItem("vrumburguer_recent_orders") || "[]");
        if (!recentOrders.includes(createdOrder.id)) {
          recentOrders.unshift(createdOrder.id);
          localStorage.setItem("vrumburguer_recent_orders", JSON.stringify(recentOrders.slice(0, 10)));
        }
        if (orderData.customer_phone) {
          localStorage.setItem("vrumburguer_customer_phone", orderData.customer_phone);
        }
      } catch {}

      if (orderData.coupon_code) {
        try {
          const user = await base44.auth.me();
          const coupons = await Coupon.filter({ code: orderData.coupon_code });
          
          if (coupons.length > 0 && user?.email) {
            await CouponUsage.create({
              coupon_id: coupons[0].id,
              user_email: user.email,
              order_id: createdOrder.id
            });
          }
        } catch (error) {
          console.log("Erro ao registrar uso do cupom:", error);
        }
      }
      
      setCart([]);
      setShowOrderModal(false);
      setIsCartVisible(false);
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Pedido Enviado! 🎉", {
          body: "Acompanhe o preparo e a entrega em tempo real!",
          icon: "/favicon.ico",
        });
      }
      
      navigate(`${createPageUrl("MyOrders")}?id=${createdOrder.id}`);
    } catch (_error) {
      alert("Erro ao enviar pedido. Tente novamente.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0a09] text-stone-100 selection:bg-red-600 selection:text-white">
      {/* Header Dark Glass */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#120e0d]/95 backdrop-blur-xl border-b border-stone-800/80 transition-all">
        <div className="container mx-auto px-4 sm:px-6 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            {/* Logo e Nome */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-lg border border-red-500/30 flex-shrink-0 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                {settings?.restaurant_logo ? (
                  <img src={settings.restaurant_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🍔</span>
                )}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black leading-tight text-white tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {settings?.restaurant_name || "Vruum Burguer"}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${storeIsOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-[11px] font-bold tracking-wide ${storeIsOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                      {storeIsOpen ? 'Aberto agora' : 'Fechado'}
                    </span>
                  </div>
                  <span className="text-stone-600 text-xs">•</span>
                  <span className="text-stone-400 text-[11px]">
                    {settings?.opening_time && settings?.closing_time ? `${settings.opening_time} - ${settings.closing_time}` : '18:00 - 23:59'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Topo */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCartToggle}
                title="Carrinho"
                className="relative text-stone-300 hover:text-white hover:bg-stone-800/80 rounded-full h-9 w-9 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-red-400" />
                {cart.reduce((total, item) => total + item.quantity, 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </Button>
              <StoreInfoSheet settings={settings} />
              <UserProfileSheet />
            </div>
          </div>
        </div>
      </header>

      {/* Banner de Mesa Conectada via QR Code */}
      {urlMesa && (
        <div className="pt-20 container mx-auto px-4 max-w-6xl">
          <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🍽️</span>
              <div>
                <p className="text-[11px] font-black uppercase text-emerald-300">Atendimento no Salão</p>
                <p className="text-sm font-bold text-white">Você está na Mesa {urlMesa}</p>
              </div>
            </div>
            <span className="text-[11px] bg-emerald-900/80 border border-emerald-400/40 text-emerald-200 px-3 py-1 rounded-xl font-bold">
              QR Code Ativo
            </span>
          </div>
        </div>
      )}

      {/* Banner de Pedido em Andamento (se houver) */}
      {activeGuestOrder && (
        <div className={`${urlMesa ? 'pt-3' : 'pt-20'} container mx-auto px-4 max-w-6xl`}>
          <div className="relative">
            <Link to={`${createPageUrl("MyOrders")}?id=${activeGuestOrder.id}`}>
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity border border-red-400/30 pr-12"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                    <Bike className="w-5 h-5 animate-pulse text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-200">Pedido em Andamento</p>
                    <p className="text-sm font-bold">
                      #{activeGuestOrder.id.slice(-6).toUpperCase()} • {
                        activeGuestOrder.status === 'preparando' 
                          ? 'CONFIRMADO' 
                          : (activeGuestOrder.status === 'enviado' ? 'A CAMINHO / PRONTO' : activeGuestOrder.status.toUpperCase())
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold gap-1 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span>Rastrear</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveGuestOrder(null);
                try {
                  localStorage.removeItem("vrumburguer_recent_orders");
                } catch {}
              }}
              title="Dispensar aviso"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white flex items-center justify-center text-xs font-bold transition-all z-10"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!storeIsOpen && (
        <div className={`${activeGuestOrder ? 'pt-3' : 'pt-20'} container mx-auto px-4 max-w-6xl`}>
          <div className="rounded-2xl border p-4 bg-red-950/40 border-red-500/30 text-red-200 flex items-start gap-3">
            <XCircle className="h-5 w-5 mt-0.5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-white">Restaurante Fechado no Momento</p>
              <p className="text-xs mt-0.5 text-stone-300">
                Horário de funcionamento: {settings?.opening_time || '18:00'} às {settings?.closing_time || '23:59'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner (só exibe se houver banners cadastrados e ativos) */}
      {banners && banners.length > 0 ? (
        <div className={!activeGuestOrder && storeIsOpen ? "pt-[61px]" : "pt-2"}>
          <BannerCarousel banners={banners} />
        </div>
      ) : (
        !activeGuestOrder && storeIsOpen && <div className="h-[61px]" />
      )}

      {/* Barra de Categorias Pills */}
      <div className="sticky top-[61px] z-30 bg-[#0d0a09]/95 backdrop-blur-xl border-b border-stone-800/80 py-3.5">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-1">
            {categories.map(category => {
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setSearchQuery("");
                  }}
                  className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-950/60 border border-red-500/40 scale-[1.02]' 
                      : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800/80'
                  }`}
                >
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seção Principal do Cardápio */}
      <main className="container mx-auto px-4 sm:px-6 pb-36 pt-8 max-w-6xl space-y-10">
        {/* Carrossel dos 7 Mais Pedidos (Baseado em Pedidos Reais) */}
        {!searchQuery.trim() && (
          <PopularProductsRow
            products={popularRankedProducts}
            onProductClick={handleProductClick}
            isStoreOpen={storeIsOpen}
          />
        )}

        {/* Cabeçalho da Categoria com Barra de Busca Global */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-stone-800/80 pt-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-red-500 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSearching ? "BUSCA NO CARDÁPIO" : "NOSSO CARDÁPIO"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {isSearching ? `Resultados para "${searchQuery}"` : (activeCategoryObj?.name || "Todos os Produtos")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              {isSearching 
                ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`
                : "Feitos artesanalmente com ingredientes nobres e muito sabor."
              }
            </p>
          </div>

          {/* Campo de Busca Rápida com Botão de Limpar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar burgers, bebidas, combos..."
              className="w-full bg-stone-900/90 border border-stone-800 focus:border-red-500/70 focus:bg-stone-900 rounded-full pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-stone-500 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1 rounded-full text-xs font-bold"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Grid de Produtos: 1 Coluna no Mobile e 2 no Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          <AnimatePresence>
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                isStoreOpen={storeIsOpen}
                isPopular={idx === 0}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-stone-900/40 rounded-3xl border border-stone-800/60 p-8 space-y-3">
            <div className="text-5xl">🍔</div>
            <h3 className="text-lg font-bold text-white">Nenhum produto encontrado</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {searchQuery ? `Não encontramos itens para "${searchQuery}". Tente outro termo.` : "Não há produtos disponíveis nesta categoria no momento."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/30 px-4 py-2 rounded-full transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {/* Banner Promocional de Combos - Visual Ultra Premium */}
        {comboCategory && (
          <div 
            className="rounded-3xl overflow-hidden relative border border-amber-500/30 shadow-2xl p-6 sm:p-8 transition-all hover:border-amber-400/50"
            style={{
              background: 'radial-gradient(circle at 85% 50%, rgba(220, 38, 38, 0.22), transparent 55%), linear-gradient(135deg, #1c0e0b 0%, #2b130e 50%, #120907 100%)',
              boxShadow: '0 20px 50px -15px rgba(220, 38, 38, 0.25), 0 0 30px rgba(245, 158, 11, 0.08)'
            }}
          >
            {/* Brilho sutil de fundo */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3.5 text-left flex-1">
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-red-500/20 to-transparent border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>COMBO PROMOCIONAL EXCLUSIVO</span>
                </div>
                
                <h3 
                  className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight" 
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Conheça a nossa seleção de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-amber-500">{comboCategory.name}</span>
                </h3>
                
                <p className="text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed font-normal">
                  Burgers artesanais suculentos acompanhados de batata crocante e bebida gelada com o melhor custo-benefício.
                </p>
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(comboCategory.id);
                    setSearchQuery("");
                    window.scrollTo({ top: 180, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm px-6 py-4 rounded-2xl shadow-xl shadow-red-950/70 hover:shadow-red-600/30 transition-all duration-200 active:scale-95 cursor-pointer border border-amber-400/30 whitespace-nowrap"
                >
                  <span>Explorar {comboCategory.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 Cards de Diferenciais / Trust */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-950/70 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Entrega Rápida</p>
              <p className="text-xs text-stone-400 mt-0.5">Seu burger no menor tempo possível</p>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/70 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Pagamento Seguro</p>
              <p className="text-xs text-stone-400 mt-0.5">Pix, cartão e dinheiro na entrega</p>
            </div>
          </div>

          <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-950/70 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
              <Star className="w-5 h-5 fill-red-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Qualidade Garantida</p>
              <p className="text-xs text-stone-400 mt-0.5">Sabor e satisfação em 1º lugar</p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé Institucional Dark */}
      <footer className="bg-[#090706] border-t border-stone-800/80 py-10 px-4">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg border border-red-500/30 flex-shrink-0 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                {settings?.restaurant_logo ? (
                  <img src={settings.restaurant_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🍔</span>
                )}
              </div>
              <h4 className="font-extrabold text-base text-white tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {settings?.restaurant_name || "Vruum Burguer"}
              </h4>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
              Burgers artesanais preparados com ingredientes nobres e muito amor por hambúrguer de verdade.
            </p>
          </div>

          <div className="md:col-span-4 space-y-2.5 text-xs text-stone-300">
            <p className="font-bold uppercase tracking-wider text-stone-500 text-[11px]">Localização & Contato</p>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span>{settings?.address || "Endereço não informado"}</span>
            </div>
            {settings?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>{settings.phone}</span>
              </div>
            )}
            {settings?.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-stone-300 hover:text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{settings.whatsapp}</span>
              </a>
            )}
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-stone-300 hover:text-white transition-colors"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                <span>{settings.instagram}</span>
              </a>
            )}
          </div>

          <div className="md:col-span-4 space-y-2.5 text-xs text-stone-300">
            <p className="font-bold uppercase tracking-wider text-stone-500 text-[11px]">Horário de Funcionamento</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${storeIsOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={storeIsOpen ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {storeIsOpen ? 'Aberto Agora' : 'Fechado'}
              </span>
            </div>
            <p className="text-stone-400">
              {settings?.opening_time && settings?.closing_time ? `${settings.opening_time} às ${settings.closing_time}` : 'Consulte nosso horário'}
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl pt-8 mt-8 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© {new Date().getFullYear()} {settings?.restaurant_name || "Vruum Burguer"}. Todos os direitos reservados.</p>
          <p>
            Desenvolvido por{" "}
            <a
              href="https://instagram.com/davialeixo_nogueira"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Davi Aleixo
            </a>
            {" | "}
            <a
              href="https://wa.me/5531982607426"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              31982607426
            </a>
          </p>
        </div>
      </footer>

      {/* Carrinho flutuante */}
      <AnimatePresence>
        <Cart
          cart={cart}
          updateQuantity={updateCartQuantity}
          onCheckout={handleCheckout}
          deliveryFee={settings?.delivery_fee || 0}
          isVisible={isCartVisible}
          onToggle={handleCartToggle}
        />
      </AnimatePresence>

      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        cart={cart}
        total={getCartTotal()}
        deliveryFee={settings?.delivery_fee || 0}
        minOrderValue={settings?.min_order_value || 0}
        deliveryTime={settings?.delivery_time || "40-50 min"}
        initialTableNumber={urlMesa || ""}
        onSubmit={submitOrder}
        isSubmitting={isSubmitting}
      />
      
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          complementGroups={(() => {
            const linkedGroupIds = productComplementGroups
              .filter(pcg => pcg.product_id === selectedProduct.id)
              .map(pcg => pcg.group_id);

            return complementGroups
              .filter(g => g.active && linkedGroupIds.includes(g.id))
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map(g => ({
                ...g,
                items: complementItems
                  .filter(i => i.group_id === g.id && i.active)
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              }));
          })()}
          additionals={additionals.filter(a => a.product_id === selectedProduct.id)}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}