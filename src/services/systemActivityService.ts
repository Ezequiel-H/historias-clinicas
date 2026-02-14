import type { Activity, ApiResponse } from '../types';
import apiService from './api';

class SystemActivityService {
  // Obtener todas las actividades del sistema
  async getSystemActivities(): Promise<ApiResponse<Activity[]>> {
    return apiService.get<ApiResponse<Activity[]>>('/system-activities');
  }
}

export const systemActivityService = new SystemActivityService();
export default systemActivityService;

