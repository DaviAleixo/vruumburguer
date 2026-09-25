export const MOCK_CATEGORIES = [
  { id: "cat-burgers", name: "Burgers Artesanais", order_index: 1 },
  { id: "cat-combos", name: "Combos Especiais", order_index: 2 },
  { id: "cat-porcoes", name: "Porções & Acompanhamentos", order_index: 3 },
  { id: "cat-bebidas", name: "Bebidas", order_index: 4 },
  { id: "cat-sobremesas", name: "Sobremesas", order_index: 5 },
];

export const MOCK_PRODUCTS = [
  {
    id: "prod-1",
    name: "Vrum Classic Burger",
    description: "Pão brioche selado na manteiga, blend artesanal 180g, queijo cheddar derretido, cebola caramelizada e maionese especial da casa.",
    price: 34.90,
    category: "cat-burgers",
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-2",
    name: "Vrum Bacon Monster",
    description: "Pão brioche, 2x blends artesanais 160g, fatias generosas de bacon crocante, cheddar duplo, picles e molho barbecue rústico.",
    price: 44.90,
    category: "cat-burgers",
    image_url: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-3",
    name: "Vrum Smash Duplo",
    description: "Pão de batata macio, 2x ultra smash 90g com crostinha perfeita, queijo prato duplo e molho especial.",
    price: 29.90,
    category: "cat-burgers",
    image_url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-4",
    name: "Vrum Crispy Chicken",
    description: "Pão brioche, sobrecoxa empanada crocante temperada com especiarias, alface americana fresca, tomate e maionese de alho confit.",
    price: 32.90,
    category: "cat-burgers",
    image_url: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-5",
    name: "Combo Vrum Classic + Fritas + Refri",
    description: "1x Vrum Classic Burger + 1x Porção Individual de Batata Frita Crocante + 1x Refrigerante Lata 350ml.",
    price: 48.90,
    category: "cat-combos",
    image_url: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-6",
    name: "Combo Smash Duplo Família (2 Burgers + 2 Fritas)",
    description: "2x Vrum Smash Duplo + 2x Batatas Fritas Médias + 2x Refrigerantes Lata.",
    price: 79.90,
    category: "cat-combos",
    image_url: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-7",
    name: "Batata Frita Rústica Especial",
    description: "Batatas rústicas com casca, temperadas com alecrim fresco e páprica defumada, acompanhadas de maionese verde.",
    price: 22.90,
    category: "cat-porcoes",
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-8",
    name: "Onion Rings Empanadas",
    description: "Porção de anéis de cebola ultra crocantes empanados na farinha panko, acompanham molho barbecue defumado.",
    price: 24.90,
    category: "cat-porcoes",
    image_url: "https://images.unsplash.com/photo-1639024471285-0afc27429188?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-9",
    name: "Coca-Cola Original 350ml",
    description: "Lata 350ml gelada.",
    price: 7.00,
    category: "cat-bebidas",
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-10",
    name: "Suco Natural de Laranja 400ml",
    description: "Feito na hora com laranjas frescas selecionadas.",
    price: 9.90,
    category: "cat-bebidas",
    image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-11",
    name: "Milkshake de Nutella & Ninho 400ml",
    description: "Sorvete cremoso de baunilha batido com bastante Nutella pura e leite em pó Ninho.",
    price: 22.90,
    category: "cat-sobremesas",
    image_url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
  {
    id: "prod-12",
    name: "Brownie Artesanal com Sorvete",
    description: "Brownie de chocolate meio amargo com nozes, servido quentinho com sorvete de baunilha.",
    price: 19.90,
    category: "cat-sobremesas",
    image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
    available: true,
  },
];

export const MOCK_ADDITIONALS = [
  { id: "add-1", product_id: "prod-1", name: "Bacon Extra (4 fatias)", price: 6.00 },
  { id: "add-2", product_id: "prod-1", name: "Cheddar Cremoso Extra", price: 5.00 },
  { id: "add-3", product_id: "prod-1", name: "Hambúrguer 180g Adicional", price: 12.00 },
  { id: "add-4", product_id: "prod-2", name: "Cebola Caramelizada", price: 4.50 },
  { id: "add-5", product_id: "prod-3", name: "Bacon Crocante", price: 5.00 },
  { id: "add-6", product_id: "prod-4", name: "Queijo Cheddar", price: 4.50 },
];

export const MOCK_SETTINGS = {
  restaurant_name: "Vrum Burguer",
  restaurant_logo: "",
  opening_time: "18:00",
  closing_time: "23:59",
  address: "Av. Brasil, 1500 - Centro",
  instagram: "@vrumburguer",
  whatsapp: "11999999999",
  phone: "(11) 99999-9999",
  delivery_fee: 6.50,
  min_order_value: 20.00,
  open_days: [
    { day: 0, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 1, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 2, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 3, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 4, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 5, enabled: true, open_time: "18:00", close_time: "23:59" },
    { day: 6, enabled: true, open_time: "18:00", close_time: "23:59" },
  ],
};

export const MOCK_BANNERS = [
  {
    id: "banner-1",
    title: "Burgers Artesanais Suculentos",
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
    active: true,
    order_index: 1,
  },
  {
    id: "banner-2",
    title: "Combos Especiais com Batata e Refri",
    image_url: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200&auto=format&fit=crop&q=80",
    active: true,
    order_index: 2,
  },
];

export const MOCK_COUPONS = [
  {
    id: "coupon-1",
    name: "Primeira Compra",
    code: "PRIMEIRA10",
    description: "10% de desconto no seu primeiro pedido",
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: 30,
    active: true,
  },
  {
    id: "coupon-2",
    name: "Desconto Burger",
    code: "VRUM5",
    description: "R$ 5,00 de desconto em pedidos acima de R$ 40",
    discount_type: "fixed",
    discount_value: 5,
    min_order_value: 40,
    active: true,
  },
];

export const MOCK_COUPON_USAGES = [];

export const MOCK_ADMIN_USERS = [
  {
    id: "admin-1",
    username: "admin",
    password: "123",
    role: "admin",
    active: true,
  },
];

export const MOCK_USERS = [];

export const MOCK_USER_ADDRESSES = [];

export const MOCK_ORDERS = [];
