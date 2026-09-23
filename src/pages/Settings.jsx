import React, { useState, useEffect } from "react";
import { Settings } from "@/entities/Settings";
import { AdminUser } from "@/entities/AdminUser";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const defaultOpenDays = () =>
  [0,1,2,3,4,5,6].map(day => ({
    day,
    enabled: day >= 1 && day <= 6,
    opening_time: "18:00",
    closing_time: "23:00"
  }));

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    restaurant_name: "",
    restaurant_logo: "",
    opening_time: "",
    closing_time: "",
    open_days: defaultOpenDays(),
    address: "",
    instagram: "",
    whatsapp: "",
    delivery_fee: "",
    min_order_value: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [_adminUsers, setAdminUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    loadSettings();
    loadAdminUsers();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const settingsData = await Settings.list();
    if (settingsData.length > 0) {
      const currentSettings = settingsData[0];
      setSettingsId(currentSettings.id);
      setSettings({
        restaurant_name: currentSettings.restaurant_name || "",
        restaurant_logo: currentSettings.restaurant_logo || "",
        opening_time: currentSettings.opening_time || "",
        closing_time: currentSettings.closing_time || "",
        open_days: currentSettings.open_days?.length ? currentSettings.open_days : defaultOpenDays(),
        address: currentSettings.address || "",
        instagram: currentSettings.instagram || "",
        whatsapp: currentSettings.whatsapp || "",
        delivery_fee: currentSettings.delivery_fee?.toString() || "",
        min_order_value: currentSettings.min_order_value?.toString() || ""
      });
    }
    setIsLoading(false);
  };

  const loadAdminUsers = async () => {
    try {
      const users = await AdminUser.list();
      setAdminUsers(users);
    } catch (_error) {
      console.log("Error loading admin users");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      setUserMessage("Usuário e senha são obrigatórios");
      return;
    }

    try {
      await AdminUser.create(newUser);
      setUserMessage("Usuário criado com sucesso!");
      setNewUser({ username: "", password: "" });
      loadAdminUsers();
      setTimeout(() => setUserMessage(""), 3000);
    } catch (_error) {
      setUserMessage("Erro ao criar usuário");
    }
  };

  const _handleDeleteUser = async (userId) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await AdminUser.delete(userId);
        setUserMessage("Usuário excluído com sucesso!");
        loadAdminUsers();
        setTimeout(() => setUserMessage(""), 3000);
      } catch (_error) {
        setUserMessage("Erro ao excluir usuário");
      }
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (dayIndex) => {
    setSettings(prev => ({
      ...prev,
      open_days: prev.open_days.map(d =>
        d.day === dayIndex ? { ...d, enabled: !d.enabled } : d
      )
    }));
  };

  const handleDayTime = (dayIndex, field, value) => {
    setSettings(prev => ({
      ...prev,
      open_days: prev.open_days.map(d =>
        d.day === dayIndex ? { ...d, [field]: value } : d
      )
    }));
  };

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploadingLogo(true);
      try {
        const { file_url } = await UploadFile({ file, maxDimension: 800 });
        setSettings(prev => ({ ...prev, restaurant_logo: file_url }));
        
        // Se já tiver ID de configurações, salva imediatamente o logo no banco
        if (settingsId) {
          await Settings.update(settingsId, { restaurant_logo: file_url });
        }
      } catch (_error) {
        alert("Erro ao fazer upload do logo");
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const settingsData = {
        ...settings,
        delivery_fee: settings.delivery_fee ? parseFloat(settings.delivery_fee) : 0,
        min_order_value: settings.min_order_value ? parseFloat(settings.min_order_value) : 0
      };

      if (settingsId) {
        await Settings.update(settingsId, settingsData);
      } else {
        const newSettings = await Settings.create(settingsData);
        setSettingsId(newSettings.id);
      }

      alert("Configurações salvas com sucesso!");
      window.location.reload(); // Recarrega a página para refletir as mudanças no layout
    } catch (_error) {
      alert("Erro ao salvar configurações");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie as informações do seu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Básicas */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input
                  id="name"
                  value={settings.restaurant_name}
                  onChange={(e) => handleInputChange('restaurant_name', e.target.value)}
                  placeholder="Digite o nome do seu restaurante"
                />
              </div>

              <div>
                <Label htmlFor="logo">Logo do Restaurante</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="cursor-pointer"
                />
                {isUploadingLogo && (
                  <p className="text-xs text-amber-600 mt-1 font-medium animate-pulse">
                    Enviando e processando logo...
                  </p>
                )}
                {settings.restaurant_logo && !isUploadingLogo && (
                  <div className="mt-2">
                    <img
                      src={settings.restaurant_logo}
                      alt="Logo"
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-3 block">Dias e Horários de Funcionamento</Label>
                <div className="space-y-2">
                  {settings.open_days.map((d) => (
                    <div key={d.day} className="flex items-center gap-3 p-3 rounded-xl border bg-gray-50">
                      <input
                        type="checkbox"
                        id={`day-${d.day}`}
                        checked={d.enabled}
                        onChange={() => handleDayToggle(d.day)}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                      <label htmlFor={`day-${d.day}`} className="w-20 text-sm font-medium cursor-pointer select-none">
                        {DAY_LABELS[d.day]}
                      </label>
                      {d.enabled && (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={d.opening_time}
                            onChange={(e) => handleDayTime(d.day, 'opening_time', e.target.value)}
                            className="h-8 text-sm"
                          />
                          <span className="text-gray-400 text-xs">até</span>
                          <Input
                            type="time"
                            value={d.closing_time}
                            onChange={(e) => handleDayTime(d.day, 'closing_time', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {!d.enabled && (
                        <span className="text-xs text-gray-400 italic">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp da Loja</Label>
                <Input
                  id="whatsapp"
                  value={settings.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Endereço completo do restaurante"
                />
              </div>

              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={settings.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="@seurestaurante"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Pedidos */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Configurações de Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
                  <Input
                    id="delivery_fee"
                    type="number"
                    step="0.01"
                    value={settings.delivery_fee}
                    onChange={(e) => handleInputChange('delivery_fee', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="min_order">Valor Mínimo do Pedido (R$)</Label>
                  <Input
                    id="min_order"
                    type="number"
                    step="0.01"
                    value={settings.min_order_value}
                    onChange={(e) => handleInputChange('min_order_value', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alteração de Senha Admin */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Alterar Credenciais de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userMessage && (
                <Alert>
                  <AlertDescription>{userMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new_username">Usuário Admin</Label>
                    <Input
                      id="new_username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="Digite o novo usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Digite a nova senha"
                    />
                  </div>
                </div>
                <Button type="button" onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Atualizar Credenciais
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}