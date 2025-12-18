import { api } from "./apiClient";

export type Order = {
  id: string;
  wasteType: string;
  subType?: string;
  quantity: number;
  unit: string;
  address: string;
  status: string;
};

export function getOrders(): Promise<Order[]> {
  return api("/api/orders");
}

export function createOrder(data: {
  wasteType: string;
  subType?: string;
  quantity: number;
  unit?: string;
  address: string;
}) {
  return api("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
