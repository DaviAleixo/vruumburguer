import React, { useState, useEffect } from "react";
import { Settings } from "@/entities/Settings";
import { AdminUser } from "@/entities/AdminUser";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Save, 
  UserPlus, 
  Users, 
  Edit2, 
  Trash2, 
  Key, 
  ShieldCheck, 
  Shield, 
  Check, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const defaultOpenDays = () =>
  [0,1,2,3,4,5,6].map(day => ({
    day,
    enabled: day >= 1 && day <= 6,
    opening_time: "18:00",
    closing_time: "23:00"
  }));

const ALL_ADMIN_SCREENS = [
  { key: "Dashboard", label: "Dashboard / Visão Geral" },
  { key: "Orders", label: "Pedidos / Gestor" },
  { key: "PDV", label: "PDV Balcão" },
  { key: "Clients", label: "Clientes" },
  { key: "Products", label: "Produtos & Cardápio" },
  { key: "Categories", label: "Categorias" },
  { key: "Complements", label: "Complementos & Adicionais" },
  { key: "Coupons", label: "Cupons de Desconto" },
  { key: "Banners", label: "Banners Promocionais" },
  { key: "Reports", label: "Relatórios de Vendas" },
  { key: "Settings", label: "Configurações da Loja & Usuários" },
];

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
  
  // Estado para múltiplos usuários administradores
  const [adminUsers, setAdminUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    role: "admin",
    active: true,
    access_type: "all",
    permissions: ALL_ADMIN_SCREENS.map(s => s.key),
  });
  const [userMessage, setUserMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

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
      setAdminUsers(Array.isArray(users) ? users : []);
    } catch (_error) {
      console.log("Error loading admin users", _error);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserFormData({
      username: "",
      password: "",
      role: "admin",
      active: true,
      access_type: "all",
      permissions: ALL_ADMIN_SCREENS.map(s => s.key),
    });
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUserId(user.id);
    let userPerms = ["*"];
    try {
      if (Array.isArray(user.permissions)) {
        userPerms = user.permissions;
      } else if (typeof user.permissions === "string") {
        userPerms = JSON.parse(user.permissions || "[\"*\"]");
      }
    } catch {}

    const isAll = userPerms.includes("*") || userPerms.length === 0;

    setUserFormData({
      username: user.username || "",
      password: "", // Senha vazia = mantém a atual
      role: user.role || "admin",
      active: user.active !== false,
      access_type: isAll ? "all" : "custom",
      permissions: isAll ? ALL_ADMIN_SCREENS.map(s => s.key) : userPerms,
    });
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const toggleScreenPermission = (screenKey) => {
    setUserFormData(prev => {
      const current = prev.permissions || [];
      const exists = current.includes(screenKey);
      const updated = exists 
        ? current.filter(k => k !== screenKey)
        : [...current, screenKey];
      return { ...prev, permissions: updated };
    });
  };

  const handleSelectAllScreens = () => {
    setUserFormData(prev => ({
      ...prev,
      permissions: ALL_ADMIN_SCREENS.map(s => s.key)
    }));
  };

  const handleDeselectAllScreens = () => {
    setUserFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim()) {
      setUserMessage({ type: "error", text: "O nome de usuário é obrigatório." });
      return;
    }

    if (!editingUserId && !userFormData.password.trim()) {
      setUserMessage({ type: "error", text: "A senha é obrigatória para novos usuários." });
      return;
    }

    const finalPermissions = userFormData.access_type === "all"
      ? ["*"]
      : (userFormData.permissions.length > 0 ? userFormData.permissions : ["Dashboard"]);

    setIsSavingUser(true);
    try {
      if (editingUserId) {
        // Atualizar usuário existente
        const updatePayload = {
          username: userFormData.username.trim(),
          role: userFormData.role,
          active: userFormData.active,
          permissions: finalPermissions,
        };
        if (userFormData.password.trim()) {
          updatePayload.password = userFormData.password.trim();
        }
        await AdminUser.update(editingUserId, updatePayload);
        setUserMessage({ type: "success", text: `Usuário "${userFormData.username}" atualizado com sucesso!` });
      } else {
        // Criar novo usuário
        const createPayload = {
          username: userFormData.username.trim(),
          password: userFormData.password.trim(),
          role: userFormData.role,
          active: userFormData.active,
          permissions: finalPermissions,
        };
        await AdminUser.create(createPayload);
        setUserMessage({ type: "success", text: `Usuário "${userFormData.username}" criado com sucesso!` });
      }

      await loadAdminUsers();
      setIsUserModalOpen(false);
      setTimeout(() => setUserMessage(null), 4000);
    } catch (_err) {
      console.error("Erro ao salvar usuário admin:", _err);
      setUserMessage({ type: "error", text: "Erro ao salvar usuário. Verifique se o nome já não está cadastrado." });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (adminUsers.length <= 1) {
      alert("Não é possível excluir o único usuário administrador do sistema.");
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário "${user.username}"? Ele perderá o acesso ao painel.`)) {
      try {
        await AdminUser.delete(user.id);
        setUserMessage({ type: "success", text: `Usuário "${user.username}" excluído com sucesso!` });
        await loadAdminUsers();
        setTimeout(() => setUserMessage(null), 4000);
      } catch (_err) {
        setUserMessage({ type: "error", text: "Erro ao excluir usuário." });
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

          {/* Gerenciamento de Usuários de Acesso ao Painel */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-200/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-stone-900">Usuários de Acesso ao Painel</CardTitle>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Gerencie quem pode acessar o sistema com seu próprio login e senha.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenCreateUser}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {userMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                    userMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {userMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span>{userMessage.text}</span>
                </div>
              )}

              {/* Tabela de Usuários */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-stone-100/80 text-stone-600 uppercase text-[11px] font-bold tracking-wider border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Usuário</th>
                        <th className="py-3 px-4">Cargo</th>
                        <th className="py-3 px-4">Permissões de Telas</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/80 bg-white">
                      {adminUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-stone-500">
                            Nenhum usuário cadastrado.
                          </td>
                        </tr>
                      ) : (
                        adminUsers.map((user) => {
                          const userPerms = Array.isArray(user.permissions)
                            ? user.permissions
                            : typeof user.permissions === "string"
                            ? JSON.parse(user.permissions || "[\"*\"]")
                            : ["*"];
                          const isAll = userPerms.includes("*");

                          return (
                            <tr key={user.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 font-black text-xs flex items-center justify-center uppercase shadow-sm">
                                    {(user.username || "A").slice(0, 2)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-stone-900 block">
                                      {user.username}
                                    </span>
                                    <span className="text-[11px] text-stone-400 flex items-center gap-1 font-mono">
                                      <Lock className="w-3 h-3 text-stone-400" /> ••••••••
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    user.role === "admin"
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                  }`}
                                >
                                  {user.role === "admin" ? "Administrador" : "Funcionário"}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                {isAll ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Acesso Total (Todas as Telas)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200" title={userPerms.join(", ")}>
                                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                                    {userPerms.length} {userPerms.length === 1 ? "Tela Permitida" : "Telas Permitidas"}
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    user.active !== false
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-stone-100 text-stone-600"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      user.active !== false ? "bg-emerald-500" : "bg-stone-400"
                                    }`}
                                  />
                                  {user.active !== false ? "Ativo" : "Inativo"}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditUser(user)}
                                    className="h-8 px-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-bold flex items-center gap-1"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                    Editar
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={adminUsers.length <= 1}
                                    className="h-8 px-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modal de Adicionar / Editar Usuário com Permissões */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 w-full max-w-lg shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-stone-900">
                        {editingUserId ? "Editar Usuário e Permissões" : "Novo Usuário do Painel"}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {editingUserId
                          ? "Altere credenciais e configure quais telas ele pode acessar."
                          : "Cadastre login, senha e escolha as permissões de acesso."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="p-1.5 rounded-full text-stone-400 hover:text-stone-750 hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Nome de Usuário */}
                  <div>
                    <Label htmlFor="modal_username" className="text-xs font-bold text-stone-700">
                      Nome de Usuário (Login) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="modal_username"
                      value={userFormData.username}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, username: e.target.value })
                      }
                      placeholder="Ex: davi, joao, caixa1, gerente"
                      className="mt-1 rounded-xl text-sm"
                    />
                  </div>

                  {/* Senha */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="modal_password" className="text-xs font-bold text-stone-700">
                        {editingUserId ? "Nova Senha (Opcional)" : "Senha de Acesso"}{" "}
                        {!editingUserId && <span className="text-red-500">*</span>}
                      </Label>
                      {editingUserId && (
                        <span className="text-[10px] text-stone-400">Em branco = não altera</span>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <Input
                        id="modal_password"
                        type={showPassword ? "text" : "password"}
                        value={userFormData.password}
                        onChange={(e) =>
                          setUserFormData({ ...userFormData, password: e.target.value })
                        }
                        placeholder={
                          editingUserId ? "Digite apenas para alterar a senha" : "Digite a senha"
                        }
                        className="pr-10 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Cargo */}
                  <div>
                    <Label htmlFor="modal_role" className="text-xs font-bold text-stone-700">
                      Cargo
                    </Label>
                    <select
                      id="modal_role"
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, role: e.target.value })
                      }
                      className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="admin">Administrador (Adm)</option>
                      <option value="funcionario">Funcionário</option>
                    </select>
                  </div>

                  {/* Configuração de Permissões de Telas */}
                  <div className="pt-2 border-t border-stone-200">
                    <Label className="text-xs font-bold text-stone-900 block mb-2">
                      Permissões de Telas do Painel
                    </Label>

                    {/* Opções de Tipo de Acesso */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setUserFormData({
                            ...userFormData,
                            access_type: "all",
                            permissions: ALL_ADMIN_SCREENS.map((s) => s.key),
                          })
                        }
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          userFormData.access_type === "all"
                            ? "bg-red-50 border-red-500 text-red-950 font-bold shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <ShieldCheck className="w-4 h-4 text-red-600" />
                          <span>Acesso Total</span>
                        </div>
                        <span className="text-[11px] text-stone-500 font-normal block mt-1">
                          Todas as telas liberadas
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setUserFormData({
                            ...userFormData,
                            access_type: "custom",
                          })
                        }
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          userFormData.access_type === "custom"
                            ? "bg-red-50 border-red-500 text-red-950 font-bold shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span>Personalizado</span>
                        </div>
                        <span className="text-[11px] text-stone-500 font-normal block mt-1">
                          Escolher telas uma por uma
                        </span>
                      </button>
                    </div>

                    {/* Checklist detalhado de telas */}
                    {userFormData.access_type === "custom" && (
                      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-200 text-xs">
                          <span className="text-stone-600 font-bold">
                            Selecione as telas permitidas:
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSelectAllScreens}
                              className="text-[11px] font-bold text-red-600 hover:underline"
                            >
                              Marcar Todas
                            </button>
                            <span className="text-stone-300">|</span>
                            <button
                              type="button"
                              onClick={handleDeselectAllScreens}
                              className="text-[11px] font-bold text-stone-500 hover:underline"
                            >
                              Desmarcar Todas
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {ALL_ADMIN_SCREENS.map((screen) => {
                            const isChecked = userFormData.permissions.includes(screen.key);
                            return (
                              <label
                                key={screen.key}
                                className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all text-xs select-none ${
                                  isChecked
                                    ? "bg-white border-red-400 font-bold text-stone-900 shadow-xs"
                                    : "bg-stone-100/60 border-stone-200 text-stone-500 hover:bg-stone-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleScreenPermission(screen.key)}
                                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                                />
                                <span>{screen.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Ativo */}
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">Usuário Ativo</span>
                      <span className="text-[11px] text-stone-500 block">
                        Permite que este usuário faça login no painel
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={userFormData.active}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, active: e.target.checked })
                      }
                      className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Ações do Modal */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 sticky bottom-0 bg-white z-10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUserModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveUser}
                    disabled={isSavingUser}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    {isSavingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        {editingUserId ? "Salvar Alterações" : "Criar Usuário"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

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