import { createEntityModel } from "./storage";
import { MOCK_COUPONS } from "@/utils/mockData";

export const Coupon = createEntityModel("coupons", MOCK_COUPONS);
