import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Storage manager supporting Supabase with ultra-low egress caching,
 * in-flight request deduplication, explicit column projections (no SELECT *),
 * and localStorage fallback.
 */
const STORAGE_PREFIX = "vrumburguer_db_";

// Mapeamento de projeção de colunas estritas (PROIBIDO SELECT *)
// Retorna apenas as colunas indispensáveis para economizar banda/egress do Supabase
const TABLE_COLUMNS = {
  settings: "id,restaurant_name,restaurant_logo,opening_time,closing_time,open_days,phone,address,instagram,whatsapp,delivery_fee,min_order_value,delivery_time,manual_store_open,manual_override_date",
  categories: "id,name,order_index,is_combo,created_date",
  products: "id,name,description,price,category,category_id,image_url,available,popular,created_date",
  product_additionals: "id,product_id,name,price,required,max_quantity,active",
  complement_groups: "id,name,description,min_quantity,max_quantity,required,active,order_index",
  complement_items: "id,group_id,name,description,price,max_quantity,image_url,active,order_index",
  product_complement_groups: "id,product_id,group_id,order_index",
  banner_images: "id,title,image_url,order_index,active",
  banners: "id,title,image_url,order_index,active",
  coupons: "id,code,name,description,discount_type,discount_value,apply_to,applicable_products,min_order_value,usage_limit,start_date,end_date,active",
  coupon_usages: "id,coupon_id,user_email,order_id,created_date",
  orders: "id,order_number,customer_name,customer_phone,customer_email,customer_address,delivery_address,total_amount,total,subtotal,delivery_fee,status,payment_method,order_type,table_number,notes,coupon_code,discount_amount,discount,user_email,items,sent_at,created_date",
  users: "id,full_name,email,phone,role,created_date",
  user_addresses: "id,user_email,user_phone,name,cep,zip_code,street,number,complement,neighborhood,city,state,reference,is_default",
};

// Tabelas estáticas elegíveis para cache persistido em LocalStorage
const PERSISTENT_CACHE_TABLES = new Set([
  "settings",
  "categories",
  "complement_groups",
  "complement_items",
  "product_complement_groups",
  "banner_images",
  "banners"
]);

// Memória Cache em tempo de execução para eliminar egress redundante
const memoryCache = new Map();

// Compartilhamento de requisições simultâneas em andamento (In-Flight Promise Deduplication)
const inFlightPromises = new Map();

// Tabela de tempos de expiração de cache (TTL em milissegundos)
// Tempos ágeis para garantir atualização imediata no site da loja ao alterar no painel
const CACHE_TTL_MAP = {
  settings: 5 * 1000,                    // 5 segundos
  categories: 10 * 1000,                 // 10 segundos
  banner_images: 5 * 1000,               // 5 segundos
  banners: 5 * 1000,                     // 5 segundos
  complement_groups: 10 * 1000,          // 10 segundos
  complement_items: 10 * 1000,           // 10 segundos
  product_complement_groups: 10 * 1000,  // 10 segundos
  products: 10 * 1000,                   // 10 segundos (com invalidação instantânea no CRUD)
  product_additionals: 10 * 1000,        // 10 segundos
  coupons: 5 * 1000,                     // 5 segundos
  orders: 3 * 1000,                      // 3 segundos
  users: 30 * 1000,                      // 30 segundos
  user_addresses: 30 * 1000,             // 30 segundos
};

function getCacheKey(collectionKey, method, query, sort, limit) {
  return `${collectionKey}_${method}_${JSON.stringify(query || {})}_${sort || ''}_${limit || ''}`;
}

export function invalidateCache(collectionKey) {
  const keysToInvalidate = [collectionKey];
  if (collectionKey === "banners" || collectionKey === "banner_images") {
    keysToInvalidate.push("banners", "banner_images");
  }

  for (const targetKey of keysToInvalidate) {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${targetKey}_`)) {
        memoryCache.delete(key);
      }
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}cache_ts_${targetKey}`);
      } catch {}
    }
  }
}

// Canal cross-tab para sincronização em tempo real entre painel e loja
const broadcast = typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined"
  ? new BroadcastChannel("vrumburguer_db_sync")
  : null;

if (broadcast) {
  broadcast.onmessage = (event) => {
    const { collectionKey, type, data, id } = event.data || {};
    if (collectionKey) {
      invalidateCache(collectionKey);
      const localEvent = new CustomEvent(`db_event_${collectionKey}`, {
        detail: { type, data, id },
      });
      window.dispatchEvent(localEvent);
    }
  };
}

