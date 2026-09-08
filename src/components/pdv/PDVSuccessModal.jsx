import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PDVSuccessModal({ isOpen, order, onClose }) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900">Pedido Salvo!</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Pedido #{order.id?.slice(-8)} registrado com sucesso.
            </p>
            <p className="text-3xl font-black text-red-600 mt-3">
              R$ {order.total_amount?.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <Link to={createPageUrl(`PrintOrder?id=${order.id}`)} target="_blank">
              <Button variant="outline" className="w-full" onClick={onClose}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Comprovante
              </Button>
            </Link>
            <Button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-lg font-bold h-12"
            >
              Próximo Atendimento
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}