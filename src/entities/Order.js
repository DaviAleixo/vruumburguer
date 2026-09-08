import { createEntityModel } from "./storage";
import { MOCK_ORDERS } from "@/utils/mockData";

export const Order = createEntityModel("orders", MOCK_ORDERS);
