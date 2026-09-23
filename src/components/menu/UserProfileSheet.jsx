import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, LogOut, MapPin, Trash2, Edit2, PlusCircle, Ticket, ShoppingBag, PhoneCall, Pencil, Check, X, Loader2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { UserAddress } from "@/entities/UserAddress";
import { Coupon } from "@/entities/Coupon";
import { CouponUsage } from "@/entities/CouponUsage";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function AddressForm({ address, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    address || { name: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }
  );
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCepChange = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({...prev, cep}));

    if (cep.length === 8) {
      setIsFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <h4 className="font-semibold text-lg">{address ? 'Editar Endereço' : 'Novo Endereço'}</h4>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">Nome do endereço</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={handleInputChange} 
            placeholder="Ex: Casa, Trabalho"
            required 
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="cep" className="text-sm font-medium">CEP</Label>
          <Input 
            id="cep" 
            value={formData.cep} 
            onChange={handleCepChange} 
            placeholder="00000-000"
            required 
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="street" className="text-sm font-medium">Rua/Logradouro</Label>
          <Input 
            id="street" 
            value={formData.street} 
            onChange={handleInputChange} 
            required 
            disabled={isFetchingCep} 
            className="mt-1"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="number" className="text-sm font-medium">Número</Label>
            <Input 
              id="number" 
              value={formData.number} 
              onChange={handleInputChange} 
              placeholder="123"
              required 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="complement" className="text-sm font-medium">Complemento</Label>
            <Input 
              id="complement" 
              value={formData.complement} 
              onChange={handleInputChange} 
              placeholder="Apto 45"
              className="mt-1"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="neighborhood" className="text-sm font-medium">Bairro</Label>
          <Input 
            id="neighborhood" 
            value={formData.neighborhood} 
            onChange={handleInputChange} 
            required 
            disabled={isFetchingCep} 
            className="mt-1"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label htmlFor="city" className="text-sm font-medium">Cidade</Label>
            <Input 
              id="city" 
              value={formData.city} 
              onChange={handleInputChange} 
              required 
              disabled={isFetchingCep} 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-sm font-medium">UF</Label>
            <Input 
              id="state" 
              value={formData.state} 
              onChange={handleInputChange} 
              maxLength="2"
              placeholder="SP"
              required 
              disabled={isFetchingCep} 
              className="mt-1"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          Salvar endereço
        </Button>
      </div>
    </form>
  );
}

