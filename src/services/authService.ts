import type { ApiResponse, User } from '../types';
import apiService from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

class AuthService {
  // Login de usuario
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.get<ApiResponse<User>>('/auth/me');
  }

  // Logout
  async logout(): Promise<void> {
    await apiService.post('/auth/logout');
    localStorage.removeItem('authToken');
  }

  // Verificar token
  isTokenValid(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  // Guardar token
  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }
}

export const authService = new AuthService();
export default authService;

