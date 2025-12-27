import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import protocolService from "../../services/protocolService";
import type { Protocol, Visit } from "../../types";
import { PatientVisitForm } from "../../components/protocols/PatientVisitForm";

const steps = [
  "Seleccionar Protocolo y Visita",
  "Completar Formulario",
  "Revisar y Descargar",
];

export const PatientVisitFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>("");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    null
  );
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visitData, setVisitData] = useState<any>(null);
  const [generatingHistory, setGeneratingHistory] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);

  useEffect(() => {
    // Check if we have imported data from location state
    const imported = (location.state as any)?.importedData;
    if (imported) {
      setImportedData(imported);
    }
    loadProtocols(imported);
  }, [location.state]);

  useEffect(() => {
    if (selectedProtocolId) {
      loadProtocol(selectedProtocolId);
    }
  }, [selectedProtocolId]);

  useEffect(() => {
    if (selectedProtocol && selectedVisitId) {
      const visit = selectedProtocol.visits.find(
        (v) => v.id === selectedVisitId
      );
      setSelectedVisit(visit || null);
    }
  }, [selectedProtocol, selectedVisitId]);

  const loadProtocols = async (importedDataToProcess?: any) => {
    try {
      setLoading(true);
      const response = await protocolService.getProtocols(1, 100, "active");
      setProtocols(response.data);
      
      // If we have imported data, try to find matching protocol and visit
      const dataToProcess = importedDataToProcess || importedData;
      if (dataToProcess) {
        const protocolName = dataToProcess.protocolName;
        const visitName = dataToProcess.visitName;
        
        if (protocolName && visitName) {
          // Find protocol by name
          const matchingProtocol = response.data.find(
            (p: Protocol) => p.name === protocolName
          );
          
          if (matchingProtocol) {
            setSelectedProtocolId(matchingProtocol.id);
            // Load the protocol to get visits
            const protocolResponse = await protocolService.getProtocolById(matchingProtocol.id);
            const protocol = protocolResponse.data;
            setSelectedProtocol(protocol);
            
            // Find visit by name
            const matchingVisit = protocol.visits.find(
              (v: Visit) => v.name === visitName
            );
            
            if (matchingVisit) {
              setSelectedVisitId(matchingVisit.id);
              setSelectedVisit(matchingVisit);
              // Auto-advance to form step
              setActiveStep(1);
            } else {
              setError(`No se encontró la visita "${visitName}" en el protocolo "${protocolName}".`);
            }
          } else {
            setError(`No se encontró el protocolo "${protocolName}".`);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar protocolos:", err);
      setError("Error al cargar los protocolos. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const loadProtocol = async (protocolId: string) => {
    try {
      setLoading(true);
      const response = await protocolService.getProtocolById(protocolId);
      setSelectedProtocol(response.data);
    } catch (err) {
      console.error("Error al cargar protocolo:", err);
      setError("Error al cargar el protocolo. Por favor intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedProtocolId || !selectedVisitId) {
        setError("Por favor selecciona un protocolo y una visita");
        return;
      }
      setError("");
    }
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
    if (activeStep === 1) {
      setVisitData(null);
    }
  };

  const handleFormComplete = (data: any) => {
    setVisitData(data);
    setActiveStep(2);
  };

  const handleDownload = () => {
    if (!visitData) return;

    const dataStr = JSON.stringify(visitData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    
    // Extract visitName
    const visitName = visitData.visitName || selectedVisit?.name || "visita";
    
    // Find "Nombre y Apellido" field from activities
    let nombreApellido = "";
    if (visitData.activities) {
      const nombreApellidoActivity = visitData.activities.find(
        (activity: any) => activity.name === "Nombre y Apellido"
      );
      if (nombreApellidoActivity) {
        nombreApellido = nombreApellidoActivity.value || "";
      }
    }
    
    // Find "Fecha de la Visita" field from activities
    let fechaVisita = "";
    if (visitData.activities && selectedVisit) {
      // First try to find by isVisitDate flag
      const visitDateActivityId = selectedVisit.activities.find(
        (activity: any) => activity.isVisitDate === true
      )?.id;
      
      if (visitDateActivityId) {
        const visitDateActivity = visitData.activities.find(
          (activity: any) => activity.id === visitDateActivityId
        );
        if (visitDateActivity) {
          fechaVisita = visitDateActivity.date || visitDateActivity.value || "";
        }
      } else {
        // Fallback: search by name
        const fechaVisitaActivity = visitData.activities.find(
          (activity: any) => activity.name === "Fecha de la Visita"
        );
        if (fechaVisitaActivity) {
          fechaVisita = fechaVisitaActivity.date || fechaVisitaActivity.value || "";
        }
      }
    }
    
    // Build filename: visitName - Nombre y Apellido - Fecha de la Visita
    const filenameParts = [visitName];
    if (nombreApellido) {
      filenameParts.push(nombreApellido);
    }
    if (fechaVisita) {
      // Format date if needed (remove time if present)
      const dateOnly = fechaVisita.split("T")[0];
      filenameParts.push(dateOnly);
    }
    
    // Sanitize filename (remove invalid characters for filenames)
    const sanitizedFilename = filenameParts
      .join("-")
      .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename characters
      .trim();
    
    link.download = `${sanitizedFilename || "visita"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateClinicalHistory = async () => {
    if (!visitData || !selectedProtocolId || !selectedVisitId) return;

    try {
      setGeneratingHistory(true);
      setError("");

      const blob = await protocolService.generateClinicalHistory(
        selectedProtocolId,
        selectedVisitId,
        visitData
      );

      // Descargar el PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `historia-clinica-${
        selectedProtocol?.code || "protocolo"
      }-${selectedVisit?.name.replace(/\s+/g, "-") || "visita"}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error al generar historia clínica:", err);
      setError(
        err.response?.data?.error ||
          "Error al generar la historia clínica. Por favor intenta nuevamente."
      );
    } finally {
      setGeneratingHistory(false);
    }
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case "presencial":
        return "Presencial";
      case "telefonica":
        return "Telefónica";
      case "no_programada":
        return "No Programada";
      default:
        return type;
    }
  };

  if (loading && protocols.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          onClick={() => navigate("/doctor/dashboard")}
          startIcon={<BackIcon />}
        >
          Volver
        </Button>
        <Typography variant="h4" fontWeight="bold">
          Cargar Visita de Paciente
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Selecciona el Protocolo y la Visita
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>Protocolo</InputLabel>
              <Select
                value={selectedProtocolId}
                onChange={(e) => {
                  setSelectedProtocolId(e.target.value);
                  setSelectedVisitId("");
                  setSelectedVisit(null);
                }}
                label="Protocolo"
              >
                {protocols.map((protocol) => (
                  <MenuItem key={protocol.id} value={protocol.id}>
                    {protocol.name} ({protocol.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedProtocol && selectedProtocol.visits.length > 0 && (
              <FormControl fullWidth required>
                <InputLabel>Visita</InputLabel>
                <Select
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  label="Visita"
                >
                  {selectedProtocol.visits
                    .sort((a, b) => a.order - b.order)
                    .map((visit) => (
                      <MenuItem key={visit.id} value={visit.id}>
                        {visit.order}. {visit.name} (
                        {getVisitTypeLabel(visit.type)}) -{" "}
                        {visit.activities.length} campos
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            {selectedProtocol && selectedProtocol.visits.length === 0 && (
              <Alert severity="warning">
                Este protocolo no tiene visitas configuradas.
              </Alert>
            )}

            {selectedVisit && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  Visita seleccionada: {selectedVisit.name}
                </Typography>
                <Typography variant="body2">
                  Tipo: {getVisitTypeLabel(selectedVisit.type)}
                </Typography>
                <Typography variant="body2">
                  Campos a completar: {selectedVisit.activities.length}
                </Typography>
              </Alert>
            )}
          </Box>

          <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 4 }}>
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={
                !selectedProtocolId || !selectedVisitId
              }
            >
              Siguiente
            </Button>
          </Box>
        </Paper>
      )}

      {activeStep === 1 && selectedVisit && selectedProtocol && (
        <PatientVisitForm
          visit={selectedVisit}
          protocolName={selectedProtocol.name}
          patientId=""
          onComplete={handleFormComplete}
          onCancel={handleBack}
          initialData={importedData}
        />
      )}

      {activeStep === 2 && visitData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Revisar y Descargar
          </Typography>

          <Alert severity="success" sx={{ mb: 3 }}>
            El formulario se completó correctamente. Puedes revisar el JSON
            generado y descargarlo.
            <strong> No se guardó nada en la base de datos.</strong>
          </Alert>

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.300",
              maxHeight: "60vh",
              overflow: "auto",
              mb: 3,
            }}
          >
            <pre
              style={{
                margin: 0,
                fontSize: "0.875rem",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(visitData, null, 2)}
            </pre>
          </Box>

          <Box display="flex" justifyContent="space-between" gap={2}>
            <Button
              onClick={handleBack}
              variant="outlined"
              startIcon={<BackIcon />}
            >
              Volver
            </Button>
            <Box display="flex" gap={2}>
              <Button
                onClick={handleDownload}
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Descargar JSON
              </Button>
              <Button
                onClick={handleGenerateClinicalHistory}
                variant="contained"
                startIcon={
                  generatingHistory ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DescriptionIcon />
                  )
                }
                color="primary"
                disabled={generatingHistory}
              >
                {generatingHistory
                  ? "Generando..."
                  : "Generar Historia Clínica"}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};
