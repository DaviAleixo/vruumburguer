import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, MapPin, Truck, Store, LogIn, Plus, ArrowLeft, Loader2, Pencil, User as UserIcon, CheckCircle2, QrCode, CreditCard, Banknote, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@/entities/User";
import { UserAddress } from "@/entities/UserAddress";
import { Coupon } from "@/entities/Coupon";
import { CouponUsage } from "@/entities/CouponUsage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
  const nameInputRef = useRef(null);
  
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
  const [changeFor, setChangeFor] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [phoneLookupFeedback, setPhoneLookupFeedback] = useState("");
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

      // Se for cliente sem login, carregar dados da última compra salvos no aparelho ou buscar no banco
      try {
        const savedGuestInfo = JSON.parse(localStorage.getItem("vrumburguer_guest_info") || "null");
        const savedPhone = localStorage.getItem("vrumburguer_customer_phone");
        if (savedGuestInfo) {
          setCustomerData(prev => ({
            ...prev,
            customer_name: savedGuestInfo.customer_name || prev.customer_name || "",
            customer_phone: savedGuestInfo.customer_phone || (savedPhone ? formatPhone(savedPhone) : "") || prev.customer_phone || "",
            customer_email: savedGuestInfo.customer_email || prev.customer_email || ""
          }));
          if (savedGuestInfo.addressForm) {
            setNewAddressForm(prev => ({ ...prev, ...savedGuestInfo.addressForm }));
          }
          if ((!savedGuestInfo.customer_name || savedGuestInfo.customer_name === "Cliente") && (savedGuestInfo.customer_phone || savedPhone)) {
            lookupCustomerByPhone(savedGuestInfo.customer_phone || savedPhone);
          }
        } else if (savedPhone) {
          setCustomerData(prev => ({
            ...prev,
            customer_phone: formatPhone(savedPhone)
          }));
          lookupCustomerByPhone(savedPhone);
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
    const clean = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5, 8)}` : clean;
    setNewAddressForm(prev => ({ ...prev, cep: formatted }));

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
            state: data.uf || prev.state || "MG",
          }));
          if (errors.address) setErrors(p => ({ ...p, address: "" }));
          setTimeout(() => {
            document.getElementById("addr-num")?.focus();
          }, 100);
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
    if (!customerData.customer_name || !customerData.customer_name.trim()) {
      newErrors.customer_name = "Nome completo é obrigatório para fazer o pedido.";
    }

    const cleanDigits = (customerData.customer_phone || "").replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      newErrors.customer_phone = "Telefone / WhatsApp com DDD é obrigatório (mínimo 10 dígitos).";
    }

    if (orderType === 'delivery') {
      if (addresses.length > 0 && selectedAddress && selectedAddress !== "new_address" && !isCreatingNewAddress) {
        // Endereço selecionado da lista de salvos
      } else {
        // Formulário de endereço digitado
        if (!newAddressForm.street?.trim()) {
          newErrors.address = "Informe a rua / logradouro de entrega.";
        } else if (!newAddressForm.number?.trim()) {
          newErrors.address = "Informe o número do endereço de entrega.";
        } else if (!newAddressForm.neighborhood?.trim()) {
          newErrors.address = "Informe o bairro.";
        } else if (!newAddressForm.city?.trim()) {
          newErrors.address = "Informe a cidade.";
        }
      }
    }

    if (orderType === 'dine_in' && (!tableNumber || !tableNumber.trim())) {
      newErrors.table_number = "Informe o número da sua mesa.";
    }
    if (!customerData.payment_method) {
      newErrors.payment_method = "Selecione a forma de pagamento.";
    }
    if (finalTotal < minOrderValue) {
      newErrors.total = `O valor mínimo do pedido é de R$ ${minOrderValue.toFixed(2).replace('.', ',')}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let deliveryAddress = "";
    if (orderType === 'delivery') {
      if (addresses.length > 0 && selectedAddress && selectedAddress !== "new_address" && !isCreatingNewAddress) {
        const addr = addresses.find(a => a.id === selectedAddress);
        if (addr) {
          deliveryAddress = `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ''} - ${addr.neighborhood}, ${addr.city}/${addr.state || 'MG'}`;
        }
      } 
      
      if (!deliveryAddress) {
        if (newAddressForm.street?.trim()) {
          deliveryAddress = `${newAddressForm.street.trim()}, ${newAddressForm.number?.trim() || 'S/N'}${newAddressForm.complement?.trim() ? ` (${newAddressForm.complement.trim()})` : ''} - ${newAddressForm.neighborhood?.trim() || ''}, ${newAddressForm.city?.trim() || ''}${newAddressForm.state ? `/${newAddressForm.state.trim()}` : ''}`;
        } else if (manualAddress?.trim()) {
          deliveryAddress = manualAddress.trim();
        }
      }

      if (!deliveryAddress) {
        setErrors(prev => ({ ...prev, address: "Informe a rua e o número de entrega." }));
        return;
      }

      // Salvar endereço no perfil se o usuário estiver logado e marcou para salvar
      if (user?.email && newAddressForm.save_address && newAddressForm.street) {
        try {
          await UserAddress.create({
            user_email: user.email,
            user_phone: customerData.customer_phone,
            name: newAddressForm.name || "Outro Endereço",
            cep: newAddressForm.cep,
            street: newAddressForm.street.trim(),
            number: newAddressForm.number?.trim() || "S/N",
            complement: newAddressForm.complement,
            neighborhood: newAddressForm.neighborhood?.trim() || "",
            city: newAddressForm.city?.trim() || "",
            state: newAddressForm.state || "MG",
            is_default: addresses.length === 0,
          });
        } catch (err) {
          console.error("Erro ao salvar endereço:", err);
        }
      }
    }

    const finalNotes = customerData.notes 
      ? (customerData.payment_method === 'dinheiro' && changeFor.trim() ? `${customerData.notes} | Troco para: ${changeFor.trim()}` : customerData.notes)
      : (customerData.payment_method === 'dinheiro' && changeFor.trim() ? `Troco para: ${changeFor.trim()}` : "");

    const orderData = {
      ...customerData,
      notes: finalNotes,
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
      if (customerData.customer_phone) {
        localStorage.setItem("vrumburguer_customer_phone", customerData.customer_phone);
      }
      localStorage.setItem("vrumburguer_guest_info", JSON.stringify({
        customer_name: customerData.customer_name,
        customer_phone: customerData.customer_phone,
        customer_email: customerData.customer_email,
        addressForm: newAddressForm
      }));

      // Salva o endereço vinculado ao telefone no banco de dados para futuras compras
      if (orderType === 'delivery' && newAddressForm.street && customerData.customer_phone) {
        const cleanPhone = customerData.customer_phone.replace(/\D/g, "");
        const allAddrs = await UserAddress.list();
        const existing = (allAddrs || []).find(a => 
          a.user_phone && a.user_phone.replace(/\D/g, "") === cleanPhone &&
          a.street?.toLowerCase() === newAddressForm.street?.toLowerCase() &&
          a.number === newAddressForm.number
        );
        if (!existing) {
          await UserAddress.create({
            user_phone: customerData.customer_phone,
            user_email: customerData.customer_email || `cliente_${cleanPhone}@cliente.vrumburguer.com`,
            name: newAddressForm.name || "Endereço de Entrega",
            street: newAddressForm.street,
            number: newAddressForm.number,
            neighborhood: newAddressForm.neighborhood,
            city: newAddressForm.city || "Contagem",
            state: newAddressForm.state || "MG",
            complement: newAddressForm.complement || "",
            reference: newAddressForm.reference || "",
            cep: newAddressForm.cep || "",
            is_default: true,
          });
        }
      }
    } catch (saveErr) {
      console.warn("Erro ao salvar dados locais/banco do cliente:", saveErr);
    }

    if (user && !user.phone && customerData.customer_phone) {
      try { await base44.auth.updateMe({ phone: customerData.customer_phone }); } catch {}
    }
  };

  const [showCustomerConfirm, setShowCustomerConfirm] = useState(false);
  const [customerModalData, setCustomerModalData] = useState(null);
  const [lastSearchedPhone, setLastSearchedPhone] = useState("");

  const formatPhone = (value) => {
    if (!value) return "";
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const parseAddressString = (addrStr) => {
    if (!addrStr || typeof addrStr !== 'string') return null;
    try {
      let street = "";
      let number = "";
      let complement = "";
      let neighborhood = "";
      let city = "";
      let state = "MG";
      let cep = "";

      // Extrair CEP se presente
      const cepMatch = addrStr.match(/\b\d{5}-?\d{3}\b/);
      if (cepMatch) {
        cep = cepMatch[0];
        if (cep.length === 8 && !cep.includes("-")) {
          cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
        }
      }

      // Padrão: "Rua X, 123 (Apto 4) - Bairro, Cidade/UF"
      if (addrStr.includes(" - ")) {
        const parts = addrStr.split(" - ");
        const streetPart = parts[0] || "";
        const remaining = parts.slice(1).join(" - ");

        const match = streetPart.match(/^(.+?),\s*([0-9A-Za-z\s/ºª-]+?)(?:\s*\((.*?)\))?$/);
        if (match) {
          street = match[1].trim();
          number = match[2].trim();
          complement = match[3] ? match[3].trim() : "";
        } else {
          street = streetPart.trim();
        }

        if (remaining) {
          const cityParts = remaining.split(",");
          neighborhood = cityParts[0]?.trim() || "";
          if (cityParts[1]) {
            const cs = cityParts[1].split("/");
            city = cs[0]?.trim() || "";
            state = cs[1]?.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "MG";
          }
        }
      } else if (addrStr.includes(",")) {
        // Padrão: "Rua X, 123, Bairro, Cidade"
        const commaParts = addrStr.split(",").map(p => p.trim());
        street = commaParts[0] || "";
        number = commaParts[1] || "";
        neighborhood = commaParts[2] || "";
        city = commaParts[3] || "";
      } else {
        street = addrStr.trim();
      }

      return { street, number, complement, neighborhood, city, state: state || "MG", cep };
    } catch {
      return null;
    }
  };

  const lookupCustomerByPhone = async (phoneStr) => {
    if (!phoneStr) return;
    const cleanDigits = phoneStr.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setPhoneLookupFeedback("");
      return;
    }

    if (cleanDigits === lastSearchedPhone) return;
    setLastSearchedPhone(cleanDigits);

    setIsSearchingPhone(true);
    try {
      let foundName = "";
      let foundEmail = "";
      let foundAddress = "";
      let phoneAddrs = [];
      let parsedAddress = null;

      // 1. Tentar Banco de Dados Supabase (se configurado)
      if (isSupabaseConfigured() && supabase) {
        // 1.1 RPC
        try {
          const { data, error } = await supabase.rpc("lookup_customer_by_phone", {
            p_phone: phoneStr
          });
          if (!error && data && data.length > 0) {
            const client = data[0];
            if (client.customer_name && client.customer_name !== "Cliente") foundName = client.customer_name;
            if (client.customer_email) foundEmail = client.customer_email;
            if (client.delivery_address) foundAddress = client.delivery_address;
          }
        } catch {}

        // 1.2 Tabela users
        if (!foundName) {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("full_name,email")
              .ilike("phone", `%${cleanDigits.slice(-8)}%`)
              .limit(1);
            if (userData && userData[0]?.full_name && userData[0].full_name !== "Cliente") {
              foundName = userData[0].full_name;
              if (userData[0].email) foundEmail = userData[0].email;
            }
          } catch {}
        }

        // 1.3 Tabela user_addresses
        try {
          const { data: dbAddrs } = await supabase
            .from("user_addresses")
            .select("*")
            .or(`user_phone.ilike.%${cleanDigits.slice(-8)}%,user_email.ilike.%${cleanDigits.slice(-8)}%`);
          if (dbAddrs && dbAddrs.length > 0) {
            phoneAddrs = dbAddrs;
          }
        } catch {}

        // 1.4 Tabela orders (pega nome e endereço mais recente)
        if (!foundName || (!foundAddress && phoneAddrs.length === 0)) {
          try {
            const { data: orderData } = await supabase
              .from("orders")
              .select("customer_name,customer_email,delivery_address,customer_address")
              .ilike("customer_phone", `%${cleanDigits.slice(-8)}%`)
              .order("created_date", { ascending: false })
              .limit(3);
            if (orderData && orderData.length > 0) {
              const bestOrder = orderData.find(o => o.customer_name && o.customer_name !== "Cliente") || orderData[0];
              if (!foundName && bestOrder.customer_name && bestOrder.customer_name !== "Cliente") {
                foundName = bestOrder.customer_name;
              }
              if (!foundEmail && bestOrder.customer_email) {
                foundEmail = bestOrder.customer_email;
              }
              const addr = bestOrder.delivery_address || bestOrder.customer_address;
              if (!foundAddress && addr) {
                foundAddress = addr;
              }
            }
          } catch {}
        }
      }

      // 2. Fallbacks em memória / local storage
      if (phoneAddrs.length === 0) {
        try {
          const allAddrs = await UserAddress.list();
          phoneAddrs = (allAddrs || []).filter(a => 
            (a.user_phone && a.user_phone.replace(/\D/g, "").slice(-8) === cleanDigits.slice(-8)) ||
            (foundEmail && a.user_email === foundEmail)
          );
        } catch {}
      }

      if (!foundName || !foundAddress) {
        try {
          const allOrders = await Order.list("-created_date");
          const matchOrder = (allOrders || []).find(o => 
            o.customer_phone && o.customer_phone.replace(/\D/g, "").slice(-8) === cleanDigits.slice(-8)
          );
          if (matchOrder) {
            if (!foundName && matchOrder.customer_name && matchOrder.customer_name !== "Cliente") {
              foundName = matchOrder.customer_name;
            }
            const oAddr = matchOrder.delivery_address || matchOrder.customer_address;
            if (!foundAddress && oAddr) {
              foundAddress = oAddr;
            }
          }
        } catch {}
      }

      // 3. Fallback do localStorage do próprio aparelho
      try {
        const guestInfo = JSON.parse(localStorage.getItem("vrumburguer_guest_info") || "null");
        if (guestInfo) {
          const gPhoneClean = (guestInfo.customer_phone || "").replace(/\D/g, "");
          if (gPhoneClean && gPhoneClean.slice(-8) === cleanDigits.slice(-8)) {
            if (!foundName && guestInfo.customer_name && guestInfo.customer_name !== "Cliente") {
              foundName = guestInfo.customer_name;
            }
            if (guestInfo.addressForm && guestInfo.addressForm.street && !foundAddress && phoneAddrs.length === 0) {
              parsedAddress = guestInfo.addressForm;
            }
          }
        }
      } catch {}

      // 4. Preencher Nome do Cliente
      if (foundName) {
        setCustomerData(prev => ({
          ...prev,
          customer_name: foundName,
          customer_email: foundEmail || prev.customer_email
        }));
      }

      // 5. Preencher Endereço no Formulário e na Lista
      let resolvedAddressString = "";
      if (phoneAddrs.length > 0) {
        setAddresses(phoneAddrs);
        const defaultAddr = phoneAddrs.find(a => a.is_default) || phoneAddrs[0];
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id);
          setIsCreatingNewAddress(false);
          setNewAddressForm({
            name: defaultAddr.name || "Meu Endereço",
            street: defaultAddr.street || "",
            number: defaultAddr.number || "",
            neighborhood: defaultAddr.neighborhood || "",
            city: defaultAddr.city || "Contagem",
            state: defaultAddr.state || "MG",
            complement: defaultAddr.complement || "",
            reference: defaultAddr.reference || "",
            cep: defaultAddr.cep || defaultAddr.zip_code || "",
            save_address: true,
          });
          resolvedAddressString = `${defaultAddr.street}, ${defaultAddr.number}${defaultAddr.complement ? ` (${defaultAddr.complement})` : ''} - ${defaultAddr.neighborhood}, ${defaultAddr.city}/${defaultAddr.state || 'MG'}`;
          setManualAddress(resolvedAddressString);
        }
      } else if (foundAddress) {
        resolvedAddressString = foundAddress;
        setManualAddress(foundAddress);
        const parsed = parseAddressString(foundAddress);
        if (parsed && parsed.street) {
          parsedAddress = parsed;
          setNewAddressForm(prev => ({
            ...prev,
            street: parsed.street || prev.street,
            number: parsed.number || prev.number,
            neighborhood: parsed.neighborhood || prev.neighborhood,
            city: parsed.city || prev.city,
            state: parsed.state || prev.state,
            complement: parsed.complement || prev.complement,
            cep: parsed.cep || prev.cep,
          }));
        }
      } else if (parsedAddress) {
        setNewAddressForm(prev => ({
          ...prev,
          ...parsedAddress
        }));
        resolvedAddressString = `${parsedAddress.street}, ${parsedAddress.number} - ${parsedAddress.neighborhood}, ${parsedAddress.city}`;
      }

      // 6. Login Automático com o Telefone
      try {
        const logged = await User.loginWithPhone(phoneStr, foundName || customerData.customer_name || "Cliente");
        if (logged) setUser(logged);
      } catch {}

      // 7. Se encontramos dados prévios (nome ou endereço), abrir modal de confirmação
      if (foundName || resolvedAddressString || phoneAddrs.length > 0) {
        setPhoneLookupFeedback(`✓ Conectado como ${foundName || 'Cliente'}!`);
        setCustomerModalData({
          name: foundName || customerData.customer_name || "Cliente",
          phone: phoneStr,
          addressString: resolvedAddressString || (newAddressForm.street ? `${newAddressForm.street}, ${newAddressForm.number} - ${newAddressForm.neighborhood}, ${newAddressForm.city}` : "")
        });
        setShowCustomerConfirm(true);
      } else {
        setPhoneLookupFeedback("✓ Número verificado!");
      }
    } catch (_err) {
      console.warn("Erro ao buscar dados do cliente por telefone:", _err);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const handleInputChange = (field, value) => {
    const finalValue = field === 'customer_phone' ? formatPhone(value) : value;
    setCustomerData(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));

    if (field === 'customer_phone') {
      const digits = finalValue.replace(/\D/g, "");
      if (digits.length >= 10) {
        lookupCustomerByPhone(finalValue);
      } else {
        setPhoneLookupFeedback("");
      }
    }
  };

  const handleConfirmCustomerModal = () => {
    setShowCustomerConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border-stone-200">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Finalizar Pedido</DialogTitle>
        </DialogHeader>

        {errors.total && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.total}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* 1º BLOCO: IDENTIFICAÇÃO DO CLIENTE (WHATSAPP & NOME EM PRIMEIRO LUGAR) */}
          <div className="bg-stone-50/90 p-4 rounded-2xl border border-stone-200/90 space-y-3 shadow-xs">
            {/* WhatsApp / Celular */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-bold uppercase text-gray-700">WhatsApp / Celular *</Label>
                {isSearchingPhone && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando cadastro...
                  </span>
                )}
                {phoneLookupFeedback && (
                  <span className="text-[10px] text-emerald-600 font-bold animate-fade-in">
                    {phoneLookupFeedback}
                  </span>
                )}
              </div>
              <Input
                value={customerData.customer_phone}
                onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={`rounded-xl h-11 text-base sm:text-sm bg-white ${errors.customer_phone ? "border-red-500" : (phoneLookupFeedback ? "border-emerald-500 ring-1 ring-emerald-400/30" : "border-stone-300")}`}
              />
              {errors.customer_phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.customer_phone}</p>}
            </div>

            {/* Nome Completo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-bold uppercase text-gray-700">Nome completo *</Label>
                <button
                  type="button"
                  onClick={() => {
                    nameInputRef.current?.focus();
                    nameInputRef.current?.select();
                  }}
                  className="text-[11px] text-stone-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3 h-3 text-stone-400" />
                  <span>Alterar</span>
                </button>
              </div>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  value={customerData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  placeholder="Seu nome completo"
                  className={`pr-9 rounded-xl h-11 text-base sm:text-sm bg-white ${errors.customer_name ? "border-red-500" : "border-stone-300"}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    nameInputRef.current?.focus();
                    nameInputRef.current?.select();
                  }}
                  title="Clique para editar seu nome"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-600 transition-colors p-1"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {errors.customer_name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.customer_name}</p>}
            </div>
          </div>

          {/* 2º BLOCO: OPÇÕES DE ENTREGA (DELIVERY, RETIRADA, NA MESA) */}
          <Tabs value={orderType} onValueChange={(val) => {
            setOrderType(val);
            if (errors.table_number) setErrors(prev => ({ ...prev, table_number: "" }));
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-stone-100 h-auto gap-1">
              <TabsTrigger value="delivery" className="rounded-xl font-bold text-xs sm:text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-600">
                <Truck className="w-4 h-4 mr-1.5 shrink-0"/>Delivery
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="rounded-xl font-bold text-xs sm:text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700">
                <Store className="w-4 h-4 mr-1.5 shrink-0"/>Retirada
              </TabsTrigger>
              <TabsTrigger value="dine_in" className="rounded-xl font-bold text-xs sm:text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
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

              {/* Se o cliente tiver endereços salvos e não estiver cadastrando outro */}
              {addresses.length > 0 && !isCreatingNewAddress ? (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-bold uppercase text-gray-700">Endereço de entrega *</Label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewAddress(true)}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
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
                    <SelectTrigger className={`rounded-xl h-auto py-2.5 bg-white ${errors.address ? "border-red-500" : "border-stone-200"}`}>
                      <SelectValue placeholder="Selecione um endereço" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {addresses.map((address) => (
                        <SelectItem key={address.id} value={address.id} className="py-2 cursor-pointer">
                          <div className="flex items-start gap-2.5 text-left">
                            <MapPin className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-gray-900">{address.name || "Endereço"}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {address.street}, {address.number}{address.complement ? ` (${address.complement})` : ''} - {address.neighborhood}
                              </p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}

                      <SelectItem value="new_address" className="border-t mt-1 font-bold text-red-600 bg-red-50/60 focus:bg-red-50 focus:text-red-700 py-2.5 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-red-600" />
                          <span>+ Cadastrar outro endereço</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              ) : (
                // Formulário estruturado com CEP (padrão para todos os clientes sem login ou com novo endereço)
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span className="font-bold text-sm text-gray-900">Endereço de Entrega</span>
                    </div>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewAddress(false);
                          if (addresses.length > 0) setSelectedAddress(addresses[0].id);
                        }}
                        className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Usar Salvo
                      </button>
                    )}
                  </div>

                  {/* CEP e Identificação */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="addr-cep" className="text-xs font-bold text-gray-700">CEP</Label>
                        {isFetchingCep && (
                          <span className="text-[10px] text-red-600 flex items-center gap-0.5 animate-pulse font-semibold">
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
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="addr-name" className="text-xs font-bold text-gray-700">Identificação do Local (Opcional)</Label>
                      <Input
                        id="addr-name"
                        value={newAddressForm.name}
                        onChange={e => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                        placeholder="Ex: Minha Casa, Trabalho"
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* Rua e Número */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <Label htmlFor="addr-street" className="text-xs font-bold text-gray-700">Rua / Logradouro *</Label>
                      <Input
                        id="addr-street"
                        value={newAddressForm.street}
                        onChange={e => {
                          setNewAddressForm({ ...newAddressForm, street: e.target.value });
                          if (errors.address) setErrors(p => ({ ...p, address: "" }));
                        }}
                        placeholder="Nome da rua ou avenida"
                        required
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-num" className="text-xs font-bold text-gray-700">Número *</Label>
                      <Input
                        id="addr-num"
                        value={newAddressForm.number}
                        onChange={e => {
                          setNewAddressForm({ ...newAddressForm, number: e.target.value });
                          if (errors.address) setErrors(p => ({ ...p, address: "" }));
                        }}
                        placeholder="123"
                        required
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* Complemento e Bairro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <Label htmlFor="addr-comp" className="text-xs font-bold text-gray-700">Complemento (Opcional)</Label>
                      <Input
                        id="addr-comp"
                        value={newAddressForm.complement}
                        onChange={e => setNewAddressForm({ ...newAddressForm, complement: e.target.value })}
                        placeholder="Apto, Bloco, Casa 2..."
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-neigh" className="text-xs font-bold text-gray-700">Bairro *</Label>
                      <Input
                        id="addr-neigh"
                        value={newAddressForm.neighborhood}
                        onChange={e => {
                          setNewAddressForm({ ...newAddressForm, neighborhood: e.target.value });
                          if (errors.address) setErrors(p => ({ ...p, address: "" }));
                        }}
                        placeholder="Bairro"
                        required
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                  </div>

                  {/* Cidade e UF */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <Label htmlFor="addr-city" className="text-xs font-bold text-gray-700">Cidade *</Label>
                      <Input
                        id="addr-city"
                        value={newAddressForm.city}
                        onChange={e => {
                          setNewAddressForm(p => ({ ...p, city: e.target.value }));
                          if (errors.address) setErrors(p => ({ ...p, address: "" }));
                        }}
                        placeholder="Cidade"
                        required
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-state" className="text-xs font-bold text-gray-700">UF *</Label>
                      <Input
                        id="addr-state"
                        value={newAddressForm.state}
                        onChange={e => {
                          setNewAddressForm(p => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }));
                          if (errors.address) setErrors(p => ({ ...p, address: "" }));
                        }}
                        placeholder="MG"
                        maxLength={2}
                        required
                        className="mt-1 bg-white rounded-xl text-base sm:text-xs h-10 uppercase text-center font-bold"
                      />
                    </div>
                  </div>

                  {errors.address && <p className="text-red-500 text-xs font-semibold">{errors.address}</p>}
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
                  className={`rounded-xl mt-1.5 h-11 text-base sm:text-sm bg-white ${errors.table_number ? "border-red-500" : "border-stone-300"}`}
                />
                {errors.table_number && <p className="text-red-500 text-xs mt-1 font-medium">{errors.table_number}</p>}
              </div>
            </TabsContent>
          </Tabs>

          {/* 3º BLOCO: FORMA DE PAGAMENTO E OBSERVAÇÕES */}
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-bold uppercase text-gray-700 mb-1.5 block">Forma de pagamento *</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* Opção PIX */}
                <button
                  type="button"
                  onClick={() => handleInputChange('payment_method', 'pix')}
                  className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                    customerData.payment_method === 'pix'
                      ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-500/30 text-emerald-950 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">📱</span>
                    {customerData.payment_method === 'pix' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm leading-tight">PIX</p>
                    <span className="text-[10px] text-emerald-700 font-semibold block leading-tight mt-0.5">
                      Mais rápido ⚡
                    </span>
                  </div>
                </button>

                {/* Opção Cartão */}
                <button
                  type="button"
                  onClick={() => handleInputChange('payment_method', 'cartao')}
                  className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                    customerData.payment_method === 'cartao'
                      ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/30 text-blue-950 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">💳</span>
                    {customerData.payment_method === 'cartao' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm leading-tight">Cartão</p>
                    <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                      Na entrega/balcão
                    </span>
                  </div>
                </button>

                {/* Opção Dinheiro */}
                <button
                  type="button"
                  onClick={() => handleInputChange('payment_method', 'dinheiro')}
                  className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                    customerData.payment_method === 'dinheiro'
                      ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-500/30 text-amber-950 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">💵</span>
                    {customerData.payment_method === 'dinheiro' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm leading-tight">Dinheiro</p>
                    <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                      Com/sem troco
                    </span>
                  </div>
                </button>
              </div>

              {/* Campo de troco quando seleciona Dinheiro */}
              {customerData.payment_method === 'dinheiro' && (
                <div className="mt-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <Label htmlFor="change-for" className="text-xs font-semibold text-amber-950">
                    Precisa de troco? Para quanto? (Opcional)
                  </Label>
                  <Input
                    id="change-for"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    placeholder="Ex: Troco para R$ 50,00 ou Não preciso"
                    className="bg-white text-base sm:text-xs h-9 rounded-lg"
                  />
                </div>
              )}

              {errors.payment_method && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.payment_method}</p>}
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-gray-700">Observações (Opcional)</Label>
              <Textarea
                value={customerData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações sobre o pedido..."
                className="mt-1 rounded-xl text-base sm:text-sm bg-white"
                rows={2}
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

          <div className="sticky bottom-0 bg-white/98 backdrop-blur-md pt-3.5 pb-7 sm:pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-stone-200 mt-3 z-20 flex gap-2.5 shadow-xl">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 h-12 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer" 
              disabled={isSubmitting}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              className="flex-2 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-sm sm:text-base shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer"
              disabled={isSubmitting || finalTotal < minOrderValue}
            >
              {isSubmitting ? "Enviando..." : "Confirmar Pedido ➔"}
            </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Reconhecimento do Cliente */}
      {showCustomerConfirm && customerModalData && (
        <Dialog open={showCustomerConfirm} onOpenChange={setShowCustomerConfirm}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-sm p-5 rounded-3xl bg-white text-stone-900 shadow-2xl border border-stone-200 z-[60]">
            <div className="text-center space-y-3 pt-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                👋
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Cadastro Encontrado!
              </DialogTitle>
              <p className="text-xs text-stone-500 leading-relaxed">
                Localizamos sua conta com o WhatsApp <strong className="text-stone-800">{customerModalData.phone}</strong>.
              </p>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-left text-xs space-y-2 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Nome</span>
                  <p className="font-bold text-sm text-stone-900">{customerModalData.name || 'Cliente'}</p>
                </div>
                {customerModalData.addressString && (
                  <div className="border-t border-stone-200/80 pt-1.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Endereço Salvo</span>
                    <p className="font-medium text-xs text-stone-700 leading-relaxed mt-0.5">{customerModalData.addressString}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerConfirm(false)}
                  className="flex-1 h-11 rounded-xl text-xs font-semibold"
                >
                  Alterar Dados
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmCustomerModal}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Sim, sou eu ✓
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}