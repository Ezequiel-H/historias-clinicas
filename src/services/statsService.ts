import type { ApiResponse } from '../types';
import apiService from './api';

export interface DashboardStats {
  protocols: {
    active: number;
  };
  users: {
    active: number;
    medicos: number;
    investigadores: number;
  };
  topSponsors: Array<{
    sponsor: string;
    count: number;
  }>;
}

class StatsService {
  // Obtener estadísticas del dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiService.get<ApiResponse<DashboardStats>>('/stats/dashboard');
  }
}

export const statsService = new StatsService();
export default statsService;

