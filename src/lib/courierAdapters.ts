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
  getDeliveryCharge?(trackingId: string, orderData?: any): Promise<number | null>;
}

export class SteadfastAdapter implements CourierInterface {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://portal.packzy.com/api/v1';

  constructor(config: any) {
    this.apiKey = (config.apiKey || '').trim();
    this.secretKey = (config.secretKey || '').trim();
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    try {
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
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' ? errorData : (errorData?.message || error.message);
      console.error('Steadfast createOrder error:', { message: errorMessage, url: error.config?.url, data: errorData });
      throw new Error(`Steadfast Order Creation failed: ${errorMessage} (URL: ${error.config?.url})`);
    }
  }

  async trackOrder(trackingId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/status_by_trackingcode/${trackingId}`, {
        headers: {
          'api-key': this.apiKey,
          'secret-key': this.secretKey
        }
      });
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' ? errorData : (errorData?.message || error.message);
      console.error('Steadfast trackOrder error:', errorData || error.message);
      throw new Error(`Steadfast Tracking failed: ${errorMessage}`);
    }
  }
  
  async getBalance(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/get_balance`, {
        headers: {
          'api-key': this.apiKey,
          'secret-key': this.secretKey
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Steadfast getBalance error:', error.response?.data || error.message);
      throw new Error(`Steadfast Balance check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkFraud(phone: string): Promise<any> {
    // Try multiple functional Steadfast API domains
    const urls = [
      'https://portal.packzy.com/api/v1',
      'https://steadfast.com.bd/api/v1',
      'https://www.packzy.com/api/v1'
    ];

    // Standardize phone number to 11 digits starting with 0
    let sanitizedPhone = phone.replace(/\D/g, '');
    if (sanitizedPhone.startsWith('880')) {
      sanitizedPhone = sanitizedPhone.substring(2);
    } else if (sanitizedPhone.length === 10 && !sanitizedPhone.startsWith('0')) {
      sanitizedPhone = '0' + sanitizedPhone;
    }

    let lastError = null;

    for (const url of urls) {
      try {
        const response = await axios.get(`${url}/check_client/${sanitizedPhone}`, {
          headers: {
            'api-key': this.apiKey,
            'secret-key': this.secretKey,
            'Api-Key': this.apiKey,
            'Secret-Key': this.secretKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        const resData = response.data;
        // Some versions return 200 but with status: 404 in body for "Not Found"
        const status = Number(resData.status || response.status);
        
        if (status === 200 || resData.status === 'success') {
          // Extract data from user, data, or root
          const data = resData.user || resData.data || resData;
          
          const delivered = data.total_delivery ?? data.total_delivered ?? data.delivered ?? data.delivered_parcel ?? 0;
          const cancelled = data.total_return ?? data.total_returned ?? data.returned ?? data.returned_parcel ?? data.cancelled_parcel ?? data.cancelled ?? 0;
          const rate = data.delivery_success_rate ?? data.success_rate ?? data.success_ratio ?? 0;
          const numericRate = typeof rate === 'number' ? rate : (parseFloat(String(rate).replace('%', '')) || 0);

          return {
            ...data,
            total_delivered: Number(delivered),
            total_cancelled: Number(cancelled),
            success_rate: typeof rate === 'number' ? `${rate.toFixed(1)}%` : (String(rate).includes('%') ? rate : `${rate}%`),
            success_rate_numeric: numericRate
          };
        }
        
        if (status === 404 || resData.message?.toLowerCase().includes('not found')) {
          continue; // Try next URL
        }
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        if (status === 404) continue;
        console.error(`Steadfast checkFraud error at ${url}:`, error.message);
      }
    }

    // If all failed or 404'd
    if (lastError?.response?.status === 404 || lastError?.message?.includes('404')) {
      return { total_delivered: 0, total_cancelled: 0, success_rate: '0%', message: 'No history found' };
    }

    return { total_delivered: 0, total_cancelled: 0, success_rate: '0%', error: lastError?.message || 'Failed to fetch history' };
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
    this.clientId = (config.clientId || '').trim();
    this.clientSecret = (config.clientSecret || '').trim();
    this.username = (config.username || '').trim();
    this.password = (config.password || '').trim();
    this.storeId = (config.storeId || '').trim();
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
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.access_token) {
        PathaoAdapter.accessToken = response.data.access_token;
        PathaoAdapter.tokenExpiry = now + response.data.expires_in;
        return PathaoAdapter.accessToken!;
      }
      throw new Error('Failed to obtain Pathao access token: No token in response');
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorCode = error.code || 'UNKNOWN_CODE';
      const status = error.response?.status;
      let errorMessage = typeof errorData === 'string' ? errorData : (errorData?.message || errorData?.error || error.message);
      
      if (status === 404) {
        errorMessage = "Pathao Auth Endpoint not found (404). Please check if Sandbox mode is correctly set.";
      }

      console.error('Pathao Auth Error:', { message: errorMessage, code: errorCode, status, data: errorData });
      throw new Error(`Pathao Authentication failed: ${errorMessage}. Please check your Client ID, Secret, Username, and Password in settings.`);
    }
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    const token = await this.getAccessToken();
    
    const cityId = parseInt(String((data as any).recipient_city || '0'));
    const zoneId = parseInt(String((data as any).recipient_zone || '0'));
    const areaId = parseInt(String((data as any).recipient_area || '0'));

    if (cityId === 0 || zoneId === 0 || areaId === 0) {
      throw new Error('Pathao City, Zone, and Area are required. Please select them in the order form by editing the order.');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/aladdin/api/v1/orders`, {
        store_id: parseInt(this.storeId || '0'),
        merchant_order_id: data.invoice,
        recipient_name: data.customer_name,
        recipient_phone: data.customer_phone,
        recipient_address: data.customer_address,
        recipient_city: cityId,
        recipient_zone: zoneId,
        recipient_area: areaId,
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
      const errorData = error.response?.data;
      let errorMessage = typeof errorData === 'string' ? errorData : (errorData?.message || errorData?.error || error.message);
      
      // Pathao often returns detailed validation errors in an 'errors' object
      if (errorData?.errors && typeof errorData.errors === 'object') {
        const detailedErrors = Object.entries(errorData.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        if (detailedErrors) {
          errorMessage = `${errorMessage} (${detailedErrors})`;
        }
      }
      
      console.error('Pathao Order Error:', errorMessage);
      throw new Error(`Pathao Order Creation failed: ${errorMessage}`);
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
  private clientId: string;
  private clientSecret: string;
  private clientContext: string;
  private baseUrl = 'https://developers.carrybee.com';

  constructor(config: any) {
    this.clientId = (config.clientId || '').trim();
    this.clientSecret = (config.clientSecret || '').trim();
    this.clientContext = (config.clientContext || '').trim();
    if (config.isSandbox) {
      this.baseUrl = 'https://sandbox.carrybee.com';
    }
  }

  private getHeaders() {
    return {
      'Client-ID': this.clientId,
      'Client-Secret': this.clientSecret,
      'Client-Context': this.clientContext,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createOrder(data: CourierOrderData): Promise<any> {
    try {
      // Fetch stores to get a default store_id if not provided
      const storesResponse = await this.getStores();
      const storeId = storesResponse.data?.stores?.[0]?.id;

      if (!storeId) {
        throw new Error('No store found for Carrybee. Please create a store in Carrybee panel first.');
      }

      const response = await axios.post(`${this.baseUrl}/api/v2/orders`, {
        store_id: storeId,
        merchant_order_id: data.invoice,
        delivery_type: 1, // Normal
        product_type: 1, // Parcel
        recipient_name: data.customer_name,
        recipient_phone: data.customer_phone,
        recipient_address: data.customer_address,
        city_id: parseInt(String((data as any).recipient_city || '0')),
        zone_id: parseInt(String((data as any).recipient_zone || '0')),
        area_id: parseInt(String((data as any).recipient_area || '0')),
        item_weight: (data.weight || 0.5) * 1000, // Convert to grams
        item_quantity: 1,
        collectable_amount: data.cod_amount,
        is_closed: false
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee Order Error:', error.response?.data || error.message);
      throw new Error(`Carrybee Order Creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async trackOrder(trackingId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/orders/${trackingId}/details`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee trackOrder error:', error.response?.data || error.message);
      throw new Error(`Carrybee Tracking failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v2/orders/${orderId}/cancel`, {
        cancellation_reason: 'Cancelled by merchant'
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee cancelOrder error:', error.response?.data || error.message);
      throw new Error(`Carrybee Cancel failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getCities(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/cities`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee getCities error:', error.response?.data || error.message);
      return { error: true, data: { cities: [] } };
    }
  }

  async getZones(cityId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/cities/${cityId}/zones`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee getZones error:', error.response?.data || error.message);
      return { error: true, data: { zones: [] } };
    }
  }

  async getAreas(zoneId: string, cityId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/cities/${cityId}/zones/${zoneId}/areas`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee getAreas error:', error.response?.data || error.message);
      return { error: true, data: { areas: [] } };
    }
  }

  async getStores(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/stores`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error: any) {
      console.error('Carrybee getStores error:', error.response?.data || error.message);
      return { error: true, data: { stores: [] } };
    }
  }

  async getBalance(): Promise<any> {
    return { balance: 0, status: 200, message: 'Balance check not supported via API' };
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
