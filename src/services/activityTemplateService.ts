import type { ActivityTemplate, ApiResponse } from '../types';
import apiService from './api';

interface ActivityTemplateFormData {
  name: string;
  description?: string;
  activities: Omit<ActivityTemplate['activities'][0], 'id' | 'visitId'>[];
}

class ActivityTemplateService {
  // Obtener todas las plantillas de actividades
  async getTemplates(): Promise<ApiResponse<ActivityTemplate[]>> {
    return apiService.get<ApiResponse<ActivityTemplate[]>>('/activity-templates');
  }

  // Obtener una plantilla por ID
  async getTemplateById(id: string): Promise<ApiResponse<ActivityTemplate>> {
    return apiService.get<ApiResponse<ActivityTemplate>>(`/activity-templates/${id}`);
  }

  // Crear nueva plantilla
  async createTemplate(data: Omit<ActivityTemplateFormData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ActivityTemplate>> {
    return apiService.post<ApiResponse<ActivityTemplate>>('/activity-templates', data);
  }

  // Actualizar plantilla existente
  async updateTemplate(id: string, data: Partial<ActivityTemplateFormData>): Promise<ApiResponse<ActivityTemplate>> {
    return apiService.put<ApiResponse<ActivityTemplate>>(`/activity-templates/${id}`, data);
  }

  // Eliminar plantilla
  async deleteTemplate(id: string): Promise<ApiResponse<null>> {
    return apiService.delete<ApiResponse<null>>(`/activity-templates/${id}`);
  }
}

export const activityTemplateService = new ActivityTemplateService();
export default activityTemplateService;


