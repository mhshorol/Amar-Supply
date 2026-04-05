import axios from 'axios';

export interface WooCommerceOrder {
  id: number;
  status: string;
  currency: string;
  total: string;
  total_tax: string;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
  };
  payment_method_title: string;
  transaction_id: string;
  date_created: string;
  date_modified: string;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    sku: string;
    price: number;
  }>;
  customer_note: string;
}

export interface WooCommerceOrdersResponse {
  orders: WooCommerceOrder[];
  totalPages: number;
  totalOrders: number;
}

export class WooCommerceService {
  private static baseUrl = '/api/woocommerce';

  static async getOrders(params: {
    page?: number;
    per_page?: number;
    status?: string;
    search?: string;
  }): Promise<WooCommerceOrdersResponse> {
    const response = await axios.get(`${this.baseUrl}/orders`, { params });
    return {
      orders: response.data.orders,
      totalPages: parseInt(response.data.totalPages || '1'),
      totalOrders: parseInt(response.data.totalOrders || '0')
    };
  }

  static async updateOrderStatus(id: number, status: string): Promise<WooCommerceOrder> {
    const response = await axios.put(`${this.baseUrl}/orders/${id}`, { status });
    return response.data;
  }
}
