import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, MapPin, Truck, Store, LogIn, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAddress } from "@/entities/UserAddress";
import { Coupon } from "@/entities/Coupon";
import { CouponUsage } from "@/entities/CouponUsage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";

export default function OrderModal({ 
  isOpen, 
  onClose, 
  cart = [], 
  total: _total = 0,
  deliveryFee = 0, 
  minOrderValue = 0, 
  deliveryTime = "40-50 min",
  initialTableNumber = "",
  onSubmit,
  isSubmitting = false
}) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isCreatingNewAddress, setIsCreatingNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    name: "Outro Endereço",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    save_address: true,
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  
  const savedMesa = initialTableNumber || (typeof window !== "undefined" ? localStorage.getItem("vrumburguer_table_number") || "" : "");
  const [orderType, setOrderType] = useState(savedMesa ? "dine_in" : "delivery");
  const [tableNumber, setTableNumber] = useState(savedMesa);
  const [customerData, setCustomerData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    payment_method: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (savedMesa) {
      setOrderType("dine_in");
      setTableNumber(savedMesa);
    }
  }, [savedMesa]);

  const subtotal = cart.reduce((sum, item) => {
    const additionalsTotal = item.additionals.reduce((s, ad) => s + ad.price, 0);
    return sum + (item.price + additionalsTotal) * item.quantity;
  }, 0);

  const discountAmount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal, cart) : 0;
  const totalAfterDiscount = subtotal - discountAmount;
  const finalTotal = orderType === 'delivery' ? totalAfterDiscount + deliveryFee : totalAfterDiscount;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData) {
          setCustomerData(prev => ({
            ...prev,
            customer_name: userData.full_name || prev.customer_name || "",
            customer_phone: userData.phone || prev.customer_phone || "",
            customer_email: userData.email || prev.customer_email || ""
          }));

          if (userData?.email || userData?.phone) {
            const allAddrs = await UserAddress.list();
            const userAddresses = (allAddrs || []).filter(a => 
              (userData.email && a.user_email === userData.email) || 
              (userData.phone && a.user_phone === userData.phone)
            );
            setAddresses(userAddresses || []);
            const defaultAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0];
            if (defaultAddress) {
              setSelectedAddress(defaultAddress.id);
              setIsCreatingNewAddress(false);
            } else {
              setIsCreatingNewAddress(true);
            }
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }

      // Se for cliente sem login, carregar dados da última compra salvos no aparelho
      try {
        const savedGuestInfo = JSON.parse(localStorage.getItem("vrumburguer_guest_info") || "null");
        if (savedGuestInfo) {
          setCustomerData(prev => ({
            ...prev,
            customer_name: savedGuestInfo.customer_name || prev.customer_name || "",
            customer_phone: savedGuestInfo.customer_phone || prev.customer_phone || "",
            customer_email: savedGuestInfo.customer_email || prev.customer_email || ""
          }));
          if (savedGuestInfo.addressForm) {
            setNewAddressForm(prev => ({ ...prev, ...savedGuestInfo.addressForm }));
          }
        }
      } catch {}
    };

    if (isOpen) {
      loadUser();
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError("");
      setIsCreatingNewAddress(false);
    }
  }, [isOpen]);

  const handleCepChange = async (e) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '');
    setNewAddressForm(prev => ({ ...prev, cep: raw }));

    if (clean.length === 8) {
      setIsFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setNewAddressForm(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
          if (errors.address) setErrors(p => ({ ...p, address: "" }));
        }
      } catch (_err) {
        console.error("Erro ao buscar CEP:", _err);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  function calculateDiscount(coupon, subtotal, cart) {
    if (coupon.apply_to === 'specific_products') {
      const applicableItemsTotal = cart.reduce((sum, item) => {
        if (coupon.applicable_products.includes(item.id)) {
          const additionalsTotal = item.additionals.reduce((s, ad) => s + ad.price, 0);
          return sum + (item.price + additionalsTotal) * item.quantity;
        }
        return sum;
      }, 0);
      if (coupon.discount_type === 'percentage') return (applicableItemsTotal * coupon.discount_value) / 100;
      return Math.min(coupon.discount_value, applicableItemsTotal);
    } else {
      if (coupon.discount_type === 'percentage') return (subtotal * coupon.discount_value) / 100;
      return Math.min(coupon.discount_value, subtotal);
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError("");
    setAppliedCoupon(null);

    const coupons = await Coupon.filter({ code: couponCode.toUpperCase(), active: true });
    const coupon = coupons[0];

    if (!coupon) { setCouponError("Cupom inválido ou inativo."); return; }
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) { setCouponError("Este cupom expirou."); return; }

    if (coupon.usage_limit && user?.email) {
      const userUsages = await CouponUsage.filter({ coupon_id: coupon.id, user_email: user.email });
      if (userUsages.length >= coupon.usage_limit) { setCouponError("Você já atingiu o limite de uso deste cupom."); return; }
    }

    const totalWithDelivery = orderType === 'delivery' ? subtotal + deliveryFee : subtotal;
    if (coupon.min_order_value > totalWithDelivery) {
      setCouponError(`Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} necessário.`);
      return;
    }

    setAppliedCoupon(coupon);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!customerData.customer_name) newErrors.customer_name = "Nome é obrigatório.";
    if (!customerData.customer_phone) newErrors.customer_phone = "WhatsApp é obrigatório.";

    if (orderType === 'delivery') {
      if (isCreatingNewAddress || (!user && !manualAddress)) {
        if (!newAddressForm.street) newErrors.address = "Informe o nome da rua/logradouro.";
        if (!newAddressForm.number) newErrors.address = "Informe o número do endereço.";
        if (!newAddressForm.neighborhood) newErrors.address = "Informe o bairro.";
        if (!newAddressForm.city) newErrors.address = "Informe a cidade.";
      } else if (user) {
        if (!selectedAddress || selectedAddress === "new_address") newErrors.address = "Selecione ou cadastre um endereço.";
      } else {
        if (!manualAddress) newErrors.address = "Informe seu endereço de entrega.";
      }
    }

    if (orderType === 'dine_in' && !tableNumber.trim()) {
      newErrors.table_number = "Informe o número da mesa onde você está acomodado.";
    }
    if (!customerData.payment_method) newErrors.payment_method = "Método de pagamento é obrigatório.";
    if (finalTotal < minOrderValue) newErrors.total = `O valor mínimo do pedido é de R$ ${minOrderValue.toFixed(2).replace('.', ',')}.`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let deliveryAddress = "";
    if (orderType === 'delivery') {
      if (isCreatingNewAddress) {
        deliveryAddress = `${newAddressForm.street}, ${newAddressForm.number}${newAddressForm.complement ? ` (${newAddressForm.complement})` : ''} - ${newAddressForm.neighborhood}, ${newAddressForm.city}/${newAddressForm.state}`;
        
        // Salvar endereço no perfil se o usuário estiver logado e marcou para salvar
        if (user?.email && newAddressForm.save_address) {
          try {
            await UserAddress.create({
              user_email: user.email,
              name: newAddressForm.name || "Outro Endereço",
              cep: newAddressForm.cep,
              street: newAddressForm.street,
              number: newAddressForm.number,
              complement: newAddressForm.complement,
              neighborhood: newAddressForm.neighborhood,
              city: newAddressForm.city,
              state: newAddressForm.state,
              is_default: addresses.length === 0,
            });
          } catch (err) {
            console.error("Erro ao salvar endereço:", err);
          }
        }
      } else if (user) {
        const addr = addresses.find(a => a.id === selectedAddress);
        deliveryAddress = addr ? `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ''} - ${addr.neighborhood}, ${addr.city}/${addr.state}` : "";
      } else {
        deliveryAddress = manualAddress;
      }
    }

    const orderData = {
      ...customerData,
      user_email: user?.email,
      customer_address: deliveryAddress,
      total_amount: finalTotal,
      items: cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: (item.price + (item.additionals || []).reduce((s, a) => s + (a.price || 0), 0)) * item.quantity,
        additionals: item.additionals || [],
      })),
      status: "pendente",
      coupon_code: appliedCoupon?.code,
      discount_amount: discountAmount,
      order_type: orderType === 'takeaway' ? 'pickup' : (orderType === 'dine_in' ? 'dine_in' : 'delivery'),
      table_number: orderType === 'takeaway' 
        ? 'Balcão' 
        : (orderType === 'dine_in' ? (tableNumber.toLowerCase().includes('mesa') ? tableNumber : `Mesa ${tableNumber}`) : null),
    };

    await onSubmit(orderData);

    try {
      localStorage.setItem("vrumburguer_guest_info", JSON.stringify({
        customer_name: customerData.customer_name,
        customer_phone: customerData.customer_phone,
        customer_email: customerData.customer_email,
        addressForm: newAddressForm
      }));
    } catch {}

    if (user && !user.phone && customerData.customer_phone) {
      try { await base44.auth.updateMe({ phone: customerData.customer_phone }); } catch {}
    }
  };

  const formatPhone = (value) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const handleInputChange = (field, value) => {
    const finalValue = field === 'customer_phone' ? formatPhone(value) : value;
    setCustomerData(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-stone-200">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">Finalizar Pedido</DialogTitle>
        </DialogHeader>

        {errors.total && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.total}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <Tabs value={orderType} onValueChange={(val) => {
            setOrderType(val);
            if (errors.table_number) setErrors(prev => ({ ...prev, table_number: "" }));
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-stone-100 h-auto gap-1">
              <TabsTrigger value="delivery" className="rounded-xl font-bold text-[11px] sm:text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600">
                <Truck className="w-3.5 h-3.5 mr-1.5 shrink-0"/>Delivery
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="rounded-xl font-bold text-[11px] sm:text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700">
                <Store className="w-3.5 h-3.5 mr-1.5 shrink-0"/>Retirada
              </TabsTrigger>
              <TabsTrigger value="dine_in" className="rounded-xl font-bold text-[11px] sm:text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
                <span className="text-sm mr-1">🍽️</span>Na Mesa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delivery" className="space-y-3 pt-2">
              <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 rounded-2xl text-xs text-amber-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Entrega no seu endereço</span>
                </span>
                <span className="bg-white font-bold text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[11px] shadow-sm">
                  ⏱️ {deliveryTime}
                </span>
              </div>

              {/* Se o usuário estiver no modo de cadastrar/digitar outro endereço */}
              {isCreatingNewAddress ? (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span className="font-bold text-sm text-gray-900">Novo Endereço de Entrega</span>
                    </div>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewAddress(false);
                          if (addresses.length > 0) setSelectedAddress(addresses[0].id);
                        }}
                        className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Usar Salvo
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <Label htmlFor="addr-name" className="text-xs font-semibold text-gray-700">Identificação do Local</Label>
                      <Input
                        id="addr-name"
                        value={newAddressForm.name}
                        onChange={e => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                        placeholder="Ex: Trabalho, Casa da Namorada"
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="addr-cep" className="text-xs font-semibold text-gray-700">CEP</Label>
                        {isFetchingCep && (
                          <span className="text-[10px] text-red-600 flex items-center gap-0.5 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando
                          </span>
                        )}
                      </div>
                      <Input
                        id="addr-cep"
                        value={newAddressForm.cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <Label htmlFor="addr-street" className="text-xs font-semibold text-gray-700">Rua / Logradouro *</Label>
                      <Input
                        id="addr-street"
                        value={newAddressForm.street}
                        onChange={e => setNewAddressForm({ ...newAddressForm, street: e.target.value })}
                        placeholder="Nome da rua ou avenida"
                        required
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-num" className="text-xs font-semibold text-gray-700">Número *</Label>
                      <Input
                        id="addr-num"
                        value={newAddressForm.number}
                        onChange={e => setNewAddressForm({ ...newAddressForm, number: e.target.value })}
                        placeholder="123"
                        required
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <Label htmlFor="addr-comp" className="text-xs font-semibold text-gray-700">Complemento</Label>
                      <Input
                        id="addr-comp"
                        value={newAddressForm.complement}
                        onChange={e => setNewAddressForm({ ...newAddressForm, complement: e.target.value })}
                        placeholder="Apto, Bloco..."
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-neigh" className="text-xs font-semibold text-gray-700">Bairro *</Label>
                      <Input
                        id="addr-neigh"
                        value={newAddressForm.neighborhood}
                        onChange={e => setNewAddressForm({ ...newAddressForm, neighborhood: e.target.value })}
                        placeholder="Bairro"
                        required
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-city" className="text-xs font-semibold text-gray-700">Cidade/UF *</Label>
                      <Input
                        id="addr-city"
                        value={newAddressForm.city ? `${newAddressForm.city}${newAddressForm.state ? `/${newAddressForm.state}` : ''}` : ''}
                        onChange={e => {
                          const parts = e.target.value.split('/');
                          setNewAddressForm({ 
                            ...newAddressForm, 
                            city: parts[0] || e.target.value,
                            state: parts[1] || newAddressForm.state
                          });
                        }}
                        placeholder="Cidade/UF"
                        required
                        className="mt-1 bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                  </div>

                  {user?.email && (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <Checkbox
                        checked={newAddressForm.save_address}
                        onCheckedChange={c => setNewAddressForm({ ...newAddressForm, save_address: !!c })}
                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        Salvar este endereço para futuros pedidos
                      </span>
                    </label>
                  )}

                  {errors.address && <p className="text-red-500 text-xs font-semibold">{errors.address}</p>}
                </div>
              ) : user && addresses.length > 0 ? (
                // Usuário logado: Seletor de Endereços Salvos + Opção de Novo Endereço
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-700">Endereço de entrega *</Label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewAddress(true)}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Outro Endereço
                    </button>
                  </div>

                  <Select 
                    value={selectedAddress} 
                    onValueChange={(val) => {
                      if (val === "new_address") {
                        setIsCreatingNewAddress(true);
                      } else {
                        setSelectedAddress(val);
                      }
                    }}
                  >
                    <SelectTrigger className={`rounded-xl h-auto py-2.5 ${errors.address ? "border-red-500" : "border-stone-200"}`}>
                      <SelectValue placeholder="Selecione um endereço" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {addresses.map((address) => (
                        <SelectItem key={address.id} value={address.id} className="py-2 cursor-pointer">
                          <div className="flex items-start gap-2.5 text-left">
                            <MapPin className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-gray-900">{address.name}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {address.street}, {address.number}{address.complement ? ` (${address.complement})` : ''} - {address.neighborhood}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}

                      {/* Opção para cadastrar outro endereço */}
                      <SelectItem value="new_address" className="border-t mt-1 font-bold text-red-600 bg-red-50/60 focus:bg-red-50 focus:text-red-700 py-2.5 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-red-600" />
                          <span>+ Entregar em outro endereço</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              ) : (
                // Sem login ou sem endereços cadastrados: formulário direto
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-700">Endereço de entrega *</Label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewAddress(true)}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Detalhar Endereço
                    </button>
                  </div>
                  <Input
                    value={manualAddress}
                    onChange={(e) => { setManualAddress(e.target.value); if (errors.address) setErrors(p => ({...p, address: ""})); }}
                    placeholder="Rua, número, complemento, bairro, cidade..."
                    className={`rounded-xl text-sm ${errors.address ? "border-red-500" : ""}`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  
                  <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                    <LogIn className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      <button type="button" onClick={() => base44.auth.redirectToLogin()} className="font-semibold underline">Faça login</button> para salvar seus endereços e usar cupons.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="takeaway" className="space-y-3 pt-2">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <span className="text-lg">🥡</span>
                  <span>Retirada no Balcão</span>
                </div>
                <p className="text-amber-900/90 text-xs leading-relaxed">
                  Faça seu pedido agora e passe para retirar quando estiver pronto! Nós avisaremos no seu WhatsApp assim que sair da cozinha.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Sem taxa de entrega</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dine_in" className="space-y-3 pt-2">
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 rounded-2xl text-xs space-y-2 mb-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <span className="text-lg">🍽️</span>
                  <span>Consumo no Salão (Na Mesa)</span>
                </div>
                <p className="text-emerald-900/90 text-xs leading-relaxed">
                  Já está acomodado no restaurante? Informe sua mesa abaixo e nosso garçom levará o pedido quentinho até você!
                </p>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-gray-700">Número da sua Mesa *</Label>
                <Input
                  value={tableNumber}
                  onChange={(e) => {
                    setTableNumber(e.target.value);
                    if (errors.table_number) setErrors(prev => ({ ...prev, table_number: "" }));
                  }}
                  placeholder="Ex: 04 ou Mesa 12"
                  className={`rounded-xl mt-1.5 h-11 text-sm bg-white ${errors.table_number ? "border-red-500" : "border-stone-300"}`}
                />
                {errors.table_number && <p className="text-red-500 text-xs mt-1 font-medium">{errors.table_number}</p>}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={customerData.customer_name}
                onChange={(e) => handleInputChange('customer_name', e.target.value)}
                className={errors.customer_name ? "border-red-500" : ""}
              />
              {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
            </div>
            <div>
              <Label>WhatsApp *</Label>
              <Input
                value={customerData.customer_phone}
                onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={errors.customer_phone ? "border-red-500" : ""}
              />
              {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone}</p>}
            </div>
            <div>
              <Label>Método de pagamento *</Label>
              <Select value={customerData.payment_method} onValueChange={(v) => handleInputChange('payment_method', v)}>
                <SelectTrigger className={errors.payment_method ? "border-red-500" : ""}>
                  <SelectValue placeholder="Escolha o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão (máquina na entrega)</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={customerData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações sobre o pedido..."
              />
            </div>
          </div>

          <Separator />

          {/* Cupom de Desconto */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <Label className="text-xs font-bold text-gray-700">Cupom de Desconto</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                placeholder="INSIRA SEU CUPOM"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
                className="bg-white uppercase font-bold text-xs h-10 rounded-xl"
              />
              <Button type="button" onClick={handleApplyCoupon} disabled={!!appliedCoupon} className="h-10 px-4 text-xs font-bold bg-stone-900 hover:bg-black text-white rounded-xl">
                {appliedCoupon ? "Aplicado!" : "Aplicar"}
              </Button>
            </div>
            {couponError && <p className="text-red-500 text-xs mt-1 font-medium">{couponError}</p>}
            {appliedCoupon && <p className="text-emerald-600 text-xs mt-1 font-bold">✓ Cupom "{appliedCoupon.name}" aplicado!</p>}
          </div>

          <Separator />

          <div className="space-y-1.5 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80">
            <h3 className="font-bold text-xs uppercase text-gray-700 tracking-wider">Resumo do pedido</h3>
            <div className="space-y-1.5 text-xs sm:text-sm pt-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Desconto ({appliedCoupon.code})</span>
                  <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-300 flex justify-between font-black text-base sm:text-lg">
                <span>Total</span>
                <span className="text-red-600">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl text-sm font-semibold" disabled={isSubmitting}>
              Voltar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg"
              disabled={isSubmitting || finalTotal < minOrderValue}
            >
              {isSubmitting ? "Enviando..." : "Confirmar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}