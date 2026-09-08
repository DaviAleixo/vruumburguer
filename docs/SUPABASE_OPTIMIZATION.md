# ⚡ Guia e Auditoria de Otimização Máxima do Supabase (Plano Free)

Este documento apresenta a auditoria técnica e o plano de sobrevivência e otimização para manter o sistema de delivery do **Vrum Burguer** (1 empresa, 1 delivery, 1 banco dedicado) consumindo o mínimo absoluto de recursos no **Plano Free do Supabase**.

---

## 1. Contexto Arquitetural

- **Cenário:** Delivery dedicado para uma única empresa (Vrum Burguer).
- **Sem Multi-Tenancy:** Não há `tenant_id`, `store_id`, `company_id` ou partições desnecessárias.
- **Camada de Dados:** PostgreSQL com Row Level Security (RLS) ativo e políticas restritivas para tabelas sensíveis (`admin_users`).
- **Storage:** Bucket público `restaurant-images` com CDN e upload compactado WebP no frontend com nomes únicos gerados por timestamp e hash aleatório.

---

## 2. Tabela de Auditoria de Queries e Fluxos

| Query / Fluxo | Chamadas | Rows Retornadas | Payload Aprox. | Cache Utilizado | Status | Ação Realizada |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Abertura do Cardápio (Cold Cache)** | 6 queries consolidadas | ~35 linhas | ~4.5 KB | In-Memory + LocalStorage | OTIMIZADO [MEDIDO] | Removido `SELECT *`, eliminadas strings Base64 que somavam mais de 12.5 MB |
| **Abertura do Cardápio (Warm Cache)** | 0 queries | 0 linhas | 0 bytes | LocalStorage (30 min) | OTIMIZADO [MEDIDO] | Atendido 100% pelo cache do cliente |
| **Troca de Categoria** | 0 queries | 0 linhas | 0 bytes | Memória (Estado React) | OTIMIZADO [MEDIDO] | Filtro instantâneo no cliente |
| **Adicionar ao Carrinho / Qty** | 0 queries | 0 linhas | 0 bytes | LocalStorage | OTIMIZADO [MEDIDO] | Operação puramente local |
| **Validação de Cupom no Checkout** | 1 query pontual | 1 linha | ~120 bytes | Cache curto | OTIMIZADO [MEDIDO] | Filtro direto `.eq('code', ...)` com índice |
| **Criação de Pedido (Checkout)** | 1 mutation | 1 linha | ~35 bytes | Invalidação seletiva | OTIMIZADO [MEDIDO] | Inserção com retorno apenas de `id` |
| **Acompanhamento de Pedido** | 1 subscription | 0 a 3 eventos | ~150 bytes | Realtime filtrado | OTIMIZADO [MEDIDO] | Canal filtrado estritamente por `id=eq.ORDER_ID` |
| **Painel de Pedidos (Orders)** | 1 query / 8s | 35 linhas | ~2.5 KB | Polling controlado | OTIMIZADO [MEDIDO] | Limite de 35 pedidos + botão carregar mais |
| **Relatórios (Reports)** | 1 chamada RPC | 1 linha JSON | ~250 bytes | PostgreSQL RPC | OTIMIZADO [MEDIDO] | RPC `get_sales_metrics` (0 pedidos baixados) |
| **Clientes (Clients)** | 1 chamada RPC | ~N clientes | ~400 bytes | PostgreSQL RPC | OTIMIZADO [MEDIDO] | RPC `get_clients_summary` com aggregation |

---

## 3. Relatório de Imagens e Supabase Storage

| Item | Situação / Configuração | Status |
| :--- | :--- | :--- |
| **Buckets Supabase** | `restaurant-images` (Público, limite 2 MB, MIME validado) | ATIVO |
| **Imagens Fixas da Interface** | Servidas localmente no bundle Vite (`/src/assets/images`) | LOCAL (0 bytes Supabase Egress) |
| **Imagens Dinâmicas (Cardápio)** | URLs HTTPS estáveis (Unsplash / CDN) e bucket Supabase | PUBLIC CDN URL |
| **Upload de Novos Produtos** | Canvas client-side redimensiona para 800px max, converte para WebP (0.8) | OTIMIZADO (50-100 KB) |
| **Path Único no Storage** | `uploads/${Date.now()}_${randomHash}_${cleanName}.webp` | VERSIONADO (Sem colisão de cache) |
| **Blobs / Base64 no PostgreSQL** | 4 imagens Base64 (produtos, banners e logo) foram identificadas e removidas | CORRIGIDO [MEDIDO] |
| **Cache-Control no Storage** | `public, max-age=31536000, immutable` | CONFIGURADO |
| **Arquivos Órfãos no Storage** | Substituição de imagem não deleta o arquivo anterior automaticamente | DOCUMENTADO (Sem risco a curto prazo; 1 GB comporta ~15.000 imagens WebP) |
| **Lazy Loading** | Tags `<img>` de produtos e listas utilizam `loading="lazy"` | ATIVO |

