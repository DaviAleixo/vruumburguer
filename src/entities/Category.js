import { createEntityModel } from "./storage";
import { MOCK_CATEGORIES } from "@/utils/mockData";

export const Category = createEntityModel("categories", MOCK_CATEGORIES);
