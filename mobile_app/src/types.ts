// mobile_app/src/types.ts

// Роли в системе
export type Role = "client" | "driver" | "admin";

// Тип заявки (на будущее для MyOrders, DriverOrders, AdminPanel)
export interface Order {
  _id: string;
  wasteType: string;
  quantity: number;
  unit: "kg" | "ton" | "m3" | "bag";
  receivingOrg: string;
  status: "new" | "accepted" | "in_progress" | "completed" | "canceled";
  address: string;
  comment?: string;
  tariffPerUnit?: number;
  totalPrice?: number;
  createdAt?: string;
}
