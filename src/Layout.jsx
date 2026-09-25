import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Image as ImageIcon, Tag, BarChart, Folder, Users, Monitor, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Settings as SettingsEntity } from "@/entities/Settings";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Pedidos",
    url: createPageUrl("Orders"),
    icon: ShoppingBag,
  },
  {
    title: "PDV Balcão",
    url: createPageUrl("PDV"),
    icon: Monitor,
  },
  {
    title: "Clientes",
    url: createPageUrl("Clients"),
    icon: Users,
  },
  {
    title: "Produtos",
    url: createPageUrl("Products"),
    icon: Package,
  },
  {
    title: "Categorias",
    url: createPageUrl("Categories"),
    icon: Folder,
  },
  {
    title: "Complementos",
    url: createPageUrl("Complements"),
    icon: Layers,
  },
  {
    title: "Cupons",
    url: createPageUrl("Coupons"),
    icon: Tag,
  },
  {
    title: "Banners",
    url: createPageUrl("Banners"),
    icon: ImageIcon,
  },
  {
    title: "Relatórios",
    url: createPageUrl("Reports"),
    icon: BarChart,
  },
  {
    title: "Configurações",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

import { Order } from "@/entities/Order";
import { soundAlert } from "@/utils/soundAlert";
import { useToast } from "@/components/ui/use-toast";
import { Bell, BellOff, Volume2 } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = React.useState(null);
  const [settings, setSettings] = React.useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(soundAlert.isEnabled());
  const [pendingOrdersCount, setPendingOrdersCount] = React.useState(0);
  
  const knownPendingIds = React.useRef(new Set());
  const isFirstLoad = React.useRef(true);
  const isFetchingRef = React.useRef(false);

  const publicPages = ["Menu", "MyOrders", "AdminLogin", "Home", "PrintOrder"];
  const isPublicPage = publicPages.includes(currentPageName);
  const isAdminAuthenticated = typeof window !== "undefined" && localStorage.getItem("admin_auth") === "authenticated";

  React.useEffect(() => {
    loadUser();
    loadSettings();
    setIsCheckingAuth(false);
  }, [location.pathname, currentPageName]);

  // Se estiver na página de Pedidos, limpa o contador de não lidos e o título
  React.useEffect(() => {
    if (currentPageName === "Orders" || location.pathname.endsWith("/Orders")) {
      setPendingOrdersCount(0);
      if (typeof document !== "undefined") {
        document.title = `${settings?.restaurant_name || 'Vruum Burguer'} - Painel Admin`;
      }
    }
  }, [currentPageName, location.pathname, settings]);

  React.useEffect(() => {
    if (!isPublicPage && !isAdminAuthenticated && !isCheckingAuth) {
      navigate(createPageUrl("AdminLogin"), { replace: true });
    }
  }, [isPublicPage, isAdminAuthenticated, isCheckingAuth, navigate]);

  // Alerta Global de Novos Pedidos para TODAS as abas do Painel Administrativo
  React.useEffect(() => {
    if (isPublicPage || !isAdminAuthenticated) return;

    // Solicita permissão para notificações na área de trabalho do PC
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const checkNewOrders = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const ordersData = await Order.list("-created_date", 25);
        const safeOrders = Array.isArray(ordersData) ? ordersData : [];
        const currentPending = safeOrders.filter(o => o.status === 'pendente');
        const currentPendingIds = currentPending.map(o => o.id);

        // Atualiza o alarme sonoro contínuo (toca sem parar enquanto houver pedidos pendentes)
        soundAlert.setPendingCount(currentPending.length);

        // Se NÃO estiver na página de Pedidos, atualiza a numeração de notificação
        const isCurrentlyOnOrdersPage = currentPageName === "Orders" || window.location.pathname.endsWith("/Orders");
        if (!isCurrentlyOnOrdersPage) {
          setPendingOrdersCount(currentPending.length);
          if (typeof document !== "undefined") {
            if (currentPending.length > 0) {
              document.title = `(${currentPending.length}) 🍔 ${settings?.restaurant_name || 'Vruum Burguer'} - Painel Admin`;
            } else {
              document.title = `${settings?.restaurant_name || 'Vruum Burguer'} - Painel Admin`;
            }
          }
        } else {
          setPendingOrdersCount(0);
          if (typeof document !== "undefined") {
            document.title = `${settings?.restaurant_name || 'Vruum Burguer'} - Painel Admin`;
          }
        }

        if (!isFirstLoad.current) {
          const newOrders = currentPending.filter(o => !knownPendingIds.current.has(o.id));
          if (newOrders.length > 0) {
            // Notificação visual na tela
            const firstNew = newOrders[0];
            const orderNum = String(firstNew.id).slice(-6).toUpperCase();
            const clientName = firstNew.customer_name || "Cliente";
            
            toast({
              title: "🔔 Novo Pedido Recebido!",
              description: `Pedido #${orderNum} de ${clientName} (${firstNew.order_type === 'delivery' ? 'Delivery 🛵' : firstNew.order_type === 'dine_in' ? 'Mesa 🍽️' : 'Retirada 🥡'})`,
              duration: 10000,
            });

            // Notificação do Navegador (fecha automaticamente em 10 segundos)
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                const notif = new Notification(`🔔 Novo Pedido #${orderNum}!`, {
                  body: `${clientName} acabou de enviar um pedido. Abra o painel para confirmar!`,
                  icon: "/favicon.ico",
                  tag: `order-${firstNew.id}`
                });
                setTimeout(() => {
                  try { notif.close(); } catch {}
                }, 10000);
              } catch (_e) {}
            }
          }
        }

        knownPendingIds.current = new Set(currentPendingIds);
        isFirstLoad.current = false;
      } catch (err) {
        console.log("Erro no monitor global de pedidos:", err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 5000);

    let unsubscribe;
    try {
      unsubscribe = Order.subscribe(() => {
        checkNewOrders();
      });
    } catch (_e) {}

    return () => {
      clearInterval(interval);
      if (unsubscribe && typeof unsubscribe === "function") unsubscribe();
    };
  }, [isPublicPage, isAdminAuthenticated, currentPageName, settings]);

  const loadUser = async () => {
    try {
      const storedAdmin = localStorage.getItem("admin_user");
      if (storedAdmin) {
        const parsed = JSON.parse(storedAdmin);
        setUser({ full_name: parsed.username ? `Admin (${parsed.username})` : "Administrador", email: parsed.username ? `${parsed.username}@vrumburguer.com` : "admin@vrumburguer.com" });
        return;
      }
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (_error) {
      console.log("User not authenticated");
    }
  };

  const loadSettings = async () => {
    try {
      const settingsData = await SettingsEntity.list();
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (_error) {
      console.log("Error loading settings");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_user");
    navigate(createPageUrl("AdminLogin"), { replace: true });
  };

  const toggleSoundAlert = () => {
    const nextState = !soundEnabled;
    soundAlert.setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      soundAlert.playOrderChime();
    }
  };

  // Se for página de login ou impressão, mostrar sem layout de barra lateral
  if (currentPageName === "AdminLogin" || currentPageName === "PrintOrder") {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  // Se for página privada e não estiver logado como admin, redirecionar
  if (!isPublicPage && !isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Se não for a página do Menu, mostrar layout admin
  if (currentPageName !== "Menu" && currentPageName !== "MyOrders" && currentPageName !== "PrintOrder") {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <Sidebar className="border-r border-stone-200 bg-white text-stone-900">
            <SidebarHeader className="border-b border-stone-200 p-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                {settings?.restaurant_logo ? (
                  <img 
                    src={settings.restaurant_logo} 
                    alt="Logo" 
                    className="w-10 h-10 rounded-xl object-cover shadow-sm border border-stone-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-sm">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="font-extrabold text-base text-stone-950 leading-tight" style={{ letterSpacing: '-0.02em' }}>
                    {settings?.restaurant_name || 'Vruum Burguer'}
                  </h2>
                  <p className="text-xs font-bold text-red-600 mt-0.5">Painel Administrativo</p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-3 bg-white">
              <SidebarGroup>
                <SidebarGroupLabel className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest px-3 py-2">
                  Menu Principal
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {navigationItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      const isOrdersItem = item.title === "Pedidos";
                      const showBadge = isOrdersItem && pendingOrdersCount > 0 && !isActive;

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`h-10 transition-all duration-150 rounded-xl px-3.5 font-semibold text-sm ${
                              isActive 
                                ? 'bg-red-600 text-white font-bold shadow-md shadow-red-200 hover:bg-red-700 hover:text-white' 
                                : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3 truncate">
                                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                                <span className="truncate">{item.title}</span>
                              </div>
                              {showBadge && (
                                <span className="ml-auto bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse flex items-center justify-center min-w-[20px] h-5">
                                  {pendingOrdersCount}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup className="mt-auto pt-4 border-t border-stone-100">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="rounded-xl border border-stone-200 text-stone-800 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold text-sm">
                        <Link to={createPageUrl("Menu")} className="flex items-center gap-3 px-3 py-2.5">
                          <ShoppingBag className="w-4 h-4 text-red-600 flex-shrink-0" />
                          <span>Ver Cardápio Online</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-stone-200 p-3 bg-stone-50/70 space-y-2">
              {/* Status do Som de Novos Pedidos */}
              <div className="flex items-center justify-between bg-white border border-stone-200 p-2 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={toggleSoundAlert}
                  className="flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Ativar/Desativar som de novos pedidos"
                >
                  {soundEnabled ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-emerald-800">Alerta de Pedido Ativo</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <BellOff className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[11px] text-red-700">Som Mudo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => soundAlert.playOrderChime()}
                  className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Testar Campainha"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-xs shadow-sm">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-xs truncate">
                      {user?.full_name?.includes("@") ? "Administrador" : (user?.full_name || "Administrador")}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-700 truncate">
                      Painel Administrativo
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Sair do painel admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
                <h1 className="text-xl font-semibold text-gray-900">{settings?.restaurant_name || 'Admin Panel'}</h1>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Layout sem sidebar (Menu, Login, etc.)
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
    </div>
  );
}