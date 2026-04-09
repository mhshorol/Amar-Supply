import axios from 'axios';

export interface CourierOrderData {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  amount: number;
  cod_amount: number;
  note?: string;
  weight?: number;
  courier?: string;
  invoice?: string;
}

export interface CourierInterface {
  createOrder(data: CourierOrderData): Promise<any>;
  trackOrder(trackingId: string): Promise<any>;
  cancelOrder(orderId: string): Promise<any>;
  getBalance?(): Promise<any>;
  getCities(): Promise<any>;
  getZones(cityId: string): Promise<any>;
}

export class SteadfastAdapter implements CourierInterface {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://portal.steadfast.com.bd/api/v1';

  constructor(config: any) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/create_order`, {
      invoice: data.invoice,
      recipient_name: data.customer_name,
      recipient_phone: data.customer_phone,
      recipient_address: data.customer_address,
      cod_amount: data.cod_amount,
      note: data.note
    }, {
      headers: {
        'api-key': this.apiKey,
        'secret-key': this.secretKey,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async trackOrder(trackingId: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/status_by_tracking/${trackingId}`, {
      headers: {
        'api-key': this.apiKey,
        'secret-key': this.secretKey
      }
    });
    return response.data;
  }
  
  async getBalance(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/get_balance`, {
      headers: {
        'api-key': this.apiKey,
        'secret-key': this.secretKey
      }
    });
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<any> {
    // Steadfast doesn't have a direct cancel API in v1 docs usually, 
    // but some implementations use a specific endpoint.
    throw new Error('Cancel order not implemented for Steadfast');
  }

  async getCities(): Promise<any> {
    return []; // Steadfast doesn't require city/zone IDs for order creation usually
  }

  async getZones(cityId: string): Promise<any> {
    return [];
  }
}

export class PathaoAdapter implements CourierInterface {
  private clientId: string;
  private clientSecret: string;
  private username?: string;
  private password?: string;
  private baseUrl = 'https://api-hermes.pathao.com'; // Production URL

  constructor(config: any) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
  }

  private async getAccessToken(): Promise<string> {
    // Pathao token logic would go here
    return 'mock-token';
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    const token = await this.getAccessToken();
    // Pathao specific payload
    return { status: 'success', tracking_id: 'PATHAO-MOCK' };
  }

  async trackOrder(trackingId: string): Promise<any> {
    return { status: 'success', data: { status: 'Pending' } };
  }

  async cancelOrder(orderId: string): Promise<any> {
    return { status: 'success' };
  }

  async getCities(): Promise<any> {
    return [];
  }

  async getZones(cityId: string): Promise<any> {
    return [];
  }

  async getBalance(): Promise<any> {
    // Pathao balance logic
    return { balance: 0, status: 200 };
  }
}

export class RedxAdapter implements CourierInterface {
  private apiKey: string;
  private baseUrl = 'https://api.redx.com.bd/v1.0';

  constructor(config: any) {
    this.apiKey = config.apiKey;
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    return { status: 'success', tracking_id: 'REDX-MOCK' };
  }

  async trackOrder(trackingId: string): Promise<any> {
    return { status: 'success' };
  }

  async cancelOrder(orderId: string): Promise<any> {
    return { status: 'success' };
  }

  async getCities(): Promise<any> {
    return [];
  }

  async getZones(cityId: string): Promise<any> {
    return [];
  }

  async getBalance(): Promise<any> {
    // RedX balance logic
    return { balance: 0, status: 200 };
  }
}

export class PaperflyAdapter implements CourierInterface {
  private apiKey: string;

  constructor(config: any) {
    this.apiKey = config.apiKey;
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    return { status: 'success', tracking_id: 'PAPERFLY-MOCK' };
  }

  async trackOrder(trackingId: string): Promise<any> {
    return { status: 'success' };
  }

  async cancelOrder(orderId: string): Promise<any> {
    return { status: 'success' };
  }

  async getCities(): Promise<any> {
    return [];
  }

  async getZones(cityId: string): Promise<any> {
    return [];
  }

  async getBalance(): Promise<any> {
    return { balance: 0, status: 200 };
  }
}

export class CarrybeeAdapter implements CourierInterface {
  private apiKey: string;

  constructor(config: any) {
    this.apiKey = config.apiKey;
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    return { status: 'success', tracking_id: 'CARRYBEE-MOCK' };
  }

  async trackOrder(trackingId: string): Promise<any> {
    return { status: 'success' };
  }

  async cancelOrder(orderId: string): Promise<any> {
    return { status: 'success' };
  }

  async getCities(): Promise<any> {
    return [];
  }

  async getZones(cityId: string): Promise<any> {
    return [];
  }

  async getBalance(): Promise<any> {
    return { balance: 0, status: 200 };
  }
}

export class CourierFactory {
  static getAdapter(courierName: string, config: any): CourierInterface {
    switch (courierName.toLowerCase()) {
      case 'steadfast':
        return new SteadfastAdapter(config);
      case 'pathao':
        return new PathaoAdapter(config);
      case 'redx':
        return new RedxAdapter(config);
      case 'paperfly':
        return new PaperflyAdapter(config);
      case 'carrybee':
        return new CarrybeeAdapter(config);
      default:
        throw new Error(`Courier ${courierName} not supported`);
    }
  }
}
