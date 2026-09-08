import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Info, Clock, MapPin, Phone, Instagram } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function StoreInfoSheet({ settings }) {
  if (!settings) return null;

  const getOpeningHoursText = () => {
    if (settings.opening_time && settings.closing_time) {
      return `Das ${settings.opening_time} às ${settings.closing_time}`;
    }
    return "Horário não informado";
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full">
          <Info className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-gray-900">{settings.restaurant_name}</SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Horário de Funcionamento</p>
                <p className="text-sm text-gray-600">{getOpeningHoursText()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Endereço</p>
                <p className="text-sm text-gray-600">{settings.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                <a href={`https://wa.me/${settings.whatsapp?.replace(/\D/g, '')}`} className="text-sm text-red-600 hover:underline">{settings.whatsapp}</a>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Siga-nos nas redes</h3>
            <div className="space-y-3">
              {settings.instagram && (
                <a href={`https://instagram.com/${settings.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                  <span>{settings.instagram}</span>
                </a>
              )}
              {settings.whatsapp && (
                <a href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors">
                  <Phone className="w-5 h-5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}