import { useEffect } from "react";
import { Settings } from "@/entities/Settings";

export default function DynamicHead() {
  useEffect(() => {
    const updateMetadata = (settings) => {
      if (!settings) return;

      const name = settings.restaurant_name?.trim() || "Vruum Burguer";
      
      // Update page title if not already managed by admin panel or specific page
      if (!document.title.includes("Painel Admin")) {
        document.title = name;
      }

      // Update Favicon & Apple Touch Icon
      const logoUrl = settings.restaurant_logo || "";
      let favicon = document.querySelector("link[rel='icon']");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }

      let appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement("link");
        appleTouchIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleTouchIcon);
      }

      if (logoUrl) {
        favicon.href = logoUrl;
        favicon.type = "image/png";
        appleTouchIcon.href = logoUrl;
      } else {
        favicon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍔</text></svg>";
        favicon.type = "image/svg+xml";
      }
    };

    // Load initial settings
    const loadSettings = async () => {
      try {
        const list = await Settings.list();
        if (list && list.length > 0) {
          updateMetadata(list[0]);
        }
      } catch (err) {
        console.warn("Erro ao carregar configurações dinâmicas de cabeçalho:", err);
      }
    };

    loadSettings();

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        updateMetadata(e.detail);
      } else {
        loadSettings();
      }
    };

    window.addEventListener("settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", loadSettings);

    return () => {
      window.removeEventListener("settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", loadSettings);
    };
  }, []);

  return null;
}