export default function UserProfileSheet() {
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponUsages, setCouponUsages] = useState([]);
  const [isEditingAddress, setIsEditingAddress] = useState(null); // null for new, address object for editing
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const formatPhone = (value) => {
    const raw = value.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const loadUserData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (!userData) {
        setAddresses([]);
        setAvailableCoupons([]);
        return;
      }
      
      const [allAddresses, allCoupons, usages] = await Promise.all([
          UserAddress.list(),
          Coupon.filter({ active: true }),
          CouponUsage.list()
      ]);

      const userAddresses = (allAddresses || []).filter(a => 
        (userData.email && a.user_email === userData.email) || 
        (userData.phone && a.user_phone === userData.phone)
      );
      
      setAddresses(userAddresses);
      setCouponUsages(usages || []);

      const now = new Date();
      const validCoupons = (allCoupons || []).filter(coupon => {
          const isExpired = coupon.end_date && new Date(coupon.end_date) < now;
          const hasStarted = coupon.start_date ? new Date(coupon.start_date) <= now : true;
          return hasStarted && !isExpired;
      });
      setAvailableCoupons(validCoupons);

    } catch (_error) {
      setUser(null);
      setAddresses([]);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    const clean = phoneInput.replace(/\D/g, "");
    if (clean.length < 10) {
      setPhoneError("Digite um número de WhatsApp válido com DDD.");
      return;
    }
    setPhoneError("");
    setIsSubmittingPhone(true);
    try {
      const logged = await User.loginWithPhone(phoneInput, nameInput.trim());
      setUser(logged);
      toast.success(`Bem-vindo, ${logged.full_name || 'Cliente'}!`);
      loadUserData();
    } catch (_err) {
      toast.error("Erro ao identificar. Tente novamente.");
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  const handleLogout = async () => {
    await User.logout();
    setUser(null);
    setAddresses([]);
    setAvailableCoupons([]);
    setPhoneInput("");
    setNameInput("");
    window.location.reload();
  };

  const handleSaveName = async (e) => {
    e?.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }

    setIsSavingName(true);
    try {
      const phoneToUse = user?.phone || localStorage.getItem("vrumburguer_customer_phone") || "";

      if (phoneToUse && isSupabaseConfigured() && supabase) {
        await supabase.rpc("update_customer_name_by_phone", {
          p_phone: phoneToUse,
          p_new_name: cleanName
        });
      } else if (user?.id) {
        await User.update(user.id, { full_name: cleanName });
      }

      const updatedUser = { ...user, full_name: cleanName };
      setUser(updatedUser);

      if (typeof window !== "undefined") {
        localStorage.setItem("vrumburguer_current_user", JSON.stringify(updatedUser));
        try {
          const guestInfo = JSON.parse(localStorage.getItem("vrumburguer_guest_info") || "{}");
          localStorage.setItem("vrumburguer_guest_info", JSON.stringify({ ...guestInfo, customer_name: cleanName }));
        } catch {}
      }

      toast.success("Nome atualizado com sucesso!");
      setIsEditingName(false);
    } catch (_err) {
      console.error("Erro ao salvar nome:", _err);
      toast.error("Erro ao atualizar nome.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveAddress = async (addressData) => {
    if (isEditingAddress && isEditingAddress.id) {
      await UserAddress.update(isEditingAddress.id, addressData);
    } else {
      await UserAddress.create({ ...addressData, user_email: user.email });
    }
    setShowAddressForm(false);
    setIsEditingAddress(null);
    loadUserData();
  };

  const handleDeleteAddress = async (addressId) => {
    if (confirm("Tem certeza que deseja excluir este endereço?")) {
      await UserAddress.delete(addressId);
      loadUserData();
    }
  };

  return (
    <Sheet onOpenChange={(open) => open && loadUserData()}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full">
          <UserIcon className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-gray-900">
            {user ? "Meu Perfil" : "Acessar Conta"}
          </SheetTitle>
        </SheetHeader>
        <div className="py-6">
          {user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  {user.full_name?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="space-y-1.5 py-0.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Seu nome"
                          autoFocus
                          className="h-8 text-sm bg-white rounded-lg px-2.5"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSavingName}
                          className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shrink-0"
                          title="Salvar nome"
                        >
                          {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingName(false)}
                          className="h-8 px-2 text-gray-500 hover:text-gray-800 rounded-lg shrink-0"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-base truncate">{user.full_name || "Cliente"}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewName(user.full_name || "");
                            setIsEditingName(true);
                          }}
                          title="Alterar nome"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-200/60 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-0.5">
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{user.phone || "WhatsApp Conectado"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Meus Endereços</h3>
                  <Button variant="outline" size="sm" onClick={() => { setIsEditingAddress(null); setShowAddressForm(true); }}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                {showAddressForm && (
                  <AddressForm 
                    address={isEditingAddress}
                    onSave={handleSaveAddress}
                    onCancel={() => { setShowAddressForm(false); setIsEditingAddress(null); }}
                  />
                )}

                <div className="space-y-3 mt-4">
                  {addresses.map(addr => (
                    <div key={addr.id} className="p-3 border rounded-lg flex justify-between items-start">
                      <div className="flex gap-3">
                        <MapPin className="w-5 h-5 text-red-500 mt-1" />
                        <div>
                          <p className="font-semibold">{addr.name}</p>
                          <p className="text-sm text-gray-600">
                            {`${addr.street}, ${addr.number} - ${addr.city}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setIsEditingAddress(addr); setShowAddressForm(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => handleDeleteAddress(addr.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <Link to={createPageUrl("MyOrders")} className="block">
                <Button variant="outline" className="w-full">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Meus Pedidos
                </Button>
              </Link>

              <Separator />

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Cupons Disponíveis</h3>
                {availableCoupons.length > 0 ? (
                  <div className="space-y-3">
                    {availableCoupons.map(coupon => {
                      const userUsageCount = couponUsages.filter(u => u.coupon_id === coupon.id && u.user_email === user?.email).length;
                      const isUsedUp = coupon.usage_limit && userUsageCount >= coupon.usage_limit;
                      const isExpired = coupon.end_date && new Date(coupon.end_date) < new Date();
                      const canUse = !isUsedUp && !isExpired;
                      
                      return (
                        <div key={coupon.id} className={`p-3 border-2 border-dashed rounded-lg ${canUse ? 'border-red-200 bg-white' : 'border-gray-300 bg-gray-50 opacity-70'}`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Ticket className={`w-6 h-6 mt-1 ${canUse ? 'text-red-500' : 'text-gray-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm ${canUse ? 'text-gray-900' : 'text-gray-500'}`}>{coupon.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{coupon.description}</p>
                                <div className="mt-2 space-y-1">
                                  {coupon.usage_limit && (
                                    <p className="text-xs text-gray-600">
                                      {isUsedUp ? (
                                        <span className="text-red-600 font-semibold">✗ Cupom já utilizado ({userUsageCount}/{coupon.usage_limit})</span>
                                      ) : (
                                        <span>Usos: {userUsageCount}/{coupon.usage_limit}</span>
                                      )}
                                    </p>
                                  )}
                                  {coupon.end_date && (
                                    <p className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                      {isExpired ? '✗ Expirado em' : '⏱ Válido até'}: {new Date(coupon.end_date).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                  {coupon.min_order_value > 0 && (
                                    <p className="text-xs text-gray-600">
                                      Pedido mínimo: R$ {coupon.min_order_value.toFixed(2).replace('.', ',')}
                                    </p>
                                  )}
                                  <Badge variant="outline" className={canUse ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-200 text-gray-600'}>
                                    {coupon.discount_type === 'percentage' 
                                      ? `${coupon.discount_value}% OFF` 
                                      : `R$ ${coupon.discount_value.toFixed(2)} OFF`}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            {canUse && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  navigator.clipboard.writeText(coupon.code);
                                  toast.success('Código copiado!');
                                }}
                                className="flex items-center gap-2 shrink-0"
                              >
                                <Copy className="w-3 h-3"/>
                                {coupon.code}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center py-4">Nenhum cupom disponível no momento.</p>
                )}
              </div>
              
              <Separator />

              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-emerald-200">
                  <PhoneCall className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Identificação Rápida</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[260px] mx-auto">
                  Digite seu WhatsApp para salvar seus endereços e agilizar seus próximos pedidos!
                </p>
              </div>

              <form onSubmit={handlePhoneLogin} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <Label htmlFor="phone" className="text-xs font-bold text-gray-700">Seu WhatsApp / Celular *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(formatPhone(e.target.value));
                      if (phoneError) setPhoneError("");
                    }}
                    className={`mt-1 bg-white font-medium ${phoneError ? 'border-red-500' : ''}`}
                    required
                  />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>

                <div>
                  <Label htmlFor="name" className="text-xs font-bold text-gray-700">Seu Nome (opcional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Carlos Silva"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="mt-1 bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingPhone}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  {isSubmittingPhone ? "Identificando..." : "Entrar com WhatsApp"}
                </Button>
              </form>

              <p className="text-[11px] text-gray-400 text-center">
                🔒 Sem senhas. Seus endereços e histórico ficam salvos no seu número.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}