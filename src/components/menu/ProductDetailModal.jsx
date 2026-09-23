import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';

export default function ProductDetailModal({ 
  product, 
  complementGroups = [], 
  additionals = [], 
  isOpen, 
  onClose, 
  onAddToCart 
}) {
  const [quantity, setQuantity] = useState(1);
  // selectedComplements: { [itemId]: { id, group_id, group_name, name, price, quantity } }
  const [selectedComplements, setSelectedComplements] = useState({});
  const [notes, setNotes] = useState("");

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes("");
      const initial = {};

      // Auto-select first item for mandatory single-choice groups (ex: Ponto da Carne)
      if (complementGroups && complementGroups.length > 0) {
        complementGroups.forEach(grp => {
          if (grp.min_quantity === 1 && grp.max_quantity === 1 && grp.items && grp.items.length > 0) {
            const firstItem = grp.items[0];
            initial[firstItem.id] = {
              id: firstItem.id,
              group_id: grp.id,
              group_name: grp.name,
              name: firstItem.name,
              price: Number(firstItem.price) || 0,
              quantity: 1,
            };
          }
        });
      }

      setSelectedComplements(initial);
    }
  }, [isOpen, product, complementGroups]);

  if (!product) return null;

  // Contagem de seleções por grupo
  const getGroupSelectedCount = (groupId) => {
    return Object.values(selectedComplements)
      .filter(c => c.group_id === groupId)
      .reduce((sum, c) => sum + (c.quantity || 1), 0);
  };

  // Manipulação de seleção única (Radio: min=1, max=1)
  const handleSingleSelect = (group, item) => {
    const next = { ...selectedComplements };
    // Remove outros itens deste grupo
    Object.keys(next).forEach(key => {
      if (next[key].group_id === group.id) {
        delete next[key];
      }
    });

    next[item.id] = {
      id: item.id,
      group_id: group.id,
      group_name: group.name,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: 1,
    };
    setSelectedComplements(next);
  };

  // Manipulação de múltipla seleção (+ / -)
  const handleItemQtyChange = (group, item, delta) => {
    const currentGroupTotal = getGroupSelectedCount(group.id);
    const currentItemQty = selectedComplements[item.id]?.quantity || 0;
    const newQty = currentItemQty + delta;

    if (newQty < 0) return;

    // Verificar se excede o limite máximo do grupo
    if (delta > 0 && currentGroupTotal >= group.max_quantity) {
      return;
    }

    // Verificar limite máximo por item
    const itemMax = item.max_quantity || 1;
    if (delta > 0 && currentItemQty >= itemMax) {
      return;
    }

    const next = { ...selectedComplements };
    if (newQty === 0) {
      delete next[item.id];
    } else {
      next[item.id] = {
        id: item.id,
        group_id: group.id,
        group_name: group.name,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: newQty,
      };
    }
    setSelectedComplements(next);
  };

  // Suporte a adicionais legados se não houver complementGroups
  const handleLegacyAdditionalToggle = (ad, isChecked) => {
    const next = { ...selectedComplements };
    if (isChecked) {
      next[ad.id] = {
        id: ad.id,
        group_id: "legacy",
        group_name: "Adicionais",
        name: ad.name,
        price: Number(ad.price) || 0,
        quantity: 1,
      };
    } else {
      delete next[ad.id];
    }
    setSelectedComplements(next);
  };

  // Validação dos grupos obrigatórios
  const validateGroups = () => {
    if (!complementGroups || complementGroups.length === 0) return { isValid: true };

    for (const grp of complementGroups) {
      if (grp.min_quantity > 0) {
        const count = getGroupSelectedCount(grp.id);
        if (count < grp.min_quantity) {
          return {
            isValid: false,
            missingGroup: grp.name,
            minNeeded: grp.min_quantity - count,
          };
        }
      }
    }
    return { isValid: true };
  };

  const validation = validateGroups();

  // Cálculo total
  const calculateTotal = () => {
    const complementsTotal = Object.values(selectedComplements).reduce(
      (sum, item) => sum + (item.price * (item.quantity || 1)),
      0
    );
    return (Number(product.price || 0) + complementsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!validation.isValid) return;

    // Converter selectedComplements para array compatível com o carrinho
    const additionalsList = Object.values(selectedComplements).map(item => ({
      id: item.id,
      name: item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
      price: item.price * (item.quantity || 1),
      unit_price: item.price,
      quantity: item.quantity || 1,
      group_name: item.group_name,
    }));

    onAddToCart(product, additionalsList, quantity, notes.trim());
    onClose();
  };

  const hasGroups = complementGroups && complementGroups.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg max-h-[94vh] sm:max-h-[88vh] overflow-y-auto p-0 gap-0 rounded-t-3xl sm:rounded-3xl border-0 shadow-2xl">
        {/* Banner do Produto com Imagem ou Header */}
        <div className="relative">
          {product.image_url ? (
            <div className="w-full h-48 sm:h-56 overflow-hidden bg-stone-100">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <h3 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md">
                  {product.name}
                </h3>
                <p className="text-lg font-extrabold text-amber-300 mt-0.5">
                  R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          ) : (
            <DialogHeader className="p-5 pb-3 border-b bg-stone-50">
              <DialogTitle className="text-xl font-bold text-gray-900">{product.name}</DialogTitle>
              <p className="text-lg font-extrabold text-red-600 mt-1">
                R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
              </p>
            </DialogHeader>
          )}
        </div>

        <div className="p-5 space-y-6">
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed bg-stone-50/80 p-3.5 rounded-2xl border border-stone-100">
              {product.description}
            </p>
          )}

          {/* Grupos de Complementos (Padrão Anota AI) */}
          {hasGroups ? (
            <div className="space-y-6">
              {complementGroups.map((group) => {
                const isRequired = group.min_quantity > 0;
                const isSingleChoice = group.min_quantity === 1 && group.max_quantity === 1;
                const selectedCount = getGroupSelectedCount(group.id);
                const isGroupSatisfied = selectedCount >= group.min_quantity;

                return (
                  <div key={group.id} className="rounded-2xl border border-stone-200 overflow-hidden bg-white shadow-sm">
                    {/* Header do Grupo */}
                    <div className="p-4 bg-stone-50/90 border-b border-stone-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-base">{group.name}</h4>
                          {isRequired ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2 py-0.5">
                              OBRIGATÓRIO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-stone-100 text-stone-600 font-semibold text-[11px]">
                              OPCIONAL
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.description || (
                            isSingleChoice 
                              ? "Escolha 1 opção" 
                              : isRequired 
                                ? `Escolha de ${group.min_quantity} a ${group.max_quantity} opções`
                                : `Escolha até ${group.max_quantity} opções`
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold">
                        <span className={isGroupSatisfied ? "text-emerald-600 font-extrabold" : "text-amber-600"}>
                          {selectedCount}/{group.max_quantity}
                        </span>
                        {isGroupSatisfied && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Opções do Grupo */}
                    <div className="divide-y divide-stone-100">
                      {group.items && group.items.length > 0 ? (
                        group.items.map((item) => {
                          const itemQty = selectedComplements[item.id]?.quantity || 0;
                          const isSelected = itemQty > 0;
                          const isMaxGroupReached = selectedCount >= group.max_quantity;
                          const isMaxItemReached = itemQty >= (item.max_quantity || 1);

                          // Seletor de escolha única (Radio style)
                          if (isSingleChoice) {
                            return (
                              <label
                                key={item.id}
                                onClick={() => handleSingleSelect(group, item)}
                                className={`flex items-center justify-between p-3.5 cursor-pointer transition-all ${isSelected ? 'bg-red-50/70 text-red-950 font-medium' : 'hover:bg-stone-50'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-red-600 bg-red-600' : 'border-gray-300'}`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">
                                  {item.price > 0 ? `+ R$ ${Number(item.price).toFixed(2).replace('.', ',')}` : 'Grátis'}
                                </span>
                              </label>
                            );
                          }

                          // Seletor de múltipla escolha com controles +/-
                          return (
                            <div 
                              key={item.id}
                              className={`flex items-center justify-between p-3.5 transition-all ${isSelected ? 'bg-red-50/40' : 'hover:bg-stone-50/50'}`}
                            >
                              <div className="pr-2">
                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                                <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                  {item.price > 0 ? `+ R$ ${Number(item.price).toFixed(2).replace('.', ',')}` : 'Grátis'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {itemQty > 0 ? (
                                  <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => handleItemQtyChange(group, item, -1)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-5 text-center font-bold text-sm text-gray-900">
                                      {itemQty}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isMaxGroupReached || isMaxItemReached}
                                      onClick={() => handleItemQtyChange(group, item, 1)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isMaxGroupReached}
                                    onClick={() => handleItemQtyChange(group, item, 1)}
                                    className="rounded-xl text-xs font-bold border-stone-300 hover:border-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="p-4 text-xs text-gray-400 italic text-center">Nenhuma opção disponível.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : additionals && additionals.length > 0 ? (
            /* Fallback de Adicionais Legados */
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">Adicionais</h4>
              <div className="space-y-2">
                {additionals.map(ad => {
                  const isChecked = !!selectedComplements[ad.id];
                  return (
                    <label 
                      key={ad.id}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-red-50 border-red-300' : 'hover:bg-stone-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleLegacyAdditionalToggle(ad, e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        <span className="font-medium text-sm text-gray-900">{ad.name}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">
                        + R$ {Number(ad.price || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Campo de Observações */}
          <div>
            <label htmlFor="modal-notes" className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
              Alguma observação?
            </label>
            <Textarea
              id="modal-notes"
              placeholder="Ex: Tirar cebola, maionese à parte, bem passado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none rounded-2xl text-base sm:text-sm bg-stone-50 border-stone-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="sticky bottom-0 bg-white/98 backdrop-blur-md border-t border-stone-200 p-4 pb-6 sm:pb-4 sm:p-5 space-y-3 shadow-lg z-20">
          {!validation.isValid && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Por favor, selecione: <strong>{validation.missingGroup}</strong> para continuar.</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Seletor de Quantidade do Produto */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-10 w-10 rounded-xl hover:bg-white text-gray-700"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-extrabold text-base w-8 text-center text-gray-900">{quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 rounded-xl hover:bg-white text-gray-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Botão de Adicionar ao Carrinho */}
            <Button
              type="button"
              disabled={!validation.isValid}
              onClick={handleAddToCart}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-12 rounded-2xl text-base font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-5"
            >
              <span>Adicionar ao Pedido</span>
              <span>R$ {calculateTotal().toFixed(2).replace('.', ',')}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}