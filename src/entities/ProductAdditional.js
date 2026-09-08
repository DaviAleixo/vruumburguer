import { createEntityModel } from "./storage";
import { MOCK_ADDITIONALS } from "@/utils/mockData";

export const ProductAdditional = createEntityModel("product_additionals", MOCK_ADDITIONALS);
