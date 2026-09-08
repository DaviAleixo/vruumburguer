import { createEntityModel } from "./storage";
import { MOCK_USERS } from "@/utils/mockData";

const baseUserModel = createEntityModel("users", MOCK_USERS);

const CURRENT_USER_KEY = "vrumburguer_current_user";

export const User = {
  ...baseUserModel,

  async me() {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email === "cliente@vrumburguer.com" || parsed?.full_name === "Cliente Demo" || parsed?.id === "user-1") {
          localStorage.removeItem(CURRENT_USER_KEY);
          localStorage.removeItem("vrumburguer_recent_orders");
          localStorage.removeItem("vrumburguer_guest_info");
          localStorage.removeItem("vrumburguer_customer_phone");
          return null;
        }
        return parsed;
      }
      return null;
    } catch (_e) {
      return null;
    }
  },

  async login(userObj = null) {
    const userToLogin = userObj || MOCK_USERS[0];
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToLogin));
    }
    return userToLogin;
  },

  async loginWithPhone(phone, fullName = "") {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return null;

    try {
      const allUsers = await baseUserModel.list();
      let existingUser = (allUsers || []).find(u => (u.phone || "").replace(/\D/g, "") === cleanPhone);

      if (existingUser) {
        if (fullName && (!existingUser.full_name || existingUser.full_name === "Cliente")) {
          try {
            await baseUserModel.update(existingUser.id, { full_name: fullName });
            existingUser.full_name = fullName;
          } catch {}
        }
      } else {
        const newUserObj = {
          full_name: fullName || "Cliente",
          phone: phone,
          email: `${cleanPhone}@cliente.vrumburguer.com`,
          role: "user",
          created_date: new Date().toISOString()
        };
        existingUser = await baseUserModel.create(newUserObj);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
        localStorage.setItem("vrumburguer_customer_phone", phone);
      }
      return existingUser;
    } catch (err) {
      console.error("Erro ao fazer login com telefone:", err);
      const fallbackUser = {
        id: `user_${cleanPhone}`,
        full_name: fullName || "Cliente",
        phone: phone,
        email: `${cleanPhone}@cliente.vrumburguer.com`,
        role: "user"
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(fallbackUser));
        localStorage.setItem("vrumburguer_customer_phone", phone);
      }
      return fallbackUser;
    }
  },

  async logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem("vrumburguer_recent_orders");
      localStorage.removeItem("vrumburguer_guest_info");
      localStorage.removeItem("vrumburguer_customer_phone");
    }
    return { success: true };
  },
};