// Fallback de sincronização cross-tab via StorageEvent
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === `${STORAGE_PREFIX}last_sync` && e.newValue) {
      try {
        const { collectionKey, type, data, id } = JSON.parse(e.newValue);
        if (collectionKey) {
          invalidateCache(collectionKey);
          const localEvent = new CustomEvent(`db_event_${collectionKey}`, {
            detail: { type, data, id },
          });
          window.dispatchEvent(localEvent);
        }
      } catch {}
    }
  });
}

function getStoredLocalCache(collectionKey, ttl) {
  if (typeof window === "undefined" || !PERSISTENT_CACHE_TABLES.has(collectionKey)) return null;
  try {
    const rawTs = localStorage.getItem(`${STORAGE_PREFIX}cache_ts_${collectionKey}`);
    if (!rawTs) return null;
    const ts = parseInt(rawTs, 10);
    if (Date.now() - ts > ttl) return null;

    const rawData = localStorage.getItem(`${STORAGE_PREFIX}${collectionKey}`);
    if (!rawData) return null;
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

function setStoredLocalCache(collectionKey, data) {
  if (typeof window === "undefined" || !PERSISTENT_CACHE_TABLES.has(collectionKey)) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}cache_ts_${collectionKey}`, String(Date.now()));
    localStorage.setItem(`${STORAGE_PREFIX}${collectionKey}`, JSON.stringify(data));
  } catch {}
}

function getCollection(collectionKey, defaultData = []) {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + collectionKey);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + collectionKey, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (_e) {
    return defaultData;
  }
}

function setCollection(collectionKey, items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + collectionKey, JSON.stringify(items));
  } catch (_e) {
    console.error("Failed to save to localStorage", _e);
  }
}

function notifySubscribers(collectionKey, type, data, id) {
  if (typeof window === "undefined") return;
  const detail = { type, data, id };
  const event = new CustomEvent(`db_event_${collectionKey}`, { detail });
  window.dispatchEvent(event);

  if (collectionKey === "banners" || collectionKey === "banner_images") {
    const altKey = collectionKey === "banners" ? "banner_images" : "banners";
    window.dispatchEvent(new CustomEvent(`db_event_${altKey}`, { detail }));
  }

  // Cross-tab broadcast
  if (broadcast) {
    try {
      broadcast.postMessage({ collectionKey, type, data, id });
    } catch {}
  }

  // LocalStorage fallback para sincronização entre abas
  try {
    localStorage.setItem(`${STORAGE_PREFIX}last_sync`, JSON.stringify({ collectionKey, type, data, id, ts: Date.now() }));
  } catch {}
}

function sortItems(items, sortField) {
  if (!sortField) return items;
  const isDesc = sortField.startsWith("-");
  const field = isDesc ? sortField.substring(1) : sortField;
  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal === bVal) return 0;
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    if (isDesc) {
      return aVal < bVal ? 1 : -1;
    }
    return aVal > bVal ? 1 : -1;
  });
}

function matchQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, value] of Object.entries(query)) {
    if (item[key] !== value) return false;
  }
  return true;
}

export function createEntityModel(collectionKey, defaultData = []) {
  const defaultTTL = CACHE_TTL_MAP[collectionKey] || 5 * 1000;
  const projection = TABLE_COLUMNS[collectionKey] || "*";

  return {
    async list(sort = null, limit = null) {
      const cacheKey = getCacheKey(collectionKey, "list", null, sort, limit);
      const cached = memoryCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp < defaultTTL)) {
        return cached.data;
      }

      // Deduplicação de requisições simultâneas em andamento
      if (inFlightPromises.has(cacheKey)) {
        return inFlightPromises.get(cacheKey);
      }

      // Tenta carregar do cache persistente do LocalStorage se for recente
      if (!queryRequiresFreshNetwork(collectionKey)) {
        const localStored = getStoredLocalCache(collectionKey, defaultTTL);
        if (localStored && Array.isArray(localStored)) {
          let items = localStored;
          if (sort) items = sortItems(items, sort);
          if (limit && limit > 0) items = items.slice(0, limit);
          memoryCache.set(cacheKey, { timestamp: now, data: items });
          return items;
        }
      }

      const fetchPromise = (async () => {
        if (isSupabaseConfigured() && supabase) {
          try {
            let q = supabase.from(collectionKey).select(projection);
            if (sort) {
              const isDesc = sort.startsWith("-");
              const field = isDesc ? sort.substring(1) : sort;
              q = q.order(field, { ascending: !isDesc });
            }
            if (limit && limit > 0) q = q.limit(limit);
            let { data, error } = await q;

            // Fallback de compatibilidade caso a tabela não exista (erro SQL)
            if (error && (collectionKey === "banner_images" || collectionKey === "banners")) {
              const altTable = collectionKey === "banner_images" ? "banners" : "banner_images";
              try {
                let altQ = supabase.from(altTable).select(projection);
                if (sort) {
                  const isDesc = sort.startsWith("-");
                  const field = isDesc ? sort.substring(1) : sort;
                  altQ = altQ.order(field, { ascending: !isDesc });
                }
                if (limit && limit > 0) altQ = altQ.limit(limit);
                const altRes = await altQ;
                if (!altRes.error && altRes.data) {
                  data = altRes.data;
                  error = null;
                }
              } catch {}
            }

            if (!error && data !== null && data !== undefined) {
              memoryCache.set(cacheKey, { timestamp: Date.now(), data });
              setStoredLocalCache(collectionKey, data);
              setCollection(collectionKey, data);
              return data;
            }
          } catch (_err) {
            console.warn(`[Supabase] Erro ao listar ${collectionKey}, usando fallback local:`, _err);
          }
        }

        let items = getCollection(collectionKey, defaultData);
        if (sort) items = sortItems(items, sort);
        if (limit && limit > 0) items = items.slice(0, limit);
        memoryCache.set(cacheKey, { timestamp: Date.now(), data: items });
        return items;
      })().finally(() => {
        inFlightPromises.delete(cacheKey);
      });

      inFlightPromises.set(cacheKey, fetchPromise);
      return fetchPromise;
    },

    async filter(query = {}, sort = null, limit = null) {
      const cacheKey = getCacheKey(collectionKey, "filter", query, sort, limit);
      const cached = memoryCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp < defaultTTL)) {
        return cached.data;
      }

      // Deduplicação de requisições simultâneas em andamento
      if (inFlightPromises.has(cacheKey)) {
        return inFlightPromises.get(cacheKey);
      }

      const fetchPromise = (async () => {
        if (isSupabaseConfigured() && supabase) {
          try {
            let q = supabase.from(collectionKey).select(projection);
            if (query && Object.keys(query).length > 0) {
              q = q.match(query);
            }
            if (sort) {
              const isDesc = sort.startsWith("-");
              const field = isDesc ? sort.substring(1) : sort;
              q = q.order(field, { ascending: !isDesc });
            }
            if (limit && limit > 0) q = q.limit(limit);
            let { data, error } = await q;

            // Fallback de compatibilidade apenas se houver erro SQL na tabela
            if (error && (collectionKey === "banner_images" || collectionKey === "banners")) {
              const altTable = collectionKey === "banner_images" ? "banners" : "banner_images";
              try {
                let altQ = supabase.from(altTable).select(projection);
                if (query && Object.keys(query).length > 0) {
                  altQ = altQ.match(query);
                }
                if (sort) {
                  const isDesc = sort.startsWith("-");
                  const field = isDesc ? sort.substring(1) : sort;
                  altQ = altQ.order(field, { ascending: !isDesc });
                }
                if (limit && limit > 0) altQ = altQ.limit(limit);
                const altRes = await altQ;
                if (!altRes.error && altRes.data) {
                  data = altRes.data;
                  error = null;
                }
              } catch {}
            }

            if (!error && data !== null && data !== undefined) {
              memoryCache.set(cacheKey, { timestamp: Date.now(), data });
              return data;
            }
          } catch (_err) {
            console.warn(`[Supabase] Erro ao filtrar ${collectionKey}, usando fallback local:`, _err);
          }
        }

        let items = getCollection(collectionKey, defaultData);
        items = items.filter((item) => matchQuery(item, query));
        if (sort) items = sortItems(items, sort);
        if (limit && limit > 0) items = items.slice(0, limit);
        memoryCache.set(cacheKey, { timestamp: Date.now(), data: items });
        return items;
      })().finally(() => {
        inFlightPromises.delete(cacheKey);
      });

      inFlightPromises.set(cacheKey, fetchPromise);
      return fetchPromise;
    },

    async get(id) {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from(collectionKey)
            .select(projection)
            .eq("id", id)
            .maybeSingle();
          if (!error && data) return data;
        } catch (_err) {
          console.warn(`[Supabase] Erro ao buscar ${collectionKey} por id:`, _err);
        }
      }

      const items = getCollection(collectionKey, defaultData);
      return items.find((item) => String(item.id) === String(id)) || null;
    },

    async create(data) {
      invalidateCache(collectionKey);
      const newId = data.id || `${collectionKey}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newItem = {
        id: newId,
        created_date: new Date().toISOString(),
        ...data,
      };

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: created, error } = await supabase
            .from(collectionKey)
            .insert([newItem])
            .select("id")
            .single();
          if (!error && created) {
            invalidateCache(collectionKey);
            const items = getCollection(collectionKey, defaultData);
            const updated = [newItem, ...items];
            setCollection(collectionKey, updated);
            setStoredLocalCache(collectionKey, updated);
            notifySubscribers(collectionKey, "create", newItem, newId);
            return { ...newItem, id: created.id || newId };
          }
        } catch (_err) {
          console.warn(`[Supabase] Erro ao criar em ${collectionKey}:`, _err);
        }
      }

      const items = getCollection(collectionKey, defaultData);
      const updated = [newItem, ...items];
      setCollection(collectionKey, updated);
      setStoredLocalCache(collectionKey, updated);
      notifySubscribers(collectionKey, "create", newItem, newId);
      return newItem;
    },

    async update(id, data) {
      invalidateCache(collectionKey);
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: updated, error } = await supabase
            .from(collectionKey)
            .update(data)
            .eq("id", id)
            .select("id")
            .single();
          if (!error && updated) {
            invalidateCache(collectionKey);
            const items = getCollection(collectionKey, defaultData);
            const updatedItems = items.map((item) => {
              if (String(item.id) === String(id)) {
                return { ...item, ...data };
              }
              return item;
            });
            setCollection(collectionKey, updatedItems);
            setStoredLocalCache(collectionKey, updatedItems);
            notifySubscribers(collectionKey, "update", { id, ...data }, id);
            return { id, ...data };
          }
        } catch (_err) {
          console.warn(`[Supabase] Erro ao atualizar em ${collectionKey}:`, _err);
        }
      }

      const items = getCollection(collectionKey, defaultData);
      let updatedItem = null;
      const updated = items.map((item) => {
        if (String(item.id) === String(id)) {
          updatedItem = { ...item, ...data };
          return updatedItem;
        }
        return item;
      });
      if (updatedItem) {
        setCollection(collectionKey, updated);
        setStoredLocalCache(collectionKey, updated);
        notifySubscribers(collectionKey, "update", updatedItem, id);
      }
      return updatedItem || { id, ...data };
    },

    async delete(id) {
      invalidateCache(collectionKey);
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from(collectionKey).delete().eq("id", id);
          if (!error) {
            invalidateCache(collectionKey);
            const items = getCollection(collectionKey, defaultData);
            const updated = items.filter((item) => String(item.id) !== String(id));
            setCollection(collectionKey, updated);
            setStoredLocalCache(collectionKey, updated);
            notifySubscribers(collectionKey, "delete", null, id);
            return { success: true, id };
          }
        } catch (_err) {
          console.warn(`[Supabase] Erro ao deletar em ${collectionKey}:`, _err);
        }
      }

      const items = getCollection(collectionKey, defaultData);
      const updated = items.filter((item) => String(item.id) !== String(id));
      setCollection(collectionKey, updated);
      setStoredLocalCache(collectionKey, updated);
      notifySubscribers(collectionKey, "delete", null, id);
      return { success: true, id };
    },

    subscribe(callback, options = {}) {
      if (typeof window === "undefined") return () => {};

      // Realtime do Supabase somente é aberto para orders quando explicitamente solicitado ou filtrado
      const allowSupabaseRealtime = collectionKey === "orders";

      if (allowSupabaseRealtime && isSupabaseConfigured() && supabase) {
        const channelFilter = options?.filter ? { filter: options.filter } : {};
        const channelName = `rt_${collectionKey}_${Math.random().toString(36).substr(2, 6)}`;
        const channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: collectionKey, ...channelFilter },
            (payload) => {
              invalidateCache(collectionKey);
              const type = payload.eventType === "INSERT" ? "create" : payload.eventType === "UPDATE" ? "update" : "delete";
              callback({ type, data: payload.new || payload.old, id: payload.new?.id || payload.old?.id });
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }

      const handler = (e) => {
        invalidateCache(collectionKey);
        callback(e.detail);
      };
      window.addEventListener(`db_event_${collectionKey}`, handler);
      return () => {
        window.removeEventListener(`db_event_${collectionKey}`, handler);
      };
    },
  };
}

function queryRequiresFreshNetwork(collectionKey) {
  return collectionKey === "orders";
}
