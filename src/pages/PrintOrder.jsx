import React, { useState, useEffect } from "react";
import { Order } from "@/entities/Order";
import { Settings } from "@/entities/Settings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PrintOrderPage() {
    const [order, setOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');

        if (orderId) {
            loadOrderData(orderId);
        } else {
            setIsLoading(false);
        }
    }, []);

    const loadOrderData = async (orderId) => {
        try {
            const [orderData, settingsData] = await Promise.all([
                Order.get(orderId),
                Settings.list()
            ]);
            setOrder(orderData);
            if (settingsData.length > 0) {
                setSettings(settingsData[0]);
            }
        } catch (error) {
            console.error("Erro ao carregar dados para impressão:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isLoading && order) {
            window.print();
        }
    }, [isLoading, order]);

    if (isLoading) {
        return <div className="p-4 text-center">Carregando pedido para impressão...</div>;
    }

    if (!order) {
        return <div className="p-4 text-center text-red-500">Pedido não encontrado.</div>;
    }
    
    const getPaymentMethodText = (method) => {
        if (!method) return "A Combinar";
        const methods = {
          dinheiro: "Dinheiro",
          pix: "PIX",
          cartao: "Cartão",
          cartao_credito: "Cartão de Crédito",
          cartao_debito: "Cartão de Débito",
          credito: "Cartão de Crédito",
          debito: "Cartão de Débito",
          ticket: "Vale / Ticket"
        };
        return methods[method] || method.toUpperCase();
    };

    const deliveryAddress = order.customer_address || order.delivery_address;
    const customerPhone = order.customer_phone || order.phone;
    const customerName = order.customer_name || order.name || "Cliente Balcão";
    const restaurantName = settings?.restaurant_name || "Vruum Burguer";
    const deliveryFee = order.delivery_fee !== undefined 
        ? Number(order.delivery_fee) 
        : (order.order_type === 'delivery' 
            ? Math.max(0, (order.total_amount || 0) - (order.items || []).reduce((s,i) => s + (Number(i.subtotal) || 0), 0) + (Number(order.discount_amount) || 0))
            : 0);

    return (
        <div className="min-h-screen bg-stone-100 py-6 px-2 print:p-0 print:bg-white print:min-h-0">
            <style>{`
                @page {
                    margin: 0;
                }
                @media print {
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable, #printable * {
                        visibility: visible;
                    }
                    #printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        padding: 2px 4px !important;
                        margin: 0 !important;
                        font-size: 12px;
                        line-height: 1.35;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            {/* Barra de ações na tela (não sai na impressão) */}
            <div className="no-print max-w-[320px] mx-auto mb-4 flex gap-2">
                <button
                    onClick={() => window.print()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-xs flex items-center justify-center gap-1 shadow"
                >
                    🖨️ Imprimir Cupom
                </button>
                <button
                    onClick={() => window.close()}
                    className="bg-stone-300 hover:bg-stone-400 text-stone-800 font-bold py-2 px-3 rounded text-xs shadow"
                >
                    Fechar
                </button>
            </div>

            <div id="printable" className="p-3 w-full max-w-[280px] mx-auto bg-white text-black font-mono text-xs shadow-md border border-stone-200">
                <header className="text-center mb-3">
                    <h1 className="text-lg font-black tracking-tight">{restaurantName}</h1>
                    {settings?.address && <p className="text-[11px] text-gray-700">{settings.address}</p>}
                    {settings?.phone && <p className="text-[11px] text-gray-700">Tel: {settings.phone}</p>}
                </header>

                <div className="border-t-2 border-b-2 border-dashed border-black py-1.5 mb-2 text-center">
                    <h2 className="text-sm font-black tracking-wide">
                        {order.order_type === 'delivery' 
                            ? '🛵 PEDIDO DELIVERY' 
                            : (order.order_type === 'dine_in' || (order.table_number && order.table_number.toLowerCase().includes('mesa')))
                                ? `🍽️ CONSUMO NO LOCAL - ${order.table_number}` 
                                : '🛍️ RETIRADA NO BALCÃO'
                        }
                    </h2>
                </div>

                <div className="mb-2 text-xs space-y-0.5">
                    <p><strong>Pedido:</strong> #{order.id?.slice(-8).toUpperCase()}</p>
                    <p><strong>Data:</strong> {order.created_date ? format(new Date(order.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "Agora"}</p>
                </div>

                <div className="border-t border-dashed border-black pt-1.5 mb-2 text-xs">
                    <h3 className="font-bold mb-1">DADOS DO CLIENTE</h3>
                    <p><strong>Nome:</strong> {customerName}</p>
                    {customerPhone && <p><strong>Tel / WhatsApp:</strong> {customerPhone}</p>}
                    
                    {order.order_type === 'delivery' && (
                        <div className="mt-1 pt-1 border-t border-dotted border-gray-400">
                            <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                            <p className="whitespace-pre-wrap font-semibold">{deliveryAddress || "Endereço não informado"}</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-dashed border-black pt-1.5 mb-2">
                    <h3 className="font-bold mb-1 text-center">ITENS DO PEDIDO</h3>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-black">
                                <th className="text-left pb-0.5">Qtd</th>
                                <th className="text-left pb-0.5">Item</th>
                                <th className="text-right pb-0.5">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dotted divide-gray-300">
                            {(order.items || []).map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr>
                                        <td className="align-top font-bold py-1">{item.quantity || 1}x</td>
                                        <td className="align-top font-bold py-1">{item.product_name || item.name}</td>
                                        <td className="align-top text-right font-bold py-1">
                                            R$ {Number(item.subtotal || ((item.product_price || item.price || 0) * (item.quantity || 1))).toFixed(2).replace('.', ',')}
                                        </td>
                                    </tr>
                                    {item.additionals && item.additionals.length > 0 && (
                                        <tr>
                                            <td></td>
                                            <td colSpan="2" className="pb-1 text-[11px] text-gray-700">
                                                + {item.additionals.map(ad => `${ad.name}${ad.price > 0 ? ` (+R$ ${Number(ad.price).toFixed(2).replace('.', ',')})` : ''}`).join(', ')}
                                            </td>
                                        </tr>
                                    )}
                                    {item.notes && (
                                        <tr>
                                            <td></td>
                                            <td colSpan="2" className="pb-1 text-[11px] italic text-gray-700">
                                                Obs item: {item.notes}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-dashed border-black pt-1.5 mb-2 text-xs space-y-0.5">
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>Desconto:</span>
                            <span>- R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
                        </div>
                    )}
                    {order.order_type === 'delivery' && deliveryFee > 0 && (
                        <div className="flex justify-between text-gray-700">
                            <span>Taxa de Entrega:</span>
                            <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                        <span>TOTAL:</span>
                        <span>R$ {Number(order.total_amount || 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-black pt-1.5 mb-2 text-xs space-y-1">
                    <p><strong>Forma de Pagamento:</strong> {getPaymentMethodText(order.payment_method)}</p>
                    {order.notes && (
                        <div className="p-1 bg-gray-100 border border-gray-300 rounded mt-1">
                            <p className="font-bold">OBSERVAÇÕES DO PEDIDO:</p>
                            <p className="whitespace-pre-wrap">{order.notes}</p>
                        </div>
                    )}
                </div>

                <footer className="text-center text-[11px] mt-3 pt-2 border-t border-dashed border-black">
                    <p className="font-bold">Obrigado pela preferência!</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Vruum Burguer • Sistema de Pedidos</p>
                </footer>
            </div>
        </div>
    );
}