---

## 4. Relatório dos Índices no PostgreSQL

| Tabela | Nome do Índice | Colunas | Existência | Status / Diagnóstico |
| :--- | :--- | :--- | :--- | :--- |
| `orders` | `idx_orders_created_date` | `created_date DESC` | SIM | ESSENCIAL (ordenação de turnos) |
| `orders` | `idx_orders_status` | `status` | SIM | ESSENCIAL (filtros de abas) |
| `orders` | `idx_orders_user_email` | `user_email` | SIM | ESSENCIAL (histórico de clientes) |
| `orders` | `idx_orders_customer_phone` | `customer_phone` | SIM | ESSENCIAL (busca rápida) |
| `products` | `idx_products_available` | `available` | SIM | ATIVO (cardápio público) |
| `products` | `idx_products_category` | `category` | SIM | ATIVO (vínculo de categorias) |
| `products` | `idx_products_category_id` | `category_id` | SIM | ATIVO (vínculo por id) |
| `categories` | `idx_categories_order` | `order_index` | SIM | ATIVO (ordenação do menu) |
| `categories` | `idx_categories_order_index` | `order_index` | REMOVIDO | DUPLICADO (Dropado com sucesso) |
| `coupons` | `coupons_code_key` | `code` (UNIQUE) | SIM | ESSENCIAL (busca por código) |
| `coupons` | `idx_coupons_code` | `code` | REMOVIDO | REDUNDANTE (Dropado com sucesso) |
| `banner_images` | `idx_banner_images_active` | `active, order_index` | SIM | COMPOSTO (carrossel ativo) |
| `complement_groups` | `idx_complement_groups_order` | `order_index` | SIM | ATIVO (ordem dos adicionais) |
| `complement_items` | `idx_complement_items_group` | `group_id, order_index` | SIM | COMPOSTO (itens por grupo) |
| `product_complement_groups`| `unique_product_group` | `product_id, group_id` | SIM | UNIQUE (vínculos produto-grupo) |

---

## 5. Relatório do Realtime

| Canal | Tabela | Filtro Aplicado | Criação | Destruição / Cleanup | Avaliação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rt_orders_XYZ` | `orders` | `id=eq.ORDER_ID` | Ao abrir `/MyOrders` com pedido ativo | Ao sair da página ou trocar pedido | OTIMIZADO (Egress mínimo) |
| *Canais de Produtos/Categorias* | N/A | Nenhum | Desativados no Supabase | Substituídos por `window.dispatchEvent` | 0 conexões desnecessárias |

---

## 6. Relatório de Cache e Deduplicação

| Recurso | Cache em Memória | LocalStorage | TTL | In-Flight Dedup | Invalidação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `settings` | SIM | SIM | 30 min | SIM (Promise map) | Instantânea no update |
| `categories` | SIM | SIM | 30 min | SIM (Promise map) | Instantânea no CRUD |
| `banner_images` | SIM | SIM | 30 min | SIM (Promise map) | Instantânea no CRUD |
| `complement_groups`| SIM | SIM | 20 min | SIM (Promise map) | Instantânea no CRUD |
| `complement_items` | SIM | SIM | 20 min | SIM (Promise map) | Instantânea no CRUD |
| `products` | SIM | NÃO | 10 min | SIM (Promise map) | Instantânea no CRUD |
| `coupons` | SIM | NÃO | 5 min | SIM (Promise map) | Instantânea no CRUD |
| `orders` | SIM | NÃO | 5 seg | SIM (Promise map) | Instantânea na inserção |

---

## 7. Estimativa e Cálculo de Egress (Free Plan Survival Strategy)

- **Total Mensal Real:** `NÃO MENSURADO` (Requer contagem de acessos reais do Google Analytics ou logs de tráfego de produção).
- **Fórmula de Projeção Técnica:**
  $$\text{Egress Total/Mês} = (N_{\text{sessões cold}} \times \text{Payload}_{\text{cold}}) + (N_{\text{pedidos}} \times \text{Payload}_{\text{checkout}}) + (N_{\text{painel}} \times \text{Payload}_{\text{admin}})$$
  - $\text{Payload}_{\text{cold}}$ do cardápio: ~4.5 KB [MEDIDO]
  - $\text{Payload}_{\text{warm}}$ do cardápio: 0 KB (Cache LocalStorage) [MEDIDO]
  - $\text{Payload}_{\text{checkout}}$ (criar pedido): ~35 bytes [MEDIDO]
  - $\text{Payload}_{\text{reports}}$ (RPC agregado): ~250 bytes [MEDIDO]
  - $\text{Payload}_{\text{clients}}$ (RPC agregado): ~400 bytes [MEDIDO]
