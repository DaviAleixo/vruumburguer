import { createEntityModel } from "./storage";
import { MOCK_ADMIN_USERS } from "@/utils/mockData";

export const AdminUser = createEntityModel("admin_users", MOCK_ADMIN_USERS);
