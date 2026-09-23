import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trash2, Plus, Minus, ShoppingCart, CheckCircle, Printer, X, Users, Phone, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PDVClientSelectModal from "./PDVClientSelectModal";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function PDVCart({
  cart,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  onCustomerEmailChange,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onFinalize,
  total,
  lastOrder,
  onDismissSuccess,
}) {
  const [showClientModal, setShowClientModal] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const formatPhone = (val) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const handlePhoneChange = async (e) => {
    const formatted = formatPhone(e.target.value);
    onCustomerPhoneChange(formatted);

    const clean = formatted.replace(/\D/g, "");
    if (clean.length >= 10) {
      setIsSearchingPhone(true);
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.rpc("lookup_customer_by_phone", {
            p_phone: formatted,
          });
          if (!error && data && data.length > 0) {
            const client = data[0];
            if (client.customer_name && (!customerName || customerName === "Balcão" || customerName === "Cliente")) {
              onCustomerNameChange(client.customer_name);
            }
            if (client.customer_email && onCustomerEmailChange) {
              onCustomerEmailChange(client.customer_email);
            }
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar cliente por telefone no PDV:", err);
      } finally {
        setIsSearchingPhone(false);
      }
    }
  };

  const handleSelectClient = (client) => {
    if (client.name) onCustomerNameChange(client.name);
    if (client.phone) onCustomerPhoneChange(formatPhone(client.phone));
    if (client.email && onCustomerEmailChange) onCustomerEmailChange(client.email);
  };

  const handleClearCustomer = () => {
    onCustomerNameChange("");
    onCustomerPhoneChange("");
    if (onCustomerEmailChange) onCustomerEmailChange("");
  };

  return (
    <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="font-bold text-base">Carrinho</h2>
          {itemCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Mensagem de sucesso */}
      {lastOrder && (
        <div className="m-3 bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-bold text-green-800 text-sm">
            Pedido #{lastOrder.id.slice(-6).toUpperCase()} finalizado!
          </p>
          <div className="flex gap-2 mt-3">
            <Link to={createPageUrl(`PrintOrder?id=${lastOrder.id}`)} target="_blank" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <Printer className="w-3 h-3 mr-1" /> Imprimir
              </Button>
            </Link>
            <Button
              size="sm"
              className="flex-1 text-xs bg-green-600 hover:bg-green-700"
              onClick={onDismissSuccess}
            >
              Novo Pedido
            </Button>
          </div>
        </div>
      )}

      {/* Identificação do Cliente */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-stone-50/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <User className="w-3.5 h-3.5 text-red-600" />
            <span>Cliente (Opcional)</span>
          </div>
          <div className="flex items-center gap-1">
            {(customerName || customerPhone) && (
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-[11px] text-stone-400 hover:text-stone-700 px-1 font-semibold"
                title="Limpar cliente"
              >
                Limpar
              </button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowClientModal(true)}
              className="h-7 text-xs px-2 rounded-lg bg-white border-stone-200 hover:bg-stone-100 text-stone-700 font-bold gap-1 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-red-600" />
              <span>Clientes Salvos</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-500 font-medium">Telefone</Label>
            <div className="relative mt-0.5">
              <Input
                placeholder="(00) 00000-0000"
                value={customerPhone || ""}
                onChange={handlePhoneChange}
                className="h-8 text-xs bg-white rounded-lg"
              />
              {isSearchingPhone && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-gray-500 font-medium">Nome</Label>
            <Input
              placeholder="Ex: Balcão ou João"
              value={customerName || ""}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="mt-0.5 h-8 text-xs bg-white rounded-lg"
            />
          </div>
        </div>

        {customerName && customerPhone && (
          <div className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span className="truncate">Vinculado a: <b>{customerName}</b> ({customerPhone})</span>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Clientes */}
      <PDVClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />

      {/* Itens do Carrinho */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Carrinho vazio</p>
            <p className="text-xs mt-1 text-gray-400">Clique nos produtos para adicionar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm text-gray-900 flex-1 leading-tight">
                    {item.name}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  {/* Controles de quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-bold text-red-600 text-sm">
                    R$ {(item.price * item.qty).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {item.qty}x R$ {item.price.toFixed(2).replace(".", ",")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total e Finalizar */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {/* Linha de itens */}
        {cart.length > 0 && (
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700 font-semibold text-lg">Total</span>
          <span className="text-3xl font-bold text-gray-900">
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <Button
          onClick={onFinalize}
          disabled={cart.length === 0}
          className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          ✓ Finalizar Pedido
        </Button>
      </div>
    </div>
  );
}