import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { SelectOption } from '../../../types';
import { ADVERSE_EVENT_TYPE_OTHER } from '../../../types';
import { handleDateFieldClick, dateFieldStyles } from './visitFormUtils';
import {
  createEmptyAdverseEventRow,
  normalizeAdverseEventRows,
  rowIsStarted,
  type AdverseEventRow,
} from './adverseEventsListUtils';

export interface AdverseEventsListFieldProps {
  options: SelectOption[];
  value: unknown;
  onChange: (rows: AdverseEventRow[]) => void;
  showValidation: boolean;
  required: boolean;
}

export const AdverseEventsListField: React.FC<AdverseEventsListFieldProps> = ({
  options,
  value,
  onChange,
  showValidation,
  required,
}) => {
  const normalized = normalizeAdverseEventRows(value);
  const rows = normalized.length > 0 ? normalized : [createEmptyAdverseEventRow()];

  const updateRow = (index: number, patch: Partial<AdverseEventRow>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, createEmptyAdverseEventRow()]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onChange([createEmptyAdverseEventRow()]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map((row, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2">
              Evento {index + 1}
              {required && index === 0 ? ' *' : ''}
            </Typography>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => removeRow(index)}
            >
              Quitar
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 220 }} size="small" required>
              <InputLabel>Tipo de evento</InputLabel>
              <Select
                label="Tipo de evento"
                value={row.eventType}
                onChange={(e) =>
                  updateRow(index, {
                    eventType: e.target.value as string,
                    eventTypeOther: e.target.value === ADVERSE_EVENT_TYPE_OTHER ? row.eventTypeOther : '',
                  })
                }
              >
                <MenuItem value="">
                  <em>Seleccionar…</em>
                </MenuItem>
                {options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
                <MenuItem value={ADVERSE_EVENT_TYPE_OTHER}>Otro</MenuItem>
              </Select>
            </FormControl>

            {row.eventType === ADVERSE_EVENT_TYPE_OTHER && (
              <TextField
                size="small"
                label="Especificar evento"
                value={row.eventTypeOther}
                onChange={(e) => updateRow(index, { eventTypeOther: e.target.value })}
                sx={{ minWidth: 220, flex: 1 }}
                required
                error={showValidation && !row.eventTypeOther.trim()}
                helperText={
                  showValidation && !row.eventTypeOther.trim() ? 'Requerido si eligió Otro' : ''
                }
              />
            )}

            <TextField
              type="date"
              label="Fecha de inicio"
              size="small"
              value={row.startDate}
              onChange={(e) => updateRow(index, { startDate: e.target.value })}
              onClick={handleDateFieldClick}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160, ...dateFieldStyles }}
              required
              error={showValidation && rowIsStarted(row) && !row.startDate}
              helperText={showValidation && rowIsStarted(row) && !row.startDate ? 'Requerida' : ''}
            />

            <TextField
              type="date"
              label="Fecha de fin (opcional)"
              size="small"
              value={row.endDate}
              onChange={(e) => updateRow(index, { endDate: e.target.value })}
              onClick={handleDateFieldClick}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180, ...dateFieldStyles }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 200 }} size="small" required>
              <InputLabel>Serio / No serio</InputLabel>
              <Select
                label="Serio / No serio"
                value={row.seriousness}
                onChange={(e) =>
                  updateRow(index, {
                    seriousness: e.target.value as string,
                    seriousnessOther:
                      e.target.value === 'other' ? row.seriousnessOther : '',
                  })
                }
              >
                <MenuItem value="">
                  <em>Seleccionar…</em>
                </MenuItem>
                <MenuItem value="serious">Serio</MenuItem>
                <MenuItem value="not_serious">No serio</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>

            {row.seriousness === 'other' && (
              <TextField
                size="small"
                label="Especificar seriedad"
                value={row.seriousnessOther}
                onChange={(e) => updateRow(index, { seriousnessOther: e.target.value })}
                sx={{ minWidth: 220, flex: 1 }}
                required
                error={showValidation && !row.seriousnessOther.trim()}
                helperText={
                  showValidation && !row.seriousnessOther.trim() ? 'Requerido si eligió Otro' : ''
                }
              />
            )}

            <FormControl sx={{ minWidth: 200 }} size="small" required>
              <InputLabel>Intensidad</InputLabel>
              <Select
                label="Intensidad"
                value={row.intensity}
                onChange={(e) => updateRow(index, { intensity: e.target.value as string })}
              >
                <MenuItem value="">
                  <em>Seleccionar…</em>
                </MenuItem>
                <MenuItem value="mild">Leve</MenuItem>
                <MenuItem value="moderate">Moderada</MenuItem>
                <MenuItem value="severe">Severa</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Relacionado con
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={row.relatedToBaselineDisease}
                  onChange={(e) => updateRow(index, { relatedToBaselineDisease: e.target.checked })}
                />
              }
              label="Enfermedad de base"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={row.relatedToStudyMedication}
                  onChange={(e) => updateRow(index, { relatedToStudyMedication: e.target.checked })}
                />
              }
              label="Medicación de estudio"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={row.relatedToStudyProcedure}
                  onChange={(e) => updateRow(index, { relatedToStudyProcedure: e.target.checked })}
                />
              }
              label="Procedimiento de estudio"
            />
          </Box>
        </Paper>
      ))}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow} size="small" sx={{ alignSelf: 'flex-start' }}>
        Agregar evento
      </Button>
    </Box>
  );
};

export default AdverseEventsListField;
