import { createEntityModel } from "./storage";
import { MOCK_BANNERS } from "@/utils/mockData";

export const BannerImage = createEntityModel("banners", MOCK_BANNERS);
