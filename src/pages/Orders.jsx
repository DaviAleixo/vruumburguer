import React, { useState, useEffect, useRef } from "react";
import { Order } from "@/entities/Order";
import { Settings } from "@/entities/Settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, MapPin, CreditCard, Clock, CheckCircle, X, Printer, 
  Truck, Store, Hash, Bell, BellOff, Volume2, Timer, Check,
  Calendar, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { soundAlert } from "@/utils/soundAlert";
import TableQRCodeModal from "@/components/admin/TableQRCodeModal";
import OrderCountdownTimer from "@/components/admin/OrderCountdownTimer";

/**
 * Determina se o pedido pertence ao turno de trabalho atual da hamburgueria.
 * Se a hamburgueria abre às 18:00 e vai até as 02:00, o turno engloba desde as 18:00
 * até o fechamento da madrugada. Pedidos em andamento são sempre mantidos.
 */
function isOrderInCurrentShift(order, settings) {
  if (!order || !order.created_date) return false;
  
  // Qualquer pedido que ainda não foi entregue ou cancelado permanece visível no turno
  if (['pendente', 'confirmado', 'preparando', 'enviado'].includes(order.status)) {
    return true;
  }

  const d = new Date(order.created_date);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  let openingHour = 18;
  let openingMinute = 0;

  if (settings?.opening_time) {
    const parts = settings.opening_time.split(':').map(Number);
    if (!isNaN(parts[0])) openingHour = parts[0];
    if (!isNaN(parts[1])) openingMinute = parts[1];
  }

  const shiftStart = new Date(now);
  // Se o horário atual for de madrugada antes da abertura, o turno começou no dia anterior
  if (now.getHours() < openingHour) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  shiftStart.setHours(openingHour, openingMinute, 0, 0);

  return d.getTime() >= shiftStart.getTime();
}

function isDateToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getDate() === now.getDate() &&
         d.getMonth() === now.getMonth() &&
         d.getFullYear() === now.getFullYear();
}

function isDateYesterday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getFullYear() === yesterday.getFullYear();
}

