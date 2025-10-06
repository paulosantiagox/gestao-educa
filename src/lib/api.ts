// Configuração e funções para comunicação com o backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gestao-educa.autoflixtreinamentos.com';

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<ApiResponse<T>> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`🌐 [API] Request (tentativa ${attempt + 1}/${retries + 1}):`, url);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          credentials: 'include',
          mode: 'cors',
        });

        console.log('🌐 [API] Response status:', response.status);

        // Verificar se a resposta é JSON válida
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ [API] Non-JSON response:', text);
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return { ok: false, error: 'Erro no servidor - resposta inválida' };
        }

        const data = await response.json();

        if (!response.ok) {
          console.error('❌ [API] Response not ok:', data.error);
          return { ok: false, error: data.error || 'Erro desconhecido' };
        }

        return { ok: true, data };
      } catch (error: any) {
        console.error(`❌ [API] Error (tentativa ${attempt + 1}):`, error);
        lastError = error;
        
        // Retry apenas em erros de rede/timeout
        if (attempt < retries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
    
    return { 
      ok: false, 
      error: lastError?.message || 'Erro de conexão com o servidor. Verifique sua internet.' 
    };
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

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async put<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // STUDENTS (retorna array direto)
  async getStudents(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('q', params.search);
    
    return this.request<any[]>(`/api/students?${query.toString()}`);
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

  async getStudentsWithSales(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('q', params.search);
    
    return this.request<any[]>(`/api/students/with-sales?${query.toString()}`);
  }

  // SALES (retorna array direto)
  async getSales(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('q', params.search);
    
    return this.request<any[]>(`/api/sales?${query.toString()}`);
  }

  async getSalesAll(params?: { search?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('q', params.search);
    
    const response = await this.request<any>(`/api/sales/all?${query.toString()}`);
    console.log('🔍 getSalesAll - Response completa:', response);
    console.log('🔍 getSalesAll - Dados recebidos:', response.data);
    console.log('🔍 getSalesAll - Quantidade de vendas:', Array.isArray(response.data) ? response.data.length : 'Não é array');
    
    return response;
  }

  async getNextSaleCode() {
    return this.request<{ nextCode: string }>('/api/sales/next-code');
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

  // CERTIFIERS (retorna array direto)
  async getCertifiers() {
    return this.request<any[]>('/api/certifiers');
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

  // PAYMENT METHODS (retorna array direto)
  async getPaymentMethods() {
    return this.request<any[]>('/api/payment-methods');
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

  async updateCertificationProcess(studentId: number, data: any) {
    return this.request(`/api/certification/${studentId}/update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateCertificationDates(studentId: number, data: any) {
    return this.request(`/api/certification/${studentId}/dates`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCertificationProcess(studentId: number) {
    return this.request(`/api/certification/${studentId}`, {
      method: 'DELETE',
    });
  }

  // CERTIFICATION SLA
  async getCertificationSLA() {
    return this.request<any[]>('/api/certification-sla');
  }

  async updateCertificationSLA(data: any[]) {
    return this.request('/api/certification-sla', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DASHBOARD
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  // Users
  async getUsers(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request("/api/users");
  }

  async createUser(data: { email: string; name: string; password: string; role?: string; avatar?: string }): Promise<ApiResponse<{ user: User }>> {
    return this.request("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: { email: string; name: string; role?: string; avatar?: string }): Promise<ApiResponse<{ user: User }>> {
    return this.request(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/users/${id}`, {
      method: "DELETE",
    });
  }

  // CONSULTORES REDIRECT
  async getConsultoresRedirect(): Promise<ApiResponse<any[]>> {
    return this.request("/api/consultores-redirect");
  }

  async createConsultorRedirect(data: any): Promise<ApiResponse<any>> {
    return this.request("/api/consultores-redirect", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateConsultorRedirect(id: number, data: any): Promise<ApiResponse<any>> {
    return this.request(`/api/consultores-redirect/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteConsultorRedirect(id: number): Promise<ApiResponse<any>> {
    return this.request(`/api/consultores-redirect/${id}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
