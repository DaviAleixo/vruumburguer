import { createEntityModel } from "./storage";
import { MOCK_USER_ADDRESSES } from "@/utils/mockData";

export const UserAddress = createEntityModel("user_addresses", MOCK_USER_ADDRESSES);
