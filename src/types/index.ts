// Tipos para Protocolos
export interface Protocol {
  id: string;
  name: string;
  code: string;
  sponsor: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  visits: Visit[];
  clinicalRules: ClinicalRule[];
}

export interface Visit {
  id: string;
  protocolId: string;
  name: string;
  type: 'presencial' | 'telefonica' | 'no_programada';
  order: number;
  activities: Activity[];
}

// Tipos de campos disponibles
export type FieldType = 
  | 'text_short'           // Texto corto
  | 'text_long'            // Texto largo (textarea)
  | 'number_simple'        // Número simple
  | 'number_compound'      // Número compuesto (ej: sistólica/diastólica)
  | 'select_single'        // Selección (radio/checkbox según selectMultiple)
  | 'boolean'              // Sí/No
  | 'datetime'             // Fecha y/o hora (configurable)
  | 'file'                 // Archivo adjunto
  | 'conditional'         // Campo condicional
  | 'calculated';         // Campo calculado (se calcula automáticamente basado en otros campos)

// Configuración de un campo compuesto
export interface CompoundFieldConfig {
  fields: {
    name: string;
    label: string;
    unit?: string;
  }[];
}

// Configuración de opciones para select
export interface SelectOption {
  value: string;
  label: string;
  required?: boolean;      // Si es true, esta opción debe ser seleccionada obligatoriamente
  exclusive?: boolean;     // Si es true, si se selecciona esta opción, el paciente NO califica
}

// Configuración de campo condicional
export interface ConditionalConfig {
  dependsOn: string;        // ID del campo del que depende
  showWhen: string | boolean; // Valor que debe tener para mostrarse
}

export interface Activity {
  id: string;
  visitId: string;
  name: string;
  description?: string;
  fieldType: FieldType;
  required: boolean;
  order: number;
  
  // Configuraciones específicas por tipo de campo
  measurementUnit?: string;
  expectedMin?: number;
  expectedMax?: number;
  decimalPlaces?: number;             // Cantidad de decimales para campos numéricos
  options?: SelectOption[];           // Para select_single
  selectMultiple?: boolean;           // Para select_single: si true, permite selección múltiple (checkbox), si false, selección única (radio)
  allowCustomOptions?: boolean;      // Para select_single con selectMultiple: permite agregar opciones personalizadas
  compoundConfig?: CompoundFieldConfig; // Para number_compound
  conditionalConfig?: ConditionalConfig; // Para conditional
  allowMultiple?: boolean;            // Para campos repetibles (múltiples mediciones)
  repeatCount?: number;               // Número de veces que se debe repetir (default: 3)
  // Configuración para tipo datetime
  datetimeIncludeDate?: boolean;       // Si true, incluye selector de fecha (solo si fieldType === 'datetime')
  datetimeIncludeTime?: boolean;       // Si true, incluye selector de hora (solo si fieldType === 'datetime')
  requireDate?: boolean;              // Solicitar fecha en que se realizó la actividad
  requireTime?: boolean;             // Solicitar hora en que se realizó la actividad
  requireDatePerMeasurement?: boolean; // Si true, fecha por cada medición; si false, una fecha para todas (solo si allowMultiple)
  requireTimePerMeasurement?: boolean; // Si true, hora por cada medición; si false, una hora para todas (solo si allowMultiple)
  timeIntervalMinutes?: number;        // Intervalo fijo en minutos entre mediciones (solo si allowMultiple y requireTime). Si está configurado, solo se pregunta la hora de la primera medición
  
  // Ayuda/instrucciones para el médico
  helpText?: string;
  
  // Reglas de validación
  validationRules?: ActivityRule[];
  
  // Campo calculado (solo si fieldType === 'calculated')
  calculationFormula?: string; // Ej: "peso / altura" - fórmula para calcular el valor automáticamente
}

// Regla de validación para actividades
export interface ActivityRule {
  id?: string;
  name: string;
  condition: 'range' | 'min' | 'max' | 'equals' | 'not_equals' | 'formula';
  minValue?: number;
  maxValue?: number;
  value?: string | number;
  formula?: string; // Ej: "peso * 10 + altura"
  formulaOperator?: '>' | '<' | '>=' | '<=' | '==' | '!='; // Operador de comparación para fórmulas
  severity: 'warning' | 'error'; // warning = alerta, error = bloqueo
  message: string;
  isActive: boolean;
}

// Regla Clínica a nivel protocolo (legacy)
export interface ClinicalRule {
  id: string;
  protocolId: string;
  name: string;
  parameter: string;
  condition: 'range' | 'min' | 'max' | 'equals' | 'not_equals';
  minValue?: number;
  maxValue?: number;
  value?: string | number;
  errorMessage: string;
  isActive: boolean;
}

// Tipos para Autenticación
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'medico' | 'investigador_principal';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Tipos para formularios
export interface ProtocolFormData {
  name: string;
  code: string;
  sponsor: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
}

export interface VisitFormData {
  name: string;
  type: 'presencial' | 'telefonica' | 'no_programada';
  order: number;
}

export interface ActivityFormData {
  name: string;
  description: string;
  measurementUnit?: string;
  expectedMin?: number;
  expectedMax?: number;
  required: boolean;
  order: number;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

