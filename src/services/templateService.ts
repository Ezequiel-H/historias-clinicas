import type { Template, TemplateFormData, ApiResponse, PaginatedResponse } from '../types';
import apiService from './api';

class TemplateService {
  // Obtener todas las plantillas (paginado)
  async getTemplates(page = 1, pageSize = 10): Promise<PaginatedResponse<Template>> {
    return apiService.get<PaginatedResponse<Template>>('/templates', { page, pageSize });
  }

  // Obtener una plantilla por ID
  async getTemplateById(id: string): Promise<ApiResponse<Template>> {
    return apiService.get<ApiResponse<Template>>(`/templates/${id}`);
  }

  // Crear nueva plantilla
  async createTemplate(data: TemplateFormData): Promise<ApiResponse<Template>> {
    return apiService.post<ApiResponse<Template>>('/templates', data);
  }

  // Actualizar plantilla existente
  async updateTemplate(id: string, data: Partial<TemplateFormData>): Promise<ApiResponse<Template>> {
    return apiService.put<ApiResponse<Template>>(`/templates/${id}`, data);
  }

  // Eliminar plantilla
  async deleteTemplate(id: string): Promise<ApiResponse<null>> {
    return apiService.delete<ApiResponse<null>>(`/templates/${id}`);
  }

  // ==========================================
  // MÉTODOS PARA ACTIVIDADES EN PLANTILLAS
  // ==========================================

  // Agregar actividad a plantilla
  async addActivity(templateId: string, activityData: any): Promise<ApiResponse<Template>> {
    return apiService.post<ApiResponse<Template>>(`/templates/${templateId}/activities`, activityData);
  }

  // Actualizar actividad
  async updateActivity(templateId: string, activityId: string, activityData: any): Promise<ApiResponse<Template>> {
    return apiService.put<ApiResponse<Template>>(`/templates/${templateId}/activities/${activityId}`, activityData);
  }

  // Eliminar actividad
  async deleteActivity(templateId: string, activityId: string): Promise<ApiResponse<Template>> {
    return apiService.delete<ApiResponse<Template>>(`/templates/${templateId}/activities/${activityId}`);
  }
}

export const templateService = new TemplateService();
export default templateService;

