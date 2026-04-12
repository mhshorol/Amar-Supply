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
  checkFraud?(phone: string): Promise<any>;
  getCities(): Promise<any>;
  getZones(cityId: string): Promise<any>;
}

export class SteadfastAdapter implements CourierInterface {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://steadfast.com.bd/api/v1';

  constructor(config: any) {
    this.apiKey = (config.apiKey || '').trim();
    this.secretKey = (config.secretKey || '').trim();
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
    
    if (Number(response.data.status) === 200 && response.data.consignment) {
      return {
        ...response.data.consignment,
        success: true,
        tracking_id: response.data.consignment.tracking_code,
        original_response: response.data
      };
    }
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

  async checkFraud(phone: string): Promise<any> {
    try {
      // Sanitize phone number - ensure it's just digits and handle leading zero
      const sanitizedPhone = phone.replace(/\D/g, '');
      
      const response = await axios.get(`${this.baseUrl}/check_client/${sanitizedPhone}`, {
        headers: {
          'api-key': this.apiKey,
          'secret-key': this.secretKey
        }
      });
      
      const data = response.data;
      console.log(`Steadfast check_client response for ${sanitizedPhone}:`, data);

      if (Number(data.status) === 200) {
        return {
          ...data,
          total_delivered: data.total_delivery !== undefined ? data.total_delivery : (data.total_delivered !== undefined ? data.total_delivered : 0),
          total_cancelled: data.total_return !== undefined ? data.total_return : (data.total_returned !== undefined ? data.total_returned : 0),
          success_rate: data.delivery_success_rate || data.success_rate || '0%'
        };
      }
      
      return { total_delivered: 0, total_cancelled: 0, success_rate: '0%', message: data.message || 'Error fetching data' };
    } catch (error: any) {
      console.error('Steadfast checkFraud error:', error.response?.data || error.message);
      if (error.response && error.response.status === 404) {
        return { total_delivered: 0, total_cancelled: 0, success_rate: '0%', message: 'No history found' };
      }
      return { total_delivered: 0, total_cancelled: 0, success_rate: '0%', error: error.message };
    }
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
  private storeId?: string;
  private baseUrl = 'https://api-hermes.pathao.com'; // Production URL
  private static accessToken: string | null = null;
  private static tokenExpiry: number | null = null;

  constructor(config: any) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
    this.storeId = config.storeId;
    if (config.isSandbox) {
      this.baseUrl = 'https://courier-api-sandbox.pathao.com';
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (PathaoAdapter.accessToken && PathaoAdapter.tokenExpiry && now < PathaoAdapter.tokenExpiry - 60) {
      return PathaoAdapter.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'password',
        username: this.username,
        password: this.password
      });

      if (response.data.access_token) {
        PathaoAdapter.accessToken = response.data.access_token;
        PathaoAdapter.tokenExpiry = now + response.data.expires_in;
        return PathaoAdapter.accessToken!;
      }
      throw new Error('Failed to obtain Pathao access token');
    } catch (error: any) {
      console.error('Pathao Auth Error:', error.response?.data || error.message);
      throw new Error(`Pathao Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    const token = await this.getAccessToken();
    try {
      const response = await axios.post(`${this.baseUrl}/aladdin/api/v1/orders`, {
        store_id: parseInt(this.storeId || '0'),
        merchant_order_id: data.invoice,
        recipient_name: data.customer_name,
        recipient_phone: data.customer_phone,
        recipient_address: data.customer_address,
        recipient_city: parseInt((data as any).recipient_city || '0'),
        recipient_zone: parseInt((data as any).recipient_zone || '0'),
        recipient_area: parseInt((data as any).recipient_area || '0'),
        delivery_type: 48, // Normal Delivery
        item_type: 2, // Parcel
        special_instruction: data.note || '',
        item_quantity: 1,
        item_weight: data.weight || 0.5,
        amount_to_collect: data.cod_amount
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Pathao Order Error:', error.response?.data || error.message);
      throw new Error(`Pathao Order Creation failed: ${error.response?.data?.message || JSON.stringify(error.response?.data) || error.message}`);
    }
  }

  async trackOrder(trackingId: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await axios.get(`${this.baseUrl}/aladdin/api/v1/orders/${trackingId}/info`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<any> {
    // Pathao documentation for cancel not in screenshots, but usually it's a POST to /info with status change or separate endpoint
    throw new Error('Cancel order not implemented for Pathao');
  }

  async getCities(): Promise<any> {
    const token = await this.getAccessToken();
    const response = await axios.get(`${this.baseUrl}/aladdin/api/v1/city-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  }

  async getZones(cityId: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await axios.get(`${this.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  }

  async getAreas(zoneId: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await axios.get(`${this.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  }

  async getBalance(): Promise<any> {
    // Pathao doesn't have a direct balance API in the screenshots, 
    // but they have merchant info or stores info.
    return { balance: 0, status: 200, message: 'Balance check not supported via API' };
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
