import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
} from '@mui/material';
import { Medication as MedicationIcon } from '@mui/icons-material';
import type { MedicationTrackingConfig } from '../../../types';
import { parseLocalDate, handleDateFieldClick, dateFieldStyles, preventNumberInputScroll } from './visitFormUtils';

interface MedicationErrorState {
  includeInHistory: boolean;
  comment: string;
}

interface DetectedProblem {
  id: string;
  message: string;
  severity: 'error' | 'warning';
}

interface MedicationTrackingFieldProps {
  activityId: string;
  config: MedicationTrackingConfig;
  value: any;
  onChange: (field: string, value: any) => void;
  showValidation: boolean;
  required: boolean;
  medicationErrors: Record<string, MedicationErrorState>;
  onMedicationErrorChange: (errorId: string, state: MedicationErrorState) => void;
  getVisitDate?: () => Date; // Función opcional para obtener la fecha de la visita
}

/**
 * Calcula la adherencia a medicación
 */
export const calculateMedicationAdherence = (
  lastVisitDate: string,
  unitsDelivered: string,
  unitsReturned: string,
  tookMedicationToday: boolean,
  config: MedicationTrackingConfig,
  visitDate?: Date
) => {
  if (!lastVisitDate || !unitsDelivered || unitsReturned === '' || !config.expectedDailyDose) {
    return null;
  }

  const currentVisitDate = visitDate || new Date();
  currentVisitDate.setHours(0, 0, 0, 0);
  const lastVisit = parseLocalDate(lastVisitDate);

  const totalDaysDifference = Math.floor((currentVisitDate.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = totalDaysDifference > 0 ? totalDaysDifference - 1 : 0; 

  // Calculate expected consumption days
  let expectedConsumptionDays = daysElapsed;
  if (config.shouldConsumeOnDeliveryDay) expectedConsumptionDays += 1;
  if (config.shouldTakeOnVisitDay) expectedConsumptionDays += 1;

  // Total expected dose
  const expectedTotalDose = expectedConsumptionDays * config.expectedDailyDose;

  // Actual consumption
  const delivered = parseFloat(unitsDelivered) || 0;
  const returned = parseFloat(unitsReturned) || 0;
  const realConsumption = delivered - returned;

  // Adjusted consumption
  let adjustedConsumption = realConsumption;
  
  // Si el paciente tomó la medicación cuando NO debía, restar esa dosis del consumo
  if (!config.shouldTakeOnVisitDay && tookMedicationToday) {
    adjustedConsumption -= config.expectedDailyDose;
  }

  // Adherence percentage - SIEMPRE usar adjustedConsumption
  if (expectedTotalDose <= 0) return null;
  const adherencePercentage = (adjustedConsumption / expectedTotalDose) * 100;

  return {
    daysElapsed,
    expectedConsumptionDays,
    expectedTotalDose,
    realConsumption,
    adjustedConsumption,
    adherencePercentage,
    delivered,
    returned,
  };
};

/**
 * Detecta problemas de adherencia
 */
export const detectAdherenceProblems = (
  config: MedicationTrackingConfig,
  tookMedicationToday: boolean,
  adherence: NonNullable<ReturnType<typeof calculateMedicationAdherence>>
): DetectedProblem[] => {
  const problems: DetectedProblem[] = [];

  // Error: Debería tomar hoy pero no tomó
  if (config.shouldTakeOnVisitDay === true && !tookMedicationToday) {
    problems.push({
      id: 'should_take_today_not_taken',
      message: 'El paciente debería haber tomado la medicación el día de hoy según el protocolo, pero no lo hizo.',
      severity: 'error',
    });
  }

  // Error: No debería tomar hoy pero tomó
  if (config.shouldTakeOnVisitDay === false && tookMedicationToday) {
    problems.push({
      id: 'should_not_take_today_taken',
      message: 'El paciente tomó la medicación hoy cuando no debía según el protocolo.',
      severity: 'error',
    });
  }

  // Warning: Adherencia baja (< 80%)
  if (adherence.adherencePercentage !== null && adherence.adherencePercentage < 80) {
    problems.push({
      id: 'low_adherence',
      message: `Adherencia al tratamiento baja (${adherence.adherencePercentage.toFixed(1)}%). El paciente consumió menos medicación de la esperada.`,
      severity: 'warning',
    });
  }

  // Warning: Adherencia menor a la esperada (80% - 100%)
  if (adherence.adherencePercentage !== null && 
      adherence.adherencePercentage >= 80 && 
      adherence.adherencePercentage < 100) {
    problems.push({
      id: 'adherence_below_expected',
      message: `Adherencia al tratamiento menor a la esperada (${adherence.adherencePercentage.toFixed(1)}%). El paciente consumió menos medicación de la esperada.`,
      severity: 'warning',
    });
  }

  // Warning: Adherencia > 100%
  if (adherence.adherencePercentage !== null && adherence.adherencePercentage > 100) {
    problems.push({
      id: 'high_adherence',
      message: `Adherencia al tratamiento mayor a 100% (${adherence.adherencePercentage.toFixed(1)}%). El paciente consumió más medicación de la esperada.`,
      severity: 'warning',
    });
  }

  // Error: Unidades devueltas exceden entregadas
  if (adherence.realConsumption < 0) {
    problems.push({
      id: 'returned_exceeds_delivered',
      message: `Las unidades devueltas (${adherence.returned}) exceden las unidades entregadas (${adherence.delivered}).`,
      severity: 'error',
    });
  }

  return problems;
};

export const MedicationTrackingField: React.FC<MedicationTrackingFieldProps> = ({
  config,
  value,
  onChange,
  showValidation,
  required,
  medicationErrors,
  onMedicationErrorChange,
  getVisitDate,
}) => {
  const medValue = typeof value === 'object' && value !== null ? value : {};
  const lastVisitDate = medValue.lastVisitDate || '';
  const unitsDelivered = medValue.unitsDelivered !== undefined && medValue.unitsDelivered !== '' 
    ? parseFloat(medValue.unitsDelivered) 
    : null;
  const tookMedicationToday = medValue.tookMedicationToday || false;

  // Obtener información de frecuencia
  const getFrequencyDescription = () => {
    const quantity = config.quantityPerDose || 1;
    const unit = config.dosageUnit || 'comprimidos';
    
    switch (config.frequencyType) {
      case 'once_daily':
        return `${quantity} ${unit} una vez al día`;
      case 'twice_daily':
        return `${quantity} ${unit} dos veces al día`;
      case 'three_daily':
        return `${quantity} ${unit} tres veces al día`;
      case 'every_x_hours':
        return `${quantity} ${unit} cada ${config.customHoursInterval || '?'} horas`;
      case 'once_weekly':
        return `${quantity} ${unit} una vez por semana`;
      default:
        return `${quantity} ${unit}`;
    }
  };

  // Calcular adherencia
  const unitsReturned = medValue.unitsReturned !== undefined && medValue.unitsReturned !== '' 
    ? medValue.unitsReturned 
    : '';
  
  const visitDate = getVisitDate ? getVisitDate() : undefined;
  const adherence = calculateMedicationAdherence(
    lastVisitDate,
    medValue.unitsDelivered || '',
    unitsReturned,
    tookMedicationToday,
    config,
    visitDate
  );

  // Detectar problemas
  const detectedProblems = adherence ? detectAdherenceProblems(config, tookMedicationToday, adherence) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Info del medicamento */}
      <Alert severity="info" icon={<MedicationIcon />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {config.medicationName || 'Medicamento'}
          </Typography>
          <Typography variant="body2">
            Dosis prescrita: {getFrequencyDescription()}
          </Typography>
        </Box>
      </Alert>
      
      {/* Campos de entrada */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
        <TextField
          type="date"
          label="Fecha de la última visita"
          value={lastVisitDate}
          onChange={(e) => onChange('lastVisitDate', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          error={showValidation && required && !lastVisitDate}
          helperText={showValidation && required && !lastVisitDate ? 'Campo requerido' : 'Haz clic en el campo para seleccionar la fecha'}
          onClick={handleDateFieldClick}
          sx={dateFieldStyles}
        />

        <TextField
          type="number"
          label={`${config.dosageUnit.charAt(0).toUpperCase() + config.dosageUnit.slice(1)} entregados`}
          value={medValue.unitsDelivered || ''}
          onChange={(e) => onChange('unitsDelivered', e.target.value)}
          onWheel={preventNumberInputScroll}
          inputProps={{ min: 0 }}
          fullWidth
          error={showValidation && required && !medValue.unitsDelivered}
          helperText="Cantidad entregada en la última visita"
        />

        <TextField
          type="number"
          label={`${config.dosageUnit.charAt(0).toUpperCase() + config.dosageUnit.slice(1)} devueltos hoy`}
          value={medValue.unitsReturned || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              onChange('unitsReturned', '');
              return;
            }
            const numValue = parseFloat(val);
            if (!isNaN(numValue) && numValue >= 0) {
              if (unitsDelivered !== null && numValue > unitsDelivered) {
                onChange('unitsReturned', unitsDelivered.toString());
              } else {
                onChange('unitsReturned', val);
              }
            }
          }}
          onWheel={preventNumberInputScroll}
          inputProps={{ 
            min: 0,
            max: unitsDelivered !== null ? unitsDelivered : undefined
          }}
          fullWidth
          helperText={
            unitsDelivered !== null
              ? `Cantidad que devuelve el paciente (máximo: ${unitsDelivered} ${config.dosageUnit})`
              : 'Cantidad que devuelve el paciente'
          }
        />
      </Box>

      {/* Estadísticas de adherencia */}
      {adherence && (
        <>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Estadísticas de Adherencia al Tratamiento
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Días naturales entre fechas:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {adherence.daysElapsed} días
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (sin contar día de entrega ni día de visita)
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Días de consumo esperado:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {adherence.expectedConsumptionDays} días
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (incluye días naturales + día entrega + día visita según protocolo)
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Dosis esperada total:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {adherence.expectedTotalDose.toFixed(2)} {config.dosageUnit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (días de consumo × dosis diaria)
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Consumo real:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {adherence.realConsumption.toFixed(2)} {config.dosageUnit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({adherence.delivered} entregados - {adherence.returned} devueltos)
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Consumo ajustado:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {adherence.adjustedConsumption.toFixed(2)} {config.dosageUnit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {adherence.realConsumption !== adherence.adjustedConsumption
                    ? `(ajustado: se restó la dosis del día por tomar cuando no debía)`
                    : `(igual al consumo real: no hubo ajustes necesarios)`
                  }
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Adherencia:
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight="bold"
                  sx={{
                    color: adherence.adherencePercentage >= 80 
                      ? 'success.main' 
                      : adherence.adherencePercentage >= 50 
                      ? 'warning.main' 
                      : 'error.main'
                  }}
                >
                  {adherence.adherencePercentage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Paper>
          
          {/* Checkbox: ¿Tomó la medicación hoy? - Siempre visible */}
          <Box sx={{ mt: 2 }}>
            <FormControl 
              error={config.shouldTakeOnVisitDay === true && !tookMedicationToday}
              sx={{ display: 'block' }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tookMedicationToday}
                    onChange={(e) => onChange('tookMedicationToday', e.target.checked)}
                  />
                }
                label="¿El paciente tomó la medicación el día de hoy?"
              />
            </FormControl>
          </Box>
                  
          {/* Problemas detectados */}
          {detectedProblems.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Problemas Detectados
              </Typography>
              {detectedProblems.map((problem) => {
                const errorState = medicationErrors[problem.id] || { includeInHistory: false, comment: '' };
                
                return (
                  <Alert 
                    key={problem.id}
                    severity={problem.severity} 
                    sx={{ 
                      mt: 1,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {problem.message}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={errorState.includeInHistory}
                              onChange={(e) => {
                                onMedicationErrorChange(problem.id, {
                                  includeInHistory: e.target.checked,
                                  comment: errorState.comment,
                                });
                              }}
                              size="small"
                            />
                          }
                          label="Incluir en historia clínica"
                          sx={{ m: 0 }}
                        />
                      </Box>
                      {errorState.includeInHistory && (
                        <Box sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Agregar aclaraciones sobre este problema..."
                            value={errorState.comment}
                            onChange={(e) => {
                              onMedicationErrorChange(problem.id, {
                                includeInHistory: true,
                                comment: e.target.value,
                              });
                            }}
                            size="small"
                            sx={{ 
                              width: '100%',
                              '& .MuiInputBase-root': {
                                width: '100%'
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Alert>
                );
              })}
            </Box>
          )}

          {/* Mostrar información sobre la configuración de ambas visitas */}
          {(config.shouldConsumeOnDeliveryDay !== undefined || config.shouldTakeOnVisitDay !== undefined) && (
            <Alert 
              severity="info" 
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" gutterBottom>
                <strong>Configuración del Protocolo:</strong>
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>
                  <Typography variant="body2" component="span">
                    <strong>Visita anterior (día de entrega):</strong> {config.shouldConsumeOnDeliveryDay !== false 
                      ? 'El paciente debería haber tomado la medicación ese día'
                      : 'El paciente NO debería haber tomado la medicación ese día'}
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" component="span">
                    <strong>Esta visita (día de hoy):</strong> {config.shouldTakeOnVisitDay 
                      ? 'El paciente debería tomar la medicación hoy'
                      : 'El paciente NO debería tomar la medicación hoy'}
                  </Typography>
                </li>
              </Box>
              {medValue.tookMedicationToday !== undefined && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Estado de hoy:</strong> {
                      config.shouldTakeOnVisitDay && medValue.tookMedicationToday 
                        ? '✅ Tenía que tomar y tomó'
                        : !config.shouldTakeOnVisitDay && !medValue.tookMedicationToday
                        ? '✅ No tenía que tomar y no tomó'
                        : null
                    }
                  </Typography>
                </Box>
              )}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
};

export default MedicationTrackingField;

