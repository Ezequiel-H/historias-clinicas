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

export type SignupCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  sealSignaturePhoto: string;
};

class AuthService {
  // Login de usuario
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
  }

  // Registro de doctor
  async signup(credentials: SignupCredentials): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<ApiResponse<LoginResponse>>('/auth/signup', credentials);
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

  // Obtener todos los usuarios (solo admins)
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    return apiService.get<ApiResponse<User[]>>('/auth/users');
  }

  // Actualizar estado isActive de un usuario (solo admins)
  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<User>> {
    return apiService.patch<ApiResponse<User>>(`/auth/users/${userId}`, { isActive });
  }
}

export const authService = new AuthService();
export default authService;

