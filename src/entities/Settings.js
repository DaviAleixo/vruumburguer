import { createEntityModel } from "./storage";
import { MOCK_SETTINGS } from "@/utils/mockData";

export const Settings = createEntityModel("settings", [
  { id: "settings-main", ...MOCK_SETTINGS }
]);
