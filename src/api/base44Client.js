import {
  Product,
  Category,
  Order,
  Settings,
  BannerImage,
  Coupon,
  CouponUsage,
  AdminUser,
  User,
  UserAddress,
  ProductAdditional,
} from "@/entities";

export const base44 = {
  auth: {
    async me() {
      return User.me();
    },
    async login(credentials) {
      return User.login(credentials);
    },
    async logout() {
      return User.logout();
    },
    async updateMe(data) {
      const currentUser = await User.me();
      const updated = { ...currentUser, ...data };
      return User.login(updated);
    },
    redirectToLogin() {
      console.log("Login modal/sheet requested");
    },
    isAuthenticated() {
      return true;
    },
  },
  entities: {
    Product,
    Category,
    Order,
    Settings,
    BannerImage,
    Coupon,
    CouponUsage,
    AdminUser,
    User,
    UserAddress,
    ProductAdditional,
  },
};
