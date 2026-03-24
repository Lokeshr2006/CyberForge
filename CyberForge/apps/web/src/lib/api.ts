import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use((config) => {
      const token = Cookies.get('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle 401 and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = Cookies.get('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data;
              Cookies.set('accessToken', accessToken);
              Cookies.set('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async logout() {
    const refreshToken = Cookies.get('refreshToken');
    await this.axiosInstance.post('/api/v1/auth/logout', { refreshToken });
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  async getCurrentUser() {
    const response = await this.axiosInstance.get('/api/v1/auth/me');
    return response.data;
  }

  // Sites
  async getSites() {
    const response = await this.axiosInstance.get('/api/v1/sites');
    return response.data;
  }

  async getSite(id: string) {
    const response = await this.axiosInstance.get(`/api/v1/sites/${id}`);
    return response.data;
  }

  // Assets
  async getAssets(siteId?: string) {
    const params = siteId ? { siteId } : {};
    const response = await this.axiosInstance.get('/api/v1/assets', { params });
    return response.data;
  }

  async getAsset(id: string) {
    const response = await this.axiosInstance.get(`/api/v1/assets/${id}`);
    return response.data;
  }

  // Sensors
  async getSensors(assetId?: string) {
    const params = assetId ? { assetId } : {};
    const response = await this.axiosInstance.get('/api/v1/sensors', { params });
    return response.data;
  }

  async getSensor(id: string) {
    const response = await this.axiosInstance.get(`/api/v1/sensors/${id}`);
    return response.data;
  }

  // Readings
  async getReadings(sensorId: string, from?: Date, to?: Date, limit?: number) {
    const params: any = { sensorId };
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();
    if (limit) params.limit = limit;

    const response = await this.axiosInstance.get('/api/v1/readings', { params });
    return response.data;
  }

  async getLatestReading(sensorId: string) {
    const response = await this.axiosInstance.get(`/api/v1/readings/${sensorId}/latest`);
    return response.data;
  }

  async getSensorStats(sensorId: string, from?: Date, to?: Date) {
    const params: any = {};
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();

    const response = await this.axiosInstance.get(`/api/v1/readings/${sensorId}/stats`, {
      params,
    });
    return response.data;
  }

  // Alerts
  async getAlertEvents(status?: string, severity?: string, limit?: number) {
    const params: any = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;
    if (limit) params.limit = limit;

    const response = await this.axiosInstance.get('/api/v1/alert-events', { params });
    return response.data;
  }

  async acknowledgeAlert(alertId: string) {
    const response = await this.axiosInstance.patch(`/api/v1/alert-events/${alertId}/acknowledge`);
    return response.data;
  }

  async resolveAlert(alertId: string) {
    const response = await this.axiosInstance.patch(`/api/v1/alert-events/${alertId}/resolve`);
    return response.data;
  }

  async getAlertStats(from?: Date, to?: Date) {
    const params: any = {};
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();

    const response = await this.axiosInstance.get('/api/v1/alert-stats', { params });
    return response.data;
  }

  // Users (admin)
  async getUsers() {
    const response = await this.axiosInstance.get('/api/v1/users');
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.axiosInstance.get(`/api/v1/users/${id}`);
    return response.data;
  }

  async changeUserRole(userId: string, role: string) {
    const response = await this.axiosInstance.patch(`/api/v1/users/${userId}/role`, {
      role,
    });
    return response.data;
  }

  // Audit logs
  async getAuditLogs(
    eventType?: string,
    severity?: string,
    from?: Date,
    to?: Date,
    limit?: number,
  ) {
    const params: any = {};
    if (eventType) params.eventType = eventType;
    if (severity) params.severity = severity;
    if (from) params.from = from.toISOString();
    if (to) params.to = to.toISOString();
    if (limit) params.limit = limit;

    const response = await this.axiosInstance.get('/api/v1/audit-logs', { params });
    return response.data;
  }
}

export const apiClient = new ApiClient();
