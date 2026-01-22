export type UserType = "individual" | "self_employed" | "sme";

export interface User {
  id: string;
  type: UserType;
  country: string;
  currency: string;
  language: "ar" | "en";
  createdAt: Date;
}
