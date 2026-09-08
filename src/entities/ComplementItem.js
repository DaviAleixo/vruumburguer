import { createEntityModel } from "./storage";

export const ComplementItem = createEntityModel("complement_items", [
  { id: "item_ponto_1", group_id: "grp_ponto_carne", name: "Ao Ponto (Rosadinho e Suculento)", description: "Ponto padrão da casa", price: 0.00, max_quantity: 1, active: true, order_index: 1 },
  { id: "item_ponto_2", group_id: "grp_ponto_carne", name: "Bem Passado", description: "Sem partes rosadas", price: 0.00, max_quantity: 1, active: true, order_index: 2 },
  { id: "item_ponto_3", group_id: "grp_ponto_carne", name: "Mal Passado (Selado e Vermelhinho)", description: "Super suculento", price: 0.00, max_quantity: 1, active: true, order_index: 3 },
  { id: "item_turb_1", group_id: "grp_turbine_burguer", name: "Bacon Crocante Fatiado (4 fatias)", description: "Bacon defumado artesanal", price: 4.50, max_quantity: 2, active: true, order_index: 1 },
  { id: "item_turb_2", group_id: "grp_turbine_burguer", name: "Queijo Cheddar Cremoso Extra", description: "Cheddar derretido", price: 4.00, max_quantity: 2, active: true, order_index: 2 },
  { id: "item_turb_3", group_id: "grp_turbine_burguer", name: "Hambúrguer Extra 160g", description: "Mais um burger artesanal", price: 8.90, max_quantity: 2, active: true, order_index: 3 },
  { id: "item_turb_4", group_id: "grp_turbine_burguer", name: "Cebola Caramelizada na Chapa", description: "No açúcar mascavo e shoyu", price: 3.50, max_quantity: 1, active: true, order_index: 4 },
  { id: "item_turb_5", group_id: "grp_turbine_burguer", name: "Ovo Caipira Frito na Manteiga", description: "Gema mole ou firme", price: 3.00, max_quantity: 1, active: true, order_index: 5 },
  { id: "item_molho_1", group_id: "grp_molhos_extras", name: "Maionese Verde Especial da Casa (Pote 50ml)", description: "Ervas frescas", price: 3.00, max_quantity: 2, active: true, order_index: 1 },
  { id: "item_molho_2", group_id: "grp_molhos_extras", name: "Barbecue Artesanal Defumado (Pote 50ml)", description: "Sabor defumado", price: 3.00, max_quantity: 2, active: true, order_index: 2 },
  { id: "item_molho_3", group_id: "grp_molhos_extras", name: "Molho de Alho com Pimenta Biquinho (50ml)", description: "Cremoso e sem arder", price: 3.50, max_quantity: 2, active: true, order_index: 3 }
]);
