// Configuração e funções para comunicação com o backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Para enviar cookies (JWT)
      });

      const data = await response.json();

      if (!response.ok) {
        return { ok: false, error: data.error || 'Erro desconhecido' };
      }

      return { ok: true, data };
    } catch (error) {
      console.error('API Error:', error);
      return { ok: false, error: 'Erro de conexão com o servidor' };
    }
  }

  // AUTH
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // STUDENTS
  async getStudents(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('q', params.search);
    
    return this.request(`/api/students?${query.toString()}`);
  }

  async getStudent(id: number) {
    return this.request(`/api/students/${id}`);
  }

  async createStudent(data: any) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: number, data: any) {
    return this.request(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: number) {
    return this.request(`/api/students/${id}`, { method: 'DELETE' });
  }

  // SALES
  async getSales(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('q', params.search);
    
    return this.request(`/api/sales?${query.toString()}`);
  }

  async getSale(id: number) {
    return this.request(`/api/sales/${id}`);
  }

  async createSale(data: any) {
    return this.request('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSale(id: number, data: any) {
    return this.request(`/api/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSale(id: number) {
    return this.request(`/api/sales/${id}`, { method: 'DELETE' });
  }

  // CERTIFIERS
  async getCertifiers() {
    return this.request('/api/certifiers');
  }

  async createCertifier(data: any) {
    return this.request('/api/certifiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCertifier(id: number, data: any) {
    return this.request(`/api/certifiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCertifier(id: number) {
    return this.request(`/api/certifiers/${id}`, { method: 'DELETE' });
  }

  // PAYMENT METHODS
  async getPaymentMethods() {
    return this.request('/api/payment-methods');
  }

  async createPaymentMethod(data: any) {
    return this.request('/api/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaymentMethod(id: number, data: any) {
    return this.request(`/api/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaymentMethod(id: number) {
    return this.request(`/api/payment-methods/${id}`, { method: 'DELETE' });
  }

  // PAYMENTS
  async getPaymentsBySale(saleId: number) {
    return this.request(`/api/payments/sale/${saleId}`);
  }

  async createPayment(data: any) {
    return this.request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: number) {
    return this.request(`/api/payments/${id}`, { method: 'DELETE' });
  }

  // CERTIFICATION
  async getCertificationProcess(studentId: number) {
    return this.request(`/api/certification/student/${studentId}`);
  }

  async createCertificationProcess(data: any) {
    return this.request('/api/certification', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCertificationStatus(studentId: number, data: any) {
    return this.request(`/api/certification/${studentId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DASHBOARD
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }
}

export const api = new ApiClient(API_BASE_URL);
