import { createEntityModel } from "./storage";

export const ComplementGroup = createEntityModel("complement_groups", [
  {
    id: "grp_ponto_carne",
    name: "Ponto da Carne",
    description: "Escolha como você prefere seu hambúrguer",
    min_quantity: 1,
    max_quantity: 1,
    required: true,
    active: true,
    order_index: 1
  },
  {
    id: "grp_turbine_burguer",
    name: "Turbine seu Burger",
    description: "Adicione mais sabor ao seu pedido (até 4 opções)",
    min_quantity: 0,
    max_quantity: 4,
    required: false,
    active: true,
    order_index: 2
  },
  {
    id: "grp_molhos_extras",
    name: "Molhos Especiais",
    description: "Escolha os molhos artesanais da casa",
    min_quantity: 0,
    max_quantity: 3,
    required: false,
    active: true,
    order_index: 3
  }
]);
