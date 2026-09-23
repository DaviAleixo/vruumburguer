/**
 * Retorna a chave da data atual no formato YYYY-MM-DD considerando o fuso horário local
 */
export const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Determina se o restaurante está aberto considerando:
 * 1. Override manual forçado para o dia de hoje (manual_override_date === today && manual_store_open !== null/undefined)
 * 2. Horários automáticos configurados em open_days ou opening_time / closing_time
 */
export const isStoreOpen = (settings) => {
  if (!settings) return true;

  const todayKey = getTodayDateKey();

  // Se houver override manual ativo definido para o dia de hoje, respeita a escolha manual
  if (
    settings.manual_override_date === todayKey &&
    settings.manual_store_open !== null &&
    settings.manual_store_open !== undefined
  ) {
    return Boolean(settings.manual_store_open);
  }

  // Caso contrário (ou se já virou o dia), respeita o horário automático da configuração
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (settings.open_days && settings.open_days.length > 0) {
    const dayConfig = settings.open_days.find(d => d.day === currentDay);
    if (!dayConfig || !dayConfig.enabled) return false;
    if (!dayConfig.opening_time || !dayConfig.closing_time) return true;

    const [oh, om] = dayConfig.opening_time.split(':').map(Number);
    const [ch, cm] = dayConfig.closing_time.split(':').map(Number);
    const openTime = oh * 60 + om;
    const closeTime = ch * 60 + cm;

    if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
    return currentTime >= openTime && currentTime < closeTime;
  }

  if (!settings.opening_time || !settings.closing_time) return true;
  const [openHour, openMinute] = settings.opening_time.split(':').map(Number);
  const [closeHour, closeMinute] = settings.closing_time.split(':').map(Number);
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
  return currentTime >= openTime && currentTime < closeTime;
};

/**
 * Retorna detalhes do status da loja
 */
export const getStoreStatusInfo = (settings) => {
  const isOpen = isStoreOpen(settings);
  const todayKey = getTodayDateKey();
  const isManual = Boolean(
    settings &&
    settings.manual_override_date === todayKey &&
    settings.manual_store_open !== null &&
    settings.manual_store_open !== undefined
  );

  return {
    isOpen,
    isManual,
    overrideDate: settings?.manual_override_date,
  };
};
