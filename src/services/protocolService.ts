import type { Protocol, ProtocolFormData, ApiResponse, PaginatedResponse } from '../types';
import apiService from './api';
import axios from 'axios';

class ProtocolService {
  // Obtener todos los protocolos (paginado)
  async getProtocols(page = 1, pageSize = 10, status?: string): Promise<PaginatedResponse<Protocol>> {
    return apiService.get<PaginatedResponse<Protocol>>('/protocols', { page, pageSize, status });
  }

  // Obtener un protocolo por ID
  async getProtocolById(id: string): Promise<ApiResponse<Protocol>> {
    return apiService.get<ApiResponse<Protocol>>(`/protocols/${id}`);
  }

  // Crear nuevo protocolo
  async createProtocol(data: ProtocolFormData): Promise<ApiResponse<Protocol>> {
    return apiService.post<ApiResponse<Protocol>>('/protocols', data);
  }

  // Actualizar protocolo existente
  async updateProtocol(id: string, data: Partial<ProtocolFormData>): Promise<ApiResponse<Protocol>> {
    return apiService.put<ApiResponse<Protocol>>(`/protocols/${id}`, data);
  }

  // Eliminar protocolo
  async deleteProtocol(id: string): Promise<ApiResponse<null>> {
    return apiService.delete<ApiResponse<null>>(`/protocols/${id}`);
  }

  // Extraer datos de documento de protocolo (usando sistema automatizado)
  async extractProtocolData(_file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<Partial<Protocol>>> {
    // TODO: Conectar con la API real que usa el sistema para extraer datos
    // return apiService.uploadFile<ApiResponse<Partial<Protocol>>>('/protocols/extract', file, onProgress);

    // Mock temporal
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (onProgress) onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            success: true,
            data: {
              name: 'Protocolo extraído del documento',
              code: 'EXT-' + Date.now(),
              sponsor: 'Sponsor extraído',
              description: 'Descripción extraída automáticamente del documento mediante el sistema',
              status: 'draft',
            },
            message: 'Datos extraídos exitosamente. Por favor revise y ajuste si es necesario.',
          });
        }
      }, 200);
    });
  }

  // ==========================================
  // MÉTODOS PARA VISITAS
  // ==========================================

  // Agregar visita a protocolo
  async addVisit(protocolId: string, visitData: any): Promise<ApiResponse<Protocol>> {
    return apiService.post<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits`, visitData);
  }

  // Actualizar visita
  async updateVisit(protocolId: string, visitId: string, visitData: any): Promise<ApiResponse<Protocol>> {
    return apiService.put<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}`, visitData);
  }

  // Eliminar visita
  async deleteVisit(protocolId: string, visitId: string): Promise<ApiResponse<Protocol>> {
    return apiService.delete<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}`);
  }

  // Actualizar orden de visitas (múltiples)
  async updateVisitsOrder(protocolId: string, visitsOrder: Array<{ visitId: string; order: number }>): Promise<ApiResponse<Protocol>> {
    return apiService.put<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/order`, {
      visitsOrder,
    });
  }

  // Previsualizar texto de historia clínica con IA (sin generar PDF)
  async previewClinicalHistory(protocolId: string, visitId: string, visitData: any): Promise<string> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');

    const response = await axios.post(
      `${API_BASE_URL}/protocols/${protocolId}/visits/${visitId}/preview-clinical-history`,
      { visitData },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    return response.data.data.clinicalHistoryText;
  }

  // Generar historia clínica con IA
  async generateClinicalHistory(
    protocolId: string,
    visitId: string,
    visitData: any,
    clinicalHistoryText?: string
  ): Promise<Blob> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');

    const response = await axios.post(
      `${API_BASE_URL}/protocols/${protocolId}/visits/${visitId}/generate-clinical-history`,
      { visitData, clinicalHistoryText },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    return response.data;
  }

  // ==========================================
  // MÉTODOS PARA ACTIVIDADES
  // ==========================================

  // Agregar actividad a visita
  async addActivity(protocolId: string, visitId: string, activityData: any): Promise<ApiResponse<Protocol>> {
    return apiService.post<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}/activities`, activityData);
  }

  // Actualizar actividad
  async updateActivity(protocolId: string, visitId: string, activityId: string, activityData: any): Promise<ApiResponse<Protocol>> {
    return apiService.put<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}/activities/${activityId}`, activityData);
  }

  // Eliminar actividad
  async deleteActivity(protocolId: string, visitId: string, activityId: string): Promise<ApiResponse<Protocol>> {
    return apiService.delete<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}/activities/${activityId}`);
  }

  // ==========================================
  // MÉTODOS PARA REGLAS CLÍNICAS
  // ==========================================

  // Agregar regla clínica
  async addClinicalRule(protocolId: string, ruleData: any): Promise<ApiResponse<Protocol>> {
    return apiService.post<ApiResponse<Protocol>>(`/protocols/${protocolId}/clinical-rules`, ruleData);
  }

  // Actualizar regla clínica
  async updateClinicalRule(protocolId: string, ruleId: string, ruleData: any): Promise<ApiResponse<Protocol>> {
    return apiService.put<ApiResponse<Protocol>>(`/protocols/${protocolId}/clinical-rules/${ruleId}`, ruleData);
  }

  // Eliminar regla clínica
  async deleteClinicalRule(protocolId: string, ruleId: string): Promise<ApiResponse<Protocol>> {
    return apiService.delete<ApiResponse<Protocol>>(`/protocols/${protocolId}/clinical-rules/${ruleId}`);
  }

  // ==========================================
  // MÉTODOS PARA IMPORTAR PLANTILLAS
  // ==========================================

  // Importar plantilla en una visita
  async importTemplate(protocolId: string, visitId: string, templateId: string): Promise<ApiResponse<Protocol>> {
    return apiService.post<ApiResponse<Protocol>>(`/protocols/${protocolId}/visits/${visitId}/import-template`, {
      templateId,
    });
  }

  // ==========================================
  // MÉTODOS PARA GENERAR PROTOCOLO DESDE SISTEMÁTICA
  // ==========================================

  // Generar protocolo desde archivo sistemática
  async generateProtocolFromSystematic(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Protocol>> {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('authToken');

    const formData = new FormData();
    formData.append('systematic', file);

    return axios.post<ApiResponse<Protocol>>(
      `${API_BASE_URL}/protocols/generate-from-systematic`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    ).then(response => response.data);
  }
}

export const protocolService = new ProtocolService();
export default protocolService;