function isDateWithinDays(dateStr, days = 7) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return d.getTime() >= cutoff;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState("40-50 min");
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(soundAlert.isEnabled());
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pendente");
  const [timeFilter, setTimeFilter] = useState("shift"); // "shift" | "today" | "yesterday" | "week" | "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  
  const [orderLimit, setOrderLimit] = useState(35);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const knownPendingIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadOrdersOnly();
    }, 8000); // Atualiza a cada 8 segundos

    let unsubscribe;
    try {
      unsubscribe = Order.subscribe(() => {
        loadOrdersOnly();
      });
    } catch (_e) {}

    return () => {
      clearInterval(interval);
      if (unsubscribe && typeof unsubscribe === "function") unsubscribe();
    };
  }, [orderLimit]);

  const loadData = async () => {
    try {
      const [ordersData, settingsData] = await Promise.all([
        Order.list("-created_date", orderLimit),
        Settings.list()
      ]);
      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      setOrders(safeOrders);

      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
        if (settingsData[0].delivery_time) {
          setDeliveryTime(settingsData[0].delivery_time);
        }
      }

      // Inicializa os IDs de pedidos pendentes conhecidos
      const pendingIds = safeOrders.filter(o => o.status === 'pendente').map(o => o.id);
      knownPendingIds.current = new Set(pendingIds);
      isFirstLoad.current = false;
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrdersOnly = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const ordersData = await Order.list("-created_date", orderLimit);
      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      setOrders(safeOrders);

      // Checa se há novos pedidos pendentes que não estavam antes
      const currentPendingIds = safeOrders.filter(o => o.status === 'pendente').map(o => o.id);
      if (!isFirstLoad.current) {
        const hasNewPending = currentPendingIds.some(id => !knownPendingIds.current.has(id));
        if (hasNewPending) {
          soundAlert.playOrderChime();
        }
      }
      knownPendingIds.current = new Set(currentPendingIds);
    } catch (err) {
      console.error("Erro ao atualizar pedidos:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setOrderLimit(prev => prev + 25);
    setIsLoadingMore(false);
  };

  const toggleSoundAlert = () => {
    const nextState = !soundEnabled;
    soundAlert.setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      soundAlert.playOrderChime();
    }
  };

  const testSound = () => {
    soundAlert.playOrderChime();
  };

  const handleSetDeliveryTime = async (newTime) => {
    setDeliveryTime(newTime);
    setIsEditingTime(false);
    if (!settings?.id) return;
    try {
      await Settings.update(settings.id, { delivery_time: newTime });
    } catch (err) {
      console.error("Erro ao atualizar tempo de entrega:", err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await Order.update(orderId, { status: newStatus });
      loadOrdersOnly();
    } catch (err) {
      console.error("Erro ao atualizar status do pedido:", err);
    }
  };

  const safeMoney = (val) => {
    const num = Number(val || 0);
    return isNaN(num) ? "0,00" : num.toFixed(2).replace(".", ",");
  };

  const safeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmado: "bg-blue-100 text-blue-800 border-blue-200",
      preparando: "bg-purple-100 text-purple-800 border-purple-200",
      enviado: "bg-indigo-100 text-indigo-800 border-indigo-200",
      entregue: "bg-green-100 text-green-800 border-green-200",
      cancelado: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusText = (status) => {
    const texts = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      preparando: "Preparando",
      enviado: "Enviado",
      entregue: "Entregue",
      cancelado: "Cancelado"
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pendente: <Clock className="w-4 h-4" />,
      confirmado: <CheckCircle className="w-4 h-4" />,
      preparando: <Clock className="w-4 h-4" />,
      enviado: <MapPin className="w-4 h-4" />,
      entregue: <CheckCircle className="w-4 h-4" />,
      cancelado: <X className="w-4 h-4" />
    };
    return icons[status];
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      dinheiro: "Dinheiro",
      pix: "PIX",
      cartao: "Cartão",
      cartao_credito: "Cartão de Crédito",
      cartao_debito: "Cartão de Débito"
    };
    return methods[method] || method || "-";
  };

  // Filtro por período de tempo (Turno aberto, Hoje, Ontem, Semana, Todos)
  const timeFilteredOrders = React.useMemo(() => {
    let list = orders || [];

    if (timeFilter === "shift") {
      list = list.filter(o => isOrderInCurrentShift(o, settings));
    } else if (timeFilter === "today") {
      list = list.filter(o => isDateToday(o.created_date) || ['pendente', 'confirmado', 'preparando', 'enviado'].includes(o.status));
    } else if (timeFilter === "yesterday") {
      list = list.filter(o => isDateYesterday(o.created_date));
    } else if (timeFilter === "week") {
      list = list.filter(o => isDateWithinDays(o.created_date, 7));
    }

    // Busca rápida por texto (Número do pedido, Nome, Mesa ou Telefone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => 
        String(o.id).toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_phone && o.customer_phone.includes(q)) ||
        (o.table_number && o.table_number.toLowerCase().includes(q))
      );
    }

    return list;
  }, [orders, timeFilter, settings, searchQuery]);

  const filteredOrders = React.useMemo(() => {
    if (activeTab === "all") return timeFilteredOrders;
    return timeFilteredOrders.filter(order => order.status === activeTab);
  }, [timeFilteredOrders, activeTab]);

  const statusCounts = {
    all: timeFilteredOrders.length,
    pendente: timeFilteredOrders.filter(o => o.status === "pendente").length,
    confirmado: timeFilteredOrders.filter(o => o.status === "confirmado").length,
    preparando: timeFilteredOrders.filter(o => o.status === "preparando").length,
    enviado: timeFilteredOrders.filter(o => o.status === "enviado").length,
    entregue: timeFilteredOrders.filter(o => o.status === "entregue").length,
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pedidos</h1>
            <p className="text-sm md:text-base text-gray-600 mt-0.5">Gerencie e acompanhe todos os pedidos do seu restaurante</p>
          </div>

          {/* Barra de Ações Rápidas: Tempo de Entrega, Som e QR Code */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Controle de Tempo de Entrega Rápido */}
            <div className="bg-white border border-stone-200 shadow-sm rounded-2xl p-1.5 flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs font-bold text-stone-700 px-2">
                <Timer className="w-3.5 h-3.5 text-amber-600" />
                <span>Entrega:</span>
              </div>

              {!isEditingTime ? (
                <div className="flex items-center gap-1">
                  {["30-40 min", "40-50 min", "50-60 min", "60-80 min"].map((timeOption) => {
                    const isSelected = deliveryTime === timeOption;
                    return (
                      <button
                        key={timeOption}
                        type="button"
                        onClick={() => handleSetDeliveryTime(timeOption)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                          isSelected
                            ? "bg-amber-500 text-white shadow-sm scale-105"
                            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        {timeOption}
                      </button>
                    );
                  })}
                  
                  {/* Botão para digitar outro tempo se não for nenhum dos 4 */}
                  {!["30-40 min", "40-50 min", "50-60 min", "60-80 min"].includes(deliveryTime) && (
                    <span className="bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-xl shadow-sm">
                      {deliveryTime}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCustomTimeInput(deliveryTime);
                      setIsEditingTime(true);
                    }}
                    title="Definir tempo personalizado"
                    className="p-1 text-stone-400 hover:text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-100"
                  >
                    ✏️
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customTimeInput}
                    onChange={(e) => setCustomTimeInput(e.target.value)}
                    placeholder="Ex: 45-60 min"
                    className="bg-stone-100 text-xs px-2 py-1 rounded-lg w-24 border border-stone-300 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customTimeInput.trim()) handleSetDeliveryTime(customTimeInput.trim());
                      else setIsEditingTime(false);
                    }}
                    className="bg-emerald-600 text-white p-1 rounded-lg text-xs"
                    title="Salvar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTime(false)}
                    className="bg-stone-200 text-stone-600 p-1 rounded-lg text-xs"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Controle da Campainha de Pedidos */}
            <div className="flex items-center gap-1 bg-white border border-stone-200 shadow-sm rounded-2xl p-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSoundAlert}
                className={`h-7 px-2.5 rounded-xl text-xs font-bold gap-1.5 ${
                  soundEnabled 
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" 
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }`}
              >
                {soundEnabled ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Som Ativado</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-red-600" />
                    <span>Som Mudo</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={testSound}
                title="Testar Campainha"
                className="h-7 px-2 text-stone-600 hover:text-stone-900 rounded-xl text-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Plaquinhas QR Code das Mesas */}
            <TableQRCodeModal settings={settings} />
          </div>
        </div>

        {/* Barra de Filtro de Período e Busca de Pedidos */}
        <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Período:</span>
            </span>

            {[
              { id: "shift", label: "Turno Aberto (Ao Vivo)", isLive: true },
              { id: "today", label: "Hoje" },
              { id: "yesterday", label: "Ontem" },
              { id: "week", label: "Últimos 7 dias" },
              { id: "all", label: "Histórico Completo" },
            ].map((p) => {
              const isSelected = timeFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTimeFilter(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-red-600 text-white shadow-sm scale-102"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {p.isLive && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-300 animate-pulse" : "bg-emerald-500"}`} />
                  )}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Campo de Busca Rápida de Pedidos */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar #pedido, cliente, mesa..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:bg-white focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="bg-white border p-1 inline-flex w-max md:w-auto min-w-full md:min-w-0">
              <TabsTrigger value="pendente" className="text-xs md:text-sm whitespace-nowrap">
                Pendentes ({statusCounts.pendente})
              </TabsTrigger>
              <TabsTrigger value="confirmado" className="text-xs md:text-sm whitespace-nowrap">
                Confirmados ({statusCounts.confirmado})
              </TabsTrigger>
              <TabsTrigger value="preparando" className="text-xs md:text-sm whitespace-nowrap">
                Preparando ({statusCounts.preparando})
              </TabsTrigger>
              <TabsTrigger value="enviado" className="text-xs md:text-sm whitespace-nowrap">
                Enviados ({statusCounts.enviado})
              </TabsTrigger>
              <TabsTrigger value="entregue" className="text-xs md:text-sm whitespace-nowrap">
                Entregues ({statusCounts.entregue})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="grid gap-4">
              <AnimatePresence>
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const d = safeDate(order.created_date);
                  const total = order.total_amount || order.total || 0;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader 
                          className="cursor-pointer p-4 md:p-6" 
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                <span>Pedido #{String(order.id).slice(-6).toUpperCase()}</span>
                                <span className="text-xs text-gray-500 font-normal">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </CardTitle>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">
                                {d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "-"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <p className="font-medium text-gray-700">{order.customer_name || "Cliente"}</p>
                                {order.order_type === 'delivery' ? (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 font-semibold">
                                    <Truck className="w-3 h-3 mr-1 text-red-600" />
                                    Delivery
                                  </Badge>
                                ) : (order.order_type === 'dine_in' || (order.table_number && order.table_number.toLowerCase().includes('mesa'))) ? (
                                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                                    <span className="mr-1">🍽️</span>
                                    {order.table_number || "Mesa (Salão)"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 font-semibold">
                                    <Store className="w-3 h-3 mr-1 text-amber-600" />
                                    Retirada (Balcão)
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
                              {/* Cronômetro de Entrega / Preparo */}
                              <OrderCountdownTimer order={order} deliveryTimeSetting={deliveryTime} />

                              <Badge className={`${getStatusColor(order.status)} border font-medium text-xs md:text-sm`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1">{getStatusText(order.status)}</span>
                              </Badge>
                              <Link to={createPageUrl(`PrintOrder?id=${order.id}`)} target="_blank" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                                  <Printer className="w-3 h-3 md:w-4 md:h-4" />
                                </Button>
                              </Link>
                              <div className="text-right">
                                <p className="font-bold text-lg md:text-xl text-gray-900">
                                  R$ {safeMoney(total)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <CardContent className="p-4 md:p-6 border-t border-gray-100">
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                                  {/* Informações do Cliente */}
                                  <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Informações do Cliente</h3>
                                    <div className="space-y-2">
                                      <p className="text-gray-900 font-medium text-sm md:text-base">{order.customer_name || "Cliente"}</p>
                                      <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                                        <Phone className="w-3 h-3 md:w-4 md:h-4" />
                                        <span>{order.customer_phone || "-"}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                                        {order.order_type === 'delivery' ? (
                                          <>
                                            <Truck className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                                            <span className="font-medium text-red-700">Entrega (Delivery)</span>
                                          </>
                                        ) : (order.order_type === 'dine_in' || (order.table_number && order.table_number.toLowerCase().includes('mesa'))) ? (
                                          <>
                                            <span className="text-sm">🍽️</span>
                                            <span className="font-medium text-emerald-700">Consumo no Local (Salão)</span>
                                          </>
                                        ) : (
                                          <>
                                            <Store className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                                            <span className="font-medium text-amber-800">Retirada no Balcão</span>
                                          </>
                                        )}
                                      </div>
                                      {order.order_type === 'delivery' ? (
                                        <div className="flex items-start gap-2 text-gray-600 text-xs md:text-sm">
                                          <MapPin className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-red-600 shrink-0" />
                                          <span className="text-xs md:text-sm">{order.customer_address || order.delivery_address || "-"}</span>
                                        </div>
                                      ) : (order.order_type === 'dine_in' || (order.table_number && order.table_number.toLowerCase().includes('mesa'))) ? (
                                        <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                                          <Hash className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 shrink-0" />
                                          <span className="font-bold text-emerald-800">{order.table_number || "Mesa não especificada"}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                                          <Store className="w-3 h-3 md:w-4 md:h-4 text-amber-600 shrink-0" />
                                          <span className="text-xs text-amber-800">Chamar cliente no balcão quando pronto</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-gray-600 text-xs md:text-sm">
                                        <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                                        <span>{getPaymentMethodText(order.payment_method)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Itens do Pedido */}
                                  <div>
                                    <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Itens do Pedido</h3>
                                    <div className="space-y-2">
                                      {order.items?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-xs md:text-sm">{item.product_name || item.name}</p>
                                            <p className="text-xs text-gray-600">
                                              {item.quantity}x R$ {safeMoney(item.product_price || item.price)}
                                            </p>
                                            {item.additionals && item.additionals.length > 0 && (
                                              <div className="text-xs text-gray-500 pl-2">
                                                + {item.additionals.map(ad => `${ad.name} (R$ ${safeMoney(ad.price)})`).join(', ')}
                                              </div>
                                            )}
                                          </div>
                                          <p className="font-semibold text-gray-900 text-xs md:text-sm">
                                            R$ {safeMoney(item.subtotal || ((item.product_price || item.price || 0) * (item.quantity || 1)))}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {order.notes && (
                                  <div className="mb-4 md:mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Observações</h3>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-xs md:text-sm">
                                      {order.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Ações */}
                                <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
                                  {order.status === "pendente" && (
                                    <>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "confirmado")}
                                        className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Confirmar Pedido
                                      </Button>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "cancelado")}
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 border-red-200 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  )}
                                  
                                  {order.status === "confirmado" && (
                                    <>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "preparando")}
                                        className="bg-purple-600 hover:bg-purple-700 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Iniciar Preparo
                                      </Button>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "cancelado")}
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 border-red-200 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  )}
                                  
                                  {order.status === "preparando" && (
                                    <>
                                      <Button
                                        onClick={async () => {
                                          await Order.update(order.id, { 
                                            status: "enviado",
                                            sent_at: new Date().toISOString()
                                          });
                                          loadOrders();
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Enviar para Entrega
                                      </Button>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "cancelado")}
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 border-red-200 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  )}
                                  
                                  {order.status === "enviado" && (
                                    <>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "entregue")}
                                        className="bg-green-600 hover:bg-green-700 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Marcar como Entregue
                                      </Button>
                                      <Button
                                        onClick={() => updateOrderStatus(order.id, "cancelado")}
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700 border-red-200 text-xs md:text-sm flex-1 md:flex-none"
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {orders.length >= orderLimit && (
                <div className="flex justify-center pt-4 pb-2">
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    disabled={isLoadingMore}
                    className="border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800 hover:text-white"
                  >
                    {isLoadingMore ? "Carregando..." : `Carregar Mais Pedidos (+25)`}
                  </Button>
                </div>
              )}

              {filteredOrders.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📦</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    Nenhum pedido encontrado
                  </h3>
                  <p className="text-gray-600">
                    {activeTab === "all" 
                      ? "Você ainda não recebeu nenhum pedido."
                      : `Nenhum pedido com status "${getStatusText(activeTab)}" encontrado.`}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}