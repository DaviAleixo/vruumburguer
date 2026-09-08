import { createEntityModel } from "./storage";
import { MOCK_COUPON_USAGES } from "@/utils/mockData";

export const CouponUsage = createEntityModel("coupon_usages", MOCK_COUPON_USAGES);
