/**
 * Steadfast Courier API Service
 * 
 * This service handles communication with the Steadfast Courier API.
 * Documentation: https://steadfast.com.bd/api/v1/docs
 */

export interface SteadfastOrder {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

export interface SteadfastResponse {
  status: number;
  message: string;
  consignment?: {
    consignment_id: number;
    tracking_code: string;
    invoice: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string;
    note: string;
    created_at: string;
    updated_at: string;
  };
}

export class SteadfastService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://steadfast.com.bd/api/v1';

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = (apiKey || '').trim();
    this.secretKey = (secretKey || '').trim();
  }

  private async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('Steadfast API Key or Secret Key is missing. Please configure them in Settings > Logistics.');
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const headers: Record<string, string> = {
      'api-key': this.apiKey,
      'secret-key': this.secretKey,
      'Accept': 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Steadfast API Non-JSON Response:', {
          status: response.status,
          statusText: response.statusText,
          body: text.substring(0, 500)
        });
        
        if (response.status === 500) {
          throw new Error('Steadfast Server Error (500). This usually means the API keys are invalid or the account is not authorized for API access.');
        }
        throw new Error(`Steadfast API Error: ${response.status} ${response.statusText}`);
      }

      // Steadfast API returns status 200 in the JSON body for success.
      // Sometimes it might return a string status or a number.
      const status = Number(data.status);
      
      if (status !== 200) {
        console.error('Steadfast API Business Error:', data);
        throw new Error(data.message || `Steadfast API Error (Status ${status})`);
      }

      return data;
    } catch (error: any) {
      console.error('Steadfast API Request Exception:', error);
      throw error;
    }
  }

  /**
   * Create a new delivery order in Steadfast
   */
  async createOrder(order: SteadfastOrder): Promise<SteadfastResponse> {
    return this.request('/create_order', 'POST', order);
  }

  /**
   * Check status of a consignment by tracking code
   */
  async getStatusByTracking(trackingCode: string): Promise<any> {
    return this.request(`/status_by_tracking/${trackingCode}`);
  }

  /**
   * Check status of a consignment by invoice ID
   */
  async getStatusByInvoice(invoiceId: string): Promise<any> {
    return this.request(`/status_by_invoice/${invoiceId}`);
  }

  /**
   * Check customer delivery success rate by phone number
   */
  async checkClient(phone: string): Promise<{
    status: number;
    message: string;
    delivery_success_rate: string;
    total_order: number;
    total_delivery: number;
    total_return: number;
  }> {
    return this.request(`/check_client/${phone}`);
  }

  /**
   * Get current balance of the Steadfast account
   */
  async getBalance(): Promise<{ status: number, balance: number }> {
    return await this.request('/get_balance', 'GET');
  }

  /**
   * Generate a public tracking URL for a consignment
   */
  getTrackingUrl(trackingCode: string): string {
    return `https://steadfast.com.bd/t/${trackingCode}`;
  }
}
