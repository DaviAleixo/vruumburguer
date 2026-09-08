import { createEntityModel } from "./storage";
import { MOCK_PRODUCTS } from "@/utils/mockData";

export const Product = createEntityModel("products", MOCK_PRODUCTS);